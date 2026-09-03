import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CodeEditor } from './components/CodeEditor';
import { OutputPanel } from './components/OutputPanel';
import { ProjectFile, OutputMessage, ErrorInfo, ViewMode } from './types';
import { 
  loadFilesFromStorage, 
  saveFilesToStorage, 
  loadActiveFileId, 
  saveActiveFileId,
  downloadFile 
} from './services/storage';
import { executePythonCode, resetTurtleEnvironment, stopPythonExecution } from './services/pythonRunner';
import { 
  FileCode, 
  FileText, 
  X, 
  Plus, 
  Terminal, 
  Compass, 
  Play, 
  RotateCcw,
  Sparkles,
  Layers,
  Square
} from 'lucide-react';

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(() => loadFilesFromStorage());
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    const savedId = loadActiveFileId();
    const all = loadFilesFromStorage();
    if (savedId && all.some(f => f.id === savedId)) return savedId;
    return all[0]?.id || '';
  });

  const [openTabIds, setOpenTabIds] = useState<string[]>(() => {
    const all = loadFilesFromStorage();
    return all.map(f => f.id).slice(0, 4);
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [outputs, setOutputs] = useState<OutputMessage[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [hasTurtle, setHasTurtle] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Split-screen drag resizing
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage left
  const isDraggingRef = useRef<boolean>(false);

  // Interactive input handling for Python's input()
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const inputResolverRef = useRef<((val: string) => void) | null>(null);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const turtleTargetId = 'skulpt-turtle-container';

  // Debounced auto-save to localStorage
  const saveTimerRef = useRef<any>(null);
  useEffect(() => {
    setIsSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveFilesToStorage(files);
      if (activeFileId) saveActiveFileId(activeFileId);
      setIsSaved(true);
    }, 600);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [files, activeFileId]);

  // Handle active file code edit
  const handleCodeChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? { ...f, content: newContent, updatedAt: Date.now() }
          : f
      )
    );
    // If error was on a line that was changed, keep errorInfo or clear if resolved
  };

  // Create new file
  const handleCreateFile = (name: string, extension: 'py' | 'txt', templateContent?: string) => {
    const newFile: ProjectFile = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name,
      extension,
      content: templateContent !== undefined 
        ? templateContent 
        : (extension === 'py' ? '# ' + name + '.py\nprint("Hello, World!")\n' : ''),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setOpenTabIds((prev) => [...prev.filter((id) => id !== newFile.id), newFile.id]);
  };

  // Delete file
  const handleDeleteFile = (id: string) => {
    if (files.length <= 1) return;
    const remaining = files.filter((f) => f.id !== id);
    setFiles(remaining);
    setOpenTabIds((prev) => prev.filter((tabId) => tabId !== id));
    if (activeFileId === id) {
      setActiveFileId(remaining[0].id);
    }
  };

  // Rename file
  const handleRenameFile = (id: string, newName: string, newExtension?: 'py' | 'txt') => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              name: newName,
              extension: newExtension || f.extension,
              updatedAt: Date.now(),
            }
          : f
      )
    );
  };

  // Duplicate file
  const handleDuplicateFile = (file: ProjectFile) => {
    const dup: ProjectFile = {
      ...file,
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      name: file.name + '_copy',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFiles((prev) => [...prev, dup]);
    setActiveFileId(dup.id);
    setOpenTabIds((prev) => [...prev, dup.id]);
  };

  // Select active file
  const handleSelectFile = (id: string) => {
    setActiveFileId(id);
    if (!openTabIds.includes(id)) {
      setOpenTabIds((prev) => [...prev, id]);
    }
    setErrorInfo(undefined);
  };

  // Close tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabIds.filter((tId) => tId !== id);
    setOpenTabIds(newTabs);
    if (activeFileId === id && newTabs.length > 0) {
      setActiveFileId(newTabs[newTabs.length - 1]);
    }
  };

  // Interactive input callback from pythonRunner
  const handleRequestInput = useCallback((promptText: string): Promise<string> => {
    setInputPrompt(promptText);
    return new Promise((resolve) => {
      inputResolverRef.current = resolve;
    });
  }, []);

  const handleSubmitInput = (value: string) => {
    if (inputResolverRef.current) {
      inputResolverRef.current(value);
      inputResolverRef.current = null;
      setInputPrompt(null);
    }
  };

  // Run Code
  const handleRunCode = async () => {
    if (isRunning || !activeFile) return;

    setIsRunning(true);
    setErrorInfo(undefined);
    setExecutionTime(undefined);

    // Initial system announcement
    setOutputs([
      {
        id: Math.random().toString(36).substring(2, 9),
        type: 'system',
        text: `>>> Running ${activeFile.name}.${activeFile.extension}...\n`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    const usesTurtle = /import\s+turtle|from\s+turtle\s+import/i.test(activeFile.content);
    if (usesTurtle) {
      setHasTurtle(true);
      // Switch view mode if currently only on console
      if (viewMode === 'console') {
        setViewMode('both');
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    try {
      const result = await executePythonCode({
        code: activeFile.content,
        onOutput: (msg) => {
          setOutputs((prev) => [...prev, msg]);
        },
        onRequestInput: handleRequestInput,
        onTurtleActive: () => {
          setHasTurtle(true);
        },
        turtleTargetId,
      });

      setExecutionTime(result.executionTimeMs);

      if (!result.success) {
        if (result.stopped) {
          setErrorInfo(undefined);
        } else if (result.error) {
          setErrorInfo(result.error);
        }
      } else {
        setOutputs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            type: 'system',
            text: `\n[Process completed successfully in ${result.executionTimeMs}ms]`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error('Execution error:', err);
    } finally {
      setIsRunning(false);
      setInputPrompt(null);
    }
  };

  // Stop running Python script immediately
  const handleStopCode = () => {
    stopPythonExecution();
    setIsRunning(false);
    setInputPrompt(null);
    showToast('Execution stopped');
  };

  // One-click quick fix for errors
  const handleApplyFix = (newCode: string) => {
    handleCodeChange(newCode);
    setErrorInfo(undefined);
    // Optionally auto re-run after fix
    setOutputs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        type: 'system',
        text: '\n[Applied suggested fix. Ready to run!]\n',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  // Reset turtle canvas
  const handleResetTurtle = () => {
    resetTurtleEnvironment(turtleTargetId);
    setHasTurtle(false);
    showToast('Turtle canvas reset cleanly');
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFilesToStorage(files);
        setIsSaved(true);
      }
      if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && isRunning)) {
        if (isRunning) {
          e.preventDefault();
          handleStopCode();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, files, isRunning]);

  // Split-screen drag divider handlers
  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const sidebarWidth = sidebarOpen ? 256 : 48;
      const availableWidth = window.innerWidth - sidebarWidth;
      const mouseX = e.clientX - sidebarWidth;
      const ratio = Math.max(20, Math.min(80, (mouseX / availableWidth) * 100));
      setSplitRatio(ratio);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarOpen]);

  // Load an intentional error script to demonstrate error suggestions
  const handleLoadErrorDemo = () => {
    const demoContent = `# Error Suggestion Demo
# This script contains common Python errors so you can test
# the diagnostic suggestions and 1-click Quick Fixes!

print("Testing error detection...")

# 1. Missing colon on 'for' statement:
for i in range(5)
    print(f"Number: {i}")

# 2. Or try misspelling print:
# pirnt("Hello typo")

# 3. Or using single '=' in an if check:
# if count = 10:
#     print("equal")
`;
    handleCreateFile('error_demo', 'py', demoContent);
  };

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none">
      {/* Sidebar for multi-file management and localStorage */}
      <Sidebar
        files={files}
        activeFileId={activeFileId}
        onSelectFile={handleSelectFile}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onRenameFile={handleRenameFile}
        onDuplicateFile={handleDuplicateFile}
        onDownloadFile={downloadFile}
        onImportFile={(file) => {
          setFiles((prev) => [...prev, file]);
          setActiveFileId(file.id);
          setOpenTabIds((prev) => [...prev, file.id]);
        }}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        isSaved={isSaved}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top App Bar & Open File Tabs */}
        <header className="h-10 bg-[#252526] border-b border-[#333333] flex items-center justify-between px-2 shrink-0">
          {/* File Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 pr-2">
            {openTabIds.map((tabId) => {
              const file = files.find((f) => f.id === tabId);
              if (!file) return null;
              const isActive = file.id === activeFileId;

              return (
                <div
                  key={file.id}
                  onClick={() => handleSelectFile(file.id)}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-sm text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#1e1e1e] border-[#007acc] text-white font-medium shadow-xs'
                      : 'bg-[#2d2d2d] border-transparent text-[#969696] hover:bg-[#323233] hover:text-[#cccccc]'
                  }`}
                >
                  {file.extension === 'py' ? (
                    <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#3776ab]' : 'text-[#e3b341]'}`} />
                  ) : (
                    <FileText className={`w-3.5 h-3.5 ${isActive ? 'text-[#3776ab]' : 'text-[#858585]'}`} />
                  )}
                  <span className="truncate max-w-[120px]">
                    {file.name}.{file.extension}
                  </span>
                  {openTabIds.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(file.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-[#f48771] hover:bg-[#3e3e42] rounded p-0.5 ml-1 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => handleCreateFile('script', 'py')}
              className="p-1 rounded text-[#969696] hover:text-[#cccccc] hover:bg-[#333333] transition-colors"
              title="New File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Actions in Header (Unified h-7 height) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLoadErrorDemo}
              className="hidden sm:flex items-center gap-1.5 px-2.5 h-7 rounded bg-[#2d2d2d] hover:bg-[#37373d] text-[#e3b341] border border-[#3e3e42] text-[11px] font-medium transition-colors"
              title="Load script with intentional error to test suggestions & quick-fix"
            >
              <Sparkles className="w-3 h-3 text-[#e3b341]" />
              <span>Test Error Suggestions</span>
            </button>

            <button
              id="header-run-btn"
              onClick={handleRunCode}
              disabled={isRunning}
              className={`px-3 h-7 rounded font-medium text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                isRunning
                  ? 'bg-[#d29922] text-white opacity-80 cursor-wait'
                  : 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
              }`}
            >
              {isRunning ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>

            {isRunning && (
              <button
                id="header-stop-btn"
                onClick={handleStopCode}
                className="px-3 h-7 rounded bg-[#da3633] hover:bg-[#b62324] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 animate-pulse"
                title="Stop execution (Ctrl+C / Esc)"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content: Left Code Editor, Draggable Divider, Right Output Panel */}
        <div className="flex-1 flex flex-col md:flex-row min-w-0 h-full overflow-hidden">
          {/* Left Side: Code Editor with Tab Lines & Autocomplete */}
          <div 
            className="h-1/2 md:h-full flex flex-col overflow-hidden" 
            style={{ width: `${splitRatio}%` }}
          >
            {activeFile ? (
              <CodeEditor
                file={activeFile}
                onChange={handleCodeChange}
                onRun={handleRunCode}
                onStop={handleStopCode}
                isRunning={isRunning}
                errorInfo={errorInfo}
                onNotify={showToast}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#858585] text-xs">
                No active file selected
              </div>
            )}
          </div>

          {/* Draggable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className="hidden md:flex w-1 bg-[#252526] hover:bg-[#007acc] cursor-col-resize transition-colors items-center justify-center group shrink-0"
            title="Drag to resize panels"
          >
            <div className="w-0.5 h-8 bg-[#3e3e42] group-hover:bg-white rounded-full" />
          </div>

          {/* Right Side: Output Panel (Console + Turtle Graphics + Error Suggestions) */}
          <div 
            className="h-1/2 md:h-full flex flex-col overflow-hidden" 
            style={{ width: `${100 - splitRatio}%` }}
          >
            <OutputPanel
              outputs={outputs}
              errorInfo={errorInfo}
              onClearOutput={() => {
                setOutputs([]);
                setErrorInfo(undefined);
              }}
              onApplyFix={handleApplyFix}
              isRunning={isRunning}
              onStop={handleStopCode}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              hasTurtle={hasTurtle}
              turtleTargetId={turtleTargetId}
              executionTime={executionTime}
              inputPrompt={inputPrompt}
              onSubmitInput={handleSubmitInput}
              onResetTurtle={handleResetTurtle}
            />
          </div>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-[#252526] text-[#cccccc] border border-[#007acc] px-3.5 py-2 rounded-xs shadow-2xl z-50 flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#4ec9b0]" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-[#858585] hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
