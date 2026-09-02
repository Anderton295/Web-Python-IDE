import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  FileCode, 
  FileText,
  Download,
  ChevronDown,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { ProjectFile, ErrorInfo } from '../types';
import { registerPythonAutocomplete } from '../services/autocomplete';
import { saveFileAsTxt, saveFileAsPy, exportFileToDocx, exportToGoogleDocs } from '../services/storage';

interface CodeEditorProps {
  file: ProjectFile;
  onChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  errorInfo?: ErrorInfo;
  onJumpToLine?: (line: number) => void;
  onNotify?: (message: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  onRun,
  isRunning,
  errorInfo,
  onNotify,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [fontSize, setFontSize] = useState<number>(14);
  const [copied, setCopied] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSaveDropdown(false);
      }
    };
    if (showSaveDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSaveDropdown]);

  const handleSaveTxt = () => {
    saveFileAsTxt(file);
    onNotify?.(`Saved "${file.name}.txt" (Default)`);
    setShowSaveDropdown(false);
  };

  const handleExportDocx = async () => {
    try {
      await exportFileToDocx(file);
      onNotify?.(`Exported "${file.name}.docx" (Word & Docs compatible)`);
    } catch (err) {
      console.error(err);
      onNotify?.('Failed to export .docx file');
    }
    setShowSaveDropdown(false);
  };

  const handleExportGoogleDocs = async () => {
    await exportToGoogleDocs(file);
    onNotify?.('Code copied! Opening Google Docs (docs.new)...');
    setShowSaveDropdown(false);
  };

  const handleSavePy = () => {
    saveFileAsPy(file);
    onNotify?.(`Saved "${file.name}.py"`);
    setShowSaveDropdown(false);
  };

  // Configure editor on mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Python autocomplete providers & snippets
    registerPythonAutocomplete(monaco);

    // Keyboard shortcuts
    // Ctrl+Enter or Cmd+Enter -> Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun();
    });

    // Ctrl+S or Cmd+S -> Save as .txt (Default)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveTxt();
    });

    // Indentation and formatting settings
    editor.getModel()?.updateOptions({
      tabSize: 4,
      insertSpaces: true,
    });
  };

  // Update error squigglies & markers whenever errorInfo changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    if (errorInfo && errorInfo.line && errorInfo.line > 0) {
      const line = errorInfo.line;
      monaco.editor.setModelMarkers(model, 'python-error-lint', [
        {
          startLineNumber: line,
          startColumn: errorInfo.column || 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line) || 100,
          message: `${errorInfo.errorType}: ${errorInfo.explanation}`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]);
      // Smoothly reveal and center error line
      editor.revealLineInCenter(line);
    } else {
      monaco.editor.setModelMarkers(model, 'python-error-lint', []);
    }
  }, [errorInfo]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-[#333333]">
      {/* Top Bar / Actions Header */}
      <div className="h-10 bg-[#252526] border-b border-[#333333] px-3 flex items-center justify-between shrink-0">
        {/* File name & extension badge */}
        <div className="flex items-center gap-2">
          {file.extension === 'py' ? (
            <FileCode className="w-3.5 h-3.5 text-[#3776ab]" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#858585]" />
          )}
          <span className="text-xs font-medium text-[#cccccc]">
            {file.name}.{file.extension}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-xs bg-[#2d2d2d] text-[#858585] border border-[#3e3e42]">
            {file.extension === 'py' ? 'Python 3' : 'Plain Text'}
          </span>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2">
          {/* Font sizing */}
          <div className="hidden sm:flex items-center bg-[#2d2d2d] rounded-xs border border-[#3e3e42] p-0.5 text-xs text-[#cccccc]">
            <button
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              className="p-1 hover:text-white rounded-xs"
              title="Decrease font size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-[#858585]">{fontSize}px</span>
            <button
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              className="p-1 hover:text-white rounded-xs"
              title="Increase font size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy code */}
          <button
            onClick={handleCopyCode}
            className="p-1 rounded-xs bg-[#2d2d2d] hover:bg-[#37373d] text-[#cccccc] text-xs flex items-center gap-1 transition-colors border border-[#3e3e42]"
            title="Copy code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Save / Export Action (Default is Save as .txt) */}
          <div ref={dropdownRef} className="relative flex items-center">
            <button
              onClick={handleSaveTxt}
              className="px-2.5 py-1 rounded-l-xs bg-[#2d2d2d] hover:bg-[#37373d] text-[#cccccc] hover:text-white text-xs flex items-center gap-1.5 transition-colors border border-r-0 border-[#3e3e42]"
              title="Save as .txt (Default download format - Ctrl+S)"
            >
              <Download className="w-3.5 h-3.5 text-[#3776ab]" />
              <span className="text-[11px] font-medium">Save .txt</span>
            </button>
            <button
              onClick={() => setShowSaveDropdown(!showSaveDropdown)}
              className="px-1.5 py-1 rounded-r-xs bg-[#2d2d2d] hover:bg-[#37373d] text-[#858585] hover:text-white text-xs flex items-center transition-colors border border-[#3e3e42]"
              title="Export options (Docs, Google Docs, Python)"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Dropdown menu */}
            {showSaveDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-[#252526] border border-[#3e3e42] rounded-xs shadow-xl py-1 z-50 text-xs">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-[#858585] uppercase tracking-wider border-b border-[#333333]">
                  Save & Export Options
                </div>
                <button
                  onClick={handleSaveTxt}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#4ec9b0] shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">Save as .txt</div>
                    <div className="text-[10px] text-[#858585]">Default text download</div>
                  </div>
                  <span className="text-[9px] bg-[#1e1e1e] border border-[#3e3e42] px-1 py-0.5 rounded text-[#858585]">Default</span>
                </button>
                <button
                  onClick={handleExportDocx}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2b579a] shrink-0" />
                  <div>
                    <div className="font-medium">Export to Docs (.docx)</div>
                    <div className="text-[10px] text-[#858585]">Word & Google Docs compatible</div>
                  </div>
                </button>
                <button
                  onClick={handleExportGoogleDocs}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#4285f4] shrink-0" />
                  <div>
                    <div className="font-medium">Export to Google Docs</div>
                    <div className="text-[10px] text-[#858585]">Copies code & opens docs.new</div>
                  </div>
                </button>
                <div className="border-t border-[#333333] my-1" />
                <button
                  onClick={handleSavePy}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-[#3776ab] shrink-0" />
                  <div>
                    <div className="font-medium">Save as .py</div>
                    <div className="text-[10px] text-[#858585]">Python source file</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Run Code Button */}
          <button
            id="run-python-button"
            onClick={onRun}
            disabled={isRunning}
            className={`px-3 py-1 rounded-xs font-medium text-xs flex items-center gap-1.5 transition-all shadow-xs ${
              isRunning
                ? 'bg-[#d29922] text-white cursor-wait'
                : 'bg-[#2ea043] hover:bg-[#2c974b] text-white active:scale-95'
            }`}
            title="Run Python Script (Ctrl + Enter)"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
                <kbd className="hidden lg:inline text-[10px] bg-[#238636] px-1 py-0.2 rounded-xs text-[#ffffff] font-mono">
                  Ctrl+↵
                </kbd>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Code Editor with Indentation Tab Guides */}
      <div className="flex-1 w-full overflow-hidden relative">
        <Editor
          height="100%"
          language={file.extension === 'py' ? 'python' : 'plaintext'}
          theme="vs-dark"
          value={file.content}
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize,
            fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
            fontLigatures: true,
            tabSize: 4,
            insertSpaces: true,
            // Explicit Tab Lines / Indentation Guides
            renderIndentGuides: true,
            guides: {
              indentation: true,
              highlightActiveIndentation: true,
              bracketPairs: true,
            },
            // Autocomplete & Suggestions
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'top',
            wordBasedSuggestions: 'allDocuments',
            // Visual enhancements
            minimap: { enabled: false },
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Editor Status Bar */}
      <div className="h-6 bg-[#252526] border-t border-[#333333] px-3 flex items-center justify-between text-[11px] text-[#858585] font-mono">
        <div className="flex items-center gap-3">
          <span>Python 3.8</span>
          <span className="hidden sm:inline text-[#3e3e42]">|</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="hidden sm:inline text-[#3e3e42]">|</span>
          <span className="hidden sm:inline">Tab Size: 4</span>
          <span className="hidden sm:inline text-[#3e3e42]">|</span>
          <span className="hidden sm:inline text-[#3776ab]">Autocomplete Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{file.content.split('\n').length} lines</span>
          <span className="text-[#3e3e42]">•</span>
          <span>{file.content.length} chars</span>
        </div>
      </div>
    </div>
  );
};
