import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCode, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Edit2, 
  Copy, 
  Check, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  MoreVertical,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';
import { ProjectFile } from '../types';
import { 
  STARTER_FILES, 
  saveFileAsTxt, 
  saveFileAsPy, 
  exportFileToDocx, 
  exportToGoogleDocs 
} from '../services/storage';

interface SidebarProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onCreateFile: (name: string, extension: 'py' | 'txt', templateContent?: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string, newExtension?: 'py' | 'txt') => void;
  onDuplicateFile: (file: ProjectFile) => void;
  onDownloadFile: (file: ProjectFile) => void;
  onImportFile: (file: ProjectFile) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSaved: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onDownloadFile,
  onImportFile,
  isOpen,
  onToggleOpen,
  isSaved,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newExtension, setNewExtension] = useState<'py' | 'txt'>('py');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editExt, setEditExt] = useState<'py' | 'txt'>('py');
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [menuFileId, setMenuFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = () => setMenuFileId(null);
    if (menuFileId) {
      window.addEventListener('click', handleOutside);
    }
    return () => window.removeEventListener('click', handleOutside);
  }, [menuFileId]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = newFileName.trim();
    if (!name) name = 'untitled';

    // Remove extension if user typed it
    if (name.endsWith('.py')) {
      name = name.slice(0, -3);
      onCreateFile(name, 'py');
    } else if (name.endsWith('.txt')) {
      name = name.slice(0, -4);
      onCreateFile(name, 'txt');
    } else {
      onCreateFile(name, newExtension);
    }

    setNewFileName('');
    setIsCreating(false);
  };

  const startRename = (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setEditName(file.name);
    setEditExt(file.extension);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFileId && editName.trim()) {
      let finalName = editName.trim();
      let finalExt = editExt;
      if (finalName.endsWith('.py')) {
        finalName = finalName.slice(0, -3);
        finalExt = 'py';
      } else if (finalName.endsWith('.txt')) {
        finalName = finalName.slice(0, -4);
        finalExt = 'txt';
      }
      onRenameFile(editingFileId, finalName, finalExt);
    }
    setEditingFileId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const originalName = uploaded.name;
      const isPy = originalName.endsWith('.py');
      const isTxt = originalName.endsWith('.txt');
      const baseName = originalName.replace(/\.(py|txt)$/i, '');

      onImportFile({
        id: 'f_' + Math.random().toString(36).substring(2, 9),
        name: baseName || 'imported_file',
        extension: isPy ? 'py' : (isTxt ? 'txt' : 'py'),
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    };
    reader.readAsText(uploaded);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside 
      id="project-sidebar" 
      className={`relative flex flex-col bg-[#252526] border-r border-[#333333] transition-all duration-300 z-20 ${
        isOpen ? 'w-64 min-w-[16rem]' : 'w-12 min-w-[3rem]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 border-b border-[#333333] h-10">
        {isOpen ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-5 h-5 rounded-xs bg-[#3776ab] flex items-center justify-center font-bold text-[11px] text-white shadow-xs">
              Py
            </div>
            <span className="font-semibold text-xs tracking-wider uppercase text-[#cccccc] truncate">
              Explorer
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-5 h-5 rounded-xs bg-[#3776ab] flex items-center justify-center font-bold text-[11px] text-white">
              Py
            </div>
          </div>
        )}

        <button
          id="toggle-sidebar-btn"
          onClick={onToggleOpen}
          className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#333333] transition-colors"
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle sidebar"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Files Area */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-y-auto px-2 py-2.5 space-y-1">
          {/* Action buttons bar */}
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#858585]">
              Files
            </span>
            <div className="flex items-center gap-1">
              <button
                id="open-new-file-btn"
                onClick={() => setIsCreating(true)}
                className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
                title="Create new file (.py or .txt)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                id="upload-file-btn"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
                title="Import .py or .txt from computer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".py,.txt" 
                className="hidden" 
              />
              <button
                id="load-starter-templates-btn"
                onClick={() => setShowExamplesModal(true)}
                className="p-1 rounded text-[#858585] hover:text-[#e3b341] hover:bg-[#333333] transition-colors"
                title="Examples & Turtle Templates"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline file creation form */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="p-2.5 rounded-sm bg-[#1e1e1e] border border-[#007acc] mb-2 space-y-2">
              <div className="text-xs font-medium text-[#007acc]">New File</div>
              <input
                id="new-filename-input"
                type="text"
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename (e.g. spiral)"
                className="w-full px-2 py-1 text-xs bg-[#252526] border border-[#3e3e42] rounded-xs text-[#cccccc] focus:outline-none focus:border-[#007acc]"
              />
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex gap-2 text-[#969696]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fileExt"
                      checked={newExtension === 'py'}
                      onChange={() => setNewExtension('py')}
                      className="accent-[#007acc]"
                    />
                    <span>.py</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="fileExt"
                      checked={newExtension === 'txt'}
                      onChange={() => setNewExtension('txt')}
                      className="accent-[#007acc]"
                    />
                    <span>.txt</span>
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-2 py-0.5 rounded-xs bg-[#333333] hover:bg-[#3e3e42] text-[#cccccc] text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded-xs bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium text-xs transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Files List */}
          <div className="space-y-0.5">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              const isEditing = editingFileId === file.id;

              return (
                <div
                  key={file.id}
                  id={`file-item-${file.id}`}
                  onClick={() => onSelectFile(file.id)}
                  className={`group relative flex items-center justify-between px-2 py-1.5 rounded-xs cursor-pointer transition-colors text-xs ${
                    isActive
                      ? 'bg-[#37373d] text-white font-medium shadow-xs'
                      : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1">
                    {file.extension === 'py' ? (
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#3776ab]' : 'text-[#e3b341]'}`} />
                    ) : (
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#3776ab]' : 'text-[#858585]'}`} />
                    )}

                    {isEditing ? (
                      <form onSubmit={submitRename} className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          id="rename-file-input"
                          type="text"
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => setEditingFileId(null)}
                          className="w-full px-1 py-0.5 text-xs bg-[#1e1e1e] border border-[#007acc] rounded-xs text-[#cccccc] focus:outline-none"
                        />
                      </form>
                    ) : (
                      <span className="truncate">
                        {file.name}.{file.extension}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover or active */}
                  <div className={`items-center gap-1 ${isActive ? 'flex' : 'hidden group-hover:flex'}`}>
                    <button
                      onClick={(e) => startRename(file, e)}
                      title="Rename file"
                      className="p-0.5 hover:text-white text-[#858585] hover:bg-[#444444] rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateFile(file);
                      }}
                      title="Duplicate file"
                      className="p-0.5 hover:text-white text-[#858585] hover:bg-[#444444] rounded"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {/* Save as .txt (Default download) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveFileAsTxt(file);
                      }}
                      title="Save as .txt (Default)"
                      className="p-0.5 hover:text-white text-[#858585] hover:bg-[#444444] rounded"
                    >
                      <Download className="w-3 h-3" />
                    </button>

                    {/* Export / More dropdown */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFileId(menuFileId === file.id ? null : file.id);
                        }}
                        title="Export & More options"
                        className="p-0.5 hover:text-white text-[#858585] hover:bg-[#444444] rounded"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>

                      {menuFileId === file.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-48 bg-[#252526] border border-[#3e3e42] rounded-xs shadow-2xl py-1 z-50 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              saveFileAsTxt(file);
                              setMenuFileId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#4ec9b0]" />
                            <div className="flex-1">
                              <span className="font-medium">Save as .txt</span>
                              <span className="text-[10px] text-[#858585] block">Default option</span>
                            </div>
                          </button>

                          <button
                            onClick={async () => {
                              await exportFileToDocx(file);
                              setMenuFileId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2b579a]" />
                            <div>
                              <span className="font-medium">Export to Docs (.docx)</span>
                              <span className="text-[10px] text-[#858585] block">Word & Google Docs</span>
                            </div>
                          </button>

                          <button
                            onClick={async () => {
                              await exportToGoogleDocs(file);
                              setMenuFileId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#4285f4]" />
                            <div>
                              <span className="font-medium">Export to Google Docs</span>
                              <span className="text-[10px] text-[#858585] block">Opens docs.new</span>
                            </div>
                          </button>

                          <div className="border-t border-[#333333] my-1" />

                          <button
                            onClick={() => {
                              saveFileAsPy(file);
                              setMenuFileId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#094771] hover:text-white text-[#cccccc] flex items-center gap-2"
                          >
                            <FileCode className="w-3.5 h-3.5 text-[#3776ab]" />
                            <span className="font-medium">Save as .py</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete ${file.name}.${file.extension}?`)) {
                            onDeleteFile(file.id);
                          }
                        }}
                        title="Delete file"
                        className="p-0.5 hover:text-[#f48771] text-[#858585] hover:bg-[#444444] rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Storage Indicator */}
      {isOpen && (
        <div className="p-2.5 border-t border-[#333333] bg-[#1e1e1e] text-[11px] text-[#858585] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#3776ab]" />
            <span>Local Storage</span>
          </div>
          <div className="flex items-center gap-1 text-[#4ec9b0] font-medium">
            <Check className="w-3 h-3" />
            <span>{isSaved ? 'Auto-Saved' : 'Saving...'}</span>
          </div>
        </div>
      )}

      {/* Starter Templates Modal */}
      {showExamplesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setShowExamplesModal(false)}>
          <div 
            className="bg-[#252526] border border-[#3e3e42] rounded-md max-w-md w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e3b341]" />
                <h3 className="font-semibold text-[#cccccc] text-sm">Python & Turtle Templates</h3>
              </div>
              <button 
                onClick={() => setShowExamplesModal(false)}
                className="text-[#858585] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#969696]">
              Select a starter template to add to your project workspace:
            </p>

            <div className="space-y-2">
              {STARTER_FILES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onCreateFile(template.name + '_copy', template.extension, template.content);
                    setShowExamplesModal(false);
                  }}
                  className="w-full text-left p-3 rounded-xs border border-[#333333] hover:border-[#007acc] bg-[#1e1e1e] hover:bg-[#2d2d2d] transition-colors flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[#cccccc] flex items-center gap-2">
                      {template.extension === 'py' ? (
                        <FileCode className="w-3.5 h-3.5 text-[#3776ab]" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#858585]" />
                      )}
                      <span>{template.name}.{template.extension}</span>
                    </div>
                    <div className="text-[11px] text-[#858585]">
                      {template.name.includes('turtle') ? 'Turtle Graphics Demo' : 'General Python Script'}
                    </div>
                  </div>
                  <span className="text-xs text-[#007acc] font-medium">Add +</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowExamplesModal(false)}
                className="px-3 py-1.5 rounded-xs bg-[#333333] hover:bg-[#3e3e42] text-xs text-[#cccccc] font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
