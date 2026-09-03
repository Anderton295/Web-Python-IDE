import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Compass, 
  Layers, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  Wrench, 
  RotateCcw, 
  Send,
  Grid,
  Info,
  Minus,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Maximize,
  ZoomIn,
  ZoomOut,
  Square
} from 'lucide-react';
import { OutputMessage, ErrorInfo, ViewMode } from '../types';

interface OutputPanelProps {
  outputs: OutputMessage[];
  errorInfo?: ErrorInfo;
  onClearOutput: () => void;
  onApplyFix?: (newCode: string) => void;
  isRunning: boolean;
  onStop?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hasTurtle: boolean;
  turtleTargetId: string;
  executionTime?: number;
  inputPrompt?: string | null;
  onSubmitInput?: (value: string) => void;
  onResetTurtle?: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  outputs,
  errorInfo,
  onClearOutput,
  onApplyFix,
  isRunning,
  onStop,
  viewMode,
  onViewModeChange,
  hasTurtle,
  turtleTargetId,
  executionTime,
  inputPrompt,
  onSubmitInput,
  onResetTurtle,
}) => {
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const [zoomMode, setZoomMode] = useState<'fit' | '100'>('fit');
  const [splitRatioY, setSplitRatioY] = useState(50);
  const [isDraggingY, setIsDraggingY] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const turtleViewportRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 600, height: 500 });

  // Update viewport dimensions for dynamic auto-fit scaling
  useEffect(() => {
    if (!turtleViewportRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setViewportDims({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(turtleViewportRef.current);
    return () => observer.disconnect();
  }, [viewMode, splitRatioY]);

  // Calculate responsive zoom scale to fit standard 600x500 canvas inside available area
  const effectiveZoom = zoomMode === '100'
    ? 1.0
    : Math.min(1.25, Math.max(0.2, Math.min(
        Math.max(100, (viewportDims.width - 24)) / 600,
        Math.max(100, (viewportDims.height - 24)) / 500
      )));

  // Auto-scroll terminal to bottom when new output arrives
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [outputs, inputPrompt]);

  // Focus input when inputPrompt appears
  useEffect(() => {
    if (inputPrompt) {
      inputRef.current?.focus();
    }
  }, [inputPrompt]);

  // Vertical dragging resize between Output and Turtle
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingY || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = (relativeY / rect.height) * 100;
      if (percentage >= 20 && percentage <= 80) {
        setSplitRatioY(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingY(false);
    };

    if (isDraggingY) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingY]);

  const handleCopyOutput = () => {
    const text = outputs.map((o) => o.text).join('');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitInput) {
      onSubmitInput(inputValue);
      setInputValue('');
    }
  };

  const handleDownloadTurtleCanvas = () => {
    const container = document.getElementById(turtleTargetId);
    if (!container) return;
    const canvases = container.querySelectorAll('canvas');
    if (canvases.length === 0) return;

    const width = canvases[0].width || 600;
    const height = canvases[0].height || 500;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = width;
    mergedCanvas.height = height;
    const ctx = mergedCanvas.getContext('2d');
    if (!ctx) return;

    // Fill dark background for exported PNG
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Composite all active turtle canvas layers (background, drawing path, and turtle sprite)
    canvases.forEach((c) => {
      if (c.style.display !== 'none') {
        try {
          ctx.drawImage(c, 0, 0);
        } catch (_) {}
      }
    });

    const link = document.createElement('a');
    link.download = `turtle_drawing_${Date.now()}.png`;
    link.href = mergedCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc]">
      {/* Top Header Bar */}
      <div className="h-10 bg-[#252526] border-b border-[#333333] px-3 flex items-center justify-between shrink-0">
        {/* View Mode Switcher (Unified h-7 height) */}
        <div className="flex items-center bg-[#1e1e1e] rounded-xs p-0.5 border border-[#333333]">
          <button
            onClick={() => onViewModeChange('both')}
            className={`h-7 px-2.5 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'both'
                ? 'bg-[#0e639c] text-white shadow-xs'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
            title="Stacked View: Output & Turtle stacked"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stacked</span>
          </button>
          <button
            onClick={() => onViewModeChange('console')}
            className={`h-7 px-2.5 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'console'
                ? 'bg-[#0e639c] text-white shadow-xs'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
            title="Output Only (Turtle Minimized)"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Output Only</span>
          </button>
          <button
            onClick={() => onViewModeChange('turtle')}
            className={`h-7 px-2.5 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'turtle'
                ? 'bg-[#0e639c] text-white shadow-xs'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]'
            }`}
            title="Turtle Only (Output Minimized)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Turtle Only</span>
            {hasTurtle && <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />}
          </button>
        </div>

        {/* Execution & Action buttons (Unified h-7 height) */}
        <div className="flex items-center gap-2">
          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="h-7 px-2.5 rounded-xs bg-[#da3633] hover:bg-[#b62324] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs animate-pulse"
              title="Stop Python script execution immediately"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {executionTime !== undefined && (
            <span className="h-7 text-[11px] font-mono text-[#4ec9b0] bg-[#1e2e25] border border-[#234b35] px-2 flex items-center rounded-xs">
              {executionTime}ms
            </span>
          )}

          <button
            onClick={handleCopyOutput}
            className="h-7 px-2.5 rounded-xs bg-[#2d2d2d] hover:bg-[#383838] text-[#858585] hover:text-[#cccccc] text-xs flex items-center gap-1.5 transition-colors border border-[#3e3e42]"
            title="Copy console output"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#4ec9b0]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={onClearOutput}
            className="h-7 px-2.5 rounded-xs bg-[#2d2d2d] hover:bg-[#3e3e42] text-[#858585] hover:text-[#f48771] text-xs flex items-center gap-1.5 transition-colors border border-[#3e3e42]"
            title="Clear output console"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Prominent Error Diagnostic & Fix Suggestions Banner */}
      {errorInfo && (
        <div 
          id="error-diagnostic-panel"
          className="m-3 p-3.5 rounded-sm bg-[#2d1515] border border-[#d16969] shadow-md text-xs space-y-2.5 shrink-0"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xs bg-[#441f1f] text-[#f48771]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[#f48771] text-sm">{errorInfo.errorType}</span>
                {errorInfo.line && (
                  <span className="ml-2 font-mono text-xs px-1.5 py-0.5 rounded-xs bg-[#3f1f1f] text-[#f48771] border border-[#5a2c2c]">
                    Line {errorInfo.line}
                  </span>
                )}
              </div>
            </div>
            {errorInfo.autoFix && onApplyFix && (
              <button
                id="apply-quick-fix-btn"
                onClick={() => onApplyFix(errorInfo.autoFix!.newCode)}
                className="px-2.5 py-1 rounded-xs bg-[#2ea043] hover:bg-[#2c974b] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                title={errorInfo.autoFix.description}
              >
                <Wrench className="w-3 h-3" />
                <span>Quick Fix</span>
              </button>
            )}
          </div>

          {/* Offending code snippet */}
          {errorInfo.codeLine && (
            <div className="bg-[#1e1e1e] p-2 rounded-xs font-mono text-xs border border-[#3e3e42] flex items-center gap-2">
              <span className="text-[#858585] select-none">{errorInfo.line}:</span>
              <span className="text-[#f48771] font-semibold">{errorInfo.codeLine}</span>
            </div>
          )}

          {/* Plain-English Explanation */}
          <p className="text-[#e6edf3] leading-relaxed font-normal">
            {errorInfo.explanation}
          </p>

          {/* Actionable suggestions */}
          {errorInfo.suggestions.length > 0 && (
            <div className="space-y-1 bg-[#1e1e1e] p-2.5 rounded-xs border border-[#3e3e42]">
              <div className="font-semibold text-[#e3b341] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Suggestions to fix this:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#cccccc] pl-1 text-[11px]">
                {errorInfo.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="leading-snug">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area: Vertically Stacked with independent minimization */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden relative select-none">
        
        {/* ================= TOP PANE: OUTPUT TERMINAL ================= */}
        {viewMode === 'turtle' ? (
          /* Minimized Terminal Strip */
          <div 
            onClick={() => onViewModeChange('both')}
            className="h-7 bg-[#252526] hover:bg-[#2d2d2d] px-3 border-b border-[#333333] flex items-center justify-between text-[11px] font-mono text-[#858585] cursor-pointer transition-colors shrink-0"
            title="Click to expand Output Terminal"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#3776ab]" />
              <span className="font-medium text-[#cccccc]">Output Terminal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-[#1e1e1e] text-[#858585] border border-[#3e3e42]">
                Minimized
              </span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-[#858585] hover:text-[#cccccc]">
              <span className="text-[10px] hidden sm:inline">Click to expand</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          /* Expanded Terminal View */
          <div 
            className={`flex flex-col bg-[#1e1e1e] overflow-hidden ${
              viewMode === 'console' ? 'flex-1' : ''
            }`}
            style={viewMode === 'both' ? { height: `${splitRatioY}%` } : undefined}
          >
            {/* Terminal Header */}
            <div className="h-7 bg-[#252526] px-3 border-b border-[#333333] flex items-center justify-between text-[11px] font-mono text-[#858585] shrink-0">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#3776ab]" />
                <span className="font-medium text-[#cccccc]">Terminal (stdout / stderr)</span>
                <span className="text-[10px] text-[#858585] hidden sm:inline">Python 3.8</span>
              </span>

              {/* Minimize & Maximize Actions */}
              <div className="flex items-center gap-1">
                {viewMode === 'both' ? (
                  <>
                    <button
                      onClick={() => onViewModeChange('turtle')}
                      className="p-1 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] transition-colors"
                      title="Minimize Output (show only Turtle)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onViewModeChange('console')}
                      className="p-1 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] transition-colors"
                      title="Maximize Output (show only Output)"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onViewModeChange('both')}
                    className="p-1 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] transition-colors flex items-center gap-1 text-[10px]"
                    title="Restore stacked view"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="hidden sm:inline">Stack Both</span>
                  </button>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 select-text bg-[#1e1e1e]">
              {outputs.length === 0 && !isRunning && !inputPrompt && (
                <div className="text-[#858585] italic py-4">
                  Output will appear here when you run code...
                </div>
              )}

              {outputs.map((out) => {
                let colorClass = 'text-[#cccccc]';
                if (out.type === 'stderr') colorClass = 'text-[#f48771] font-medium';
                if (out.type === 'system') colorClass = 'text-[#3776ab]';
                if (out.type === 'input-prompt') colorClass = 'text-[#e3b341] font-semibold';
                if (out.type === 'input-echo') colorClass = 'text-[#4ec9b0]';

                return (
                  <div key={out.id} className={`whitespace-pre-wrap break-words leading-relaxed ${colorClass}`}>
                    {out.text}
                  </div>
                );
              })}

              {/* Waiting for interactive input */}
              {inputPrompt && (
                <form onSubmit={handleInputSubmit} className="pt-2 flex items-center gap-2">
                  <span className="text-[#e3b341] font-bold font-mono text-xs">&gt;</span>
                  <input
                    ref={inputRef}
                    id="python-interactive-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your response and press Enter..."
                    className="flex-1 px-2.5 py-1 text-xs bg-[#252526] border border-[#3e3e42] rounded-xs text-[#cccccc] focus:outline-none focus:border-[#007acc] font-mono"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded-xs text-xs font-medium flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enter</span>
                  </button>
                </form>
              )}

              {isRunning && !inputPrompt && (
                <div className="flex items-center gap-2 text-[#3776ab] text-xs py-1">
                  <div className="w-2 h-2 rounded-full bg-[#007acc] animate-ping" />
                  <span>Executing Python script...</span>
                </div>
              )}

              <div ref={terminalEndRef} />
            </div>
          </div>
        )}

        {/* Horizontal draggable divider between Output and Turtle when both are stacked */}
        {viewMode === 'both' && (
          <div
            onMouseDown={() => setIsDraggingY(true)}
            className="h-1.5 bg-[#252526] hover:bg-[#007acc] cursor-row-resize transition-colors flex items-center justify-center group shrink-0 border-y border-[#333333]"
            title="Drag to resize Output and Turtle panels"
          >
            <div className="h-0.5 w-10 bg-[#3e3e42] group-hover:bg-white rounded-full" />
          </div>
        )}

        {/* ================= BOTTOM PANE: TURTLE GRAPHICS CANVAS ================= */}
        {viewMode === 'console' && (
          /* Minimized Turtle Strip */
          <div 
            onClick={() => onViewModeChange('both')}
            className="h-7 bg-[#252526] hover:bg-[#2d2d2d] px-3 border-t border-[#333333] flex items-center justify-between text-[11px] text-[#858585] cursor-pointer transition-colors shrink-0"
            title="Click to expand Turtle Graphics Canvas"
          >
            <div className="flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5 text-[#3776ab]" />
              <span className="text-[#cccccc]">Turtle Graphics Canvas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-[#1e1e1e] text-[#858585] border border-[#3e3e42]">
                Minimized
              </span>
              {hasTurtle && <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#858585] hover:text-[#cccccc]">
              <span className="text-[10px] hidden sm:inline">Click to expand</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Turtle View - Remains mounted to keep turtleTargetId DOM node always accessible */}
        <div 
          className={`flex flex-col bg-[#1e1e1e] overflow-hidden ${
            viewMode === 'turtle' ? 'flex-1' : ''
          } ${viewMode === 'console' ? 'hidden' : ''}`}
          style={viewMode === 'both' ? { height: `${100 - splitRatioY}%` } : undefined}
        >
            {/* Turtle Header & Controls */}
            <div className="h-7 bg-[#252526] px-3 border-b border-[#333333] flex items-center justify-between text-[11px] text-[#cccccc] shrink-0">
              <div className="flex items-center gap-1.5 font-medium">
                <Compass className="w-3.5 h-3.5 text-[#3776ab]" />
                <span>Turtle Graphics Canvas</span>
                {hasTurtle && <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Fit / 1:1 Zoom Mode Switcher */}
                <button
                  onClick={() => setZoomMode(zoomMode === 'fit' ? '100' : 'fit')}
                  className={`h-5.5 px-1.5 rounded-xs text-[10px] font-mono border flex items-center justify-center transition-colors ${
                    zoomMode === 'fit'
                      ? 'bg-[#1e2e25] border-[#234b35] text-[#4ec9b0]'
                      : 'bg-[#2d2d2d] border-[#3e3e42] text-[#858585] hover:text-[#cccccc]'
                  }`}
                  title={zoomMode === 'fit' ? 'Canvas Auto-Fits viewport. Click for 100% native scale' : 'Canvas at 100% native scale. Click to Auto-Fit'}
                >
                  {zoomMode === 'fit' ? 'Fit' : '1:1'}
                </button>

                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`h-5.5 px-1.5 rounded-xs flex items-center gap-1 text-[10px] border transition-colors ${
                    showGrid 
                      ? 'bg-[#1e2e25] border-[#234b35] text-[#4ec9b0]' 
                      : 'bg-[#2d2d2d] border-[#3e3e42] text-[#858585] hover:text-[#cccccc]'
                  }`}
                  title="Toggle Cartesian coordinate axes and grid markers (0,0)"
                >
                  <Grid className="w-3 h-3" />
                  <span>Grid</span>
                </button>

                <button
                  onClick={handleDownloadTurtleCanvas}
                  className="h-5.5 px-1.5 rounded-xs bg-[#2d2d2d] hover:bg-[#383838] border border-[#3e3e42] text-[#858585] hover:text-white flex items-center gap-1 text-[10px] transition-colors"
                  title="Export turtle canvas as composite PNG image"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">PNG</span>
                </button>

                {onResetTurtle && (
                  <button
                    onClick={onResetTurtle}
                    className="h-5.5 px-1.5 rounded-xs bg-[#2d2d2d] hover:bg-[#383838] border border-[#3e3e42] text-[#858585] hover:text-white flex items-center justify-center text-[10px] transition-colors"
                    title="Cleanly reset turtle canvas and state"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}

                {/* Minimize & Maximize Actions */}
                <div className="h-3.5 w-px bg-[#3e3e42] mx-0.5" />

                {viewMode === 'both' ? (
                  <>
                    <button
                      onClick={() => onViewModeChange('console')}
                      className="h-5.5 px-1.5 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] flex items-center justify-center transition-colors"
                      title="Minimize Turtle (show only Output)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onViewModeChange('turtle')}
                      className="h-5.5 px-1.5 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] flex items-center justify-center transition-colors"
                      title="Maximize Turtle (show only Turtle)"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onViewModeChange('both')}
                    className="h-5.5 px-1.5 rounded-xs hover:bg-[#383838] hover:text-[#cccccc] text-[#858585] transition-colors flex items-center gap-1 text-[10px]"
                    title="Restore stacked view"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="hidden sm:inline">Stack Both</span>
                  </button>
                )}
              </div>
            </div>

            {/* Turtle Canvas Viewport Area */}
            <div 
              ref={turtleViewportRef}
              className="flex-1 relative flex items-center justify-center p-3 overflow-hidden bg-[#141414] select-none"
            >
              {/* Scaled 600x500 Stage Frame */}
              <div 
                className="relative flex items-center justify-center shrink-0 transition-transform duration-150 ease-out"
                style={{
                  width: '600px',
                  height: '500px',
                  transform: `scale(${effectiveZoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Optional Coordinate grid background aligned with Python Turtle Cartesian coordinates */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="w-full h-px bg-[#007acc]/50 absolute top-1/2 -translate-y-1/2" />
                    <div className="h-full w-px bg-[#007acc]/50 absolute left-1/2 -translate-x-1/2" />
                    <div className="w-full h-px border-t border-dashed border-[#007acc]/20 absolute top-[125px]" />
                    <div className="w-full h-px border-t border-dashed border-[#007acc]/20 absolute top-[375px]" />
                    <div className="h-full w-px border-l border-dashed border-[#007acc]/20 absolute left-[150px]" />
                    <div className="h-full w-px border-l border-dashed border-[#007acc]/20 absolute left-[450px]" />
                    
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#4ec9b0] bg-[#1e1e1e]/90 px-1.5 py-0.5 rounded-xs border border-[#333]">
                      +Y (250)
                    </div>
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-[#4ec9b0] bg-[#1e1e1e]/90 px-1.5 py-0.5 rounded-xs border border-[#333]">
                      -Y (-250)
                    </div>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#4ec9b0] bg-[#1e1e1e]/90 px-1.5 py-0.5 rounded-xs border border-[#333]">
                      +X (300)
                    </div>
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#4ec9b0] bg-[#1e1e1e]/90 px-1.5 py-0.5 rounded-xs border border-[#333]">
                      -X (-300)
                    </div>
                    <div className="absolute top-1/2 left-1/2 text-[9px] font-mono text-[#38bdf8] bg-[#1e1e1e]/90 px-1.5 py-0.5 rounded-xs border border-[#333] translate-x-2 translate-y-2">
                      (0, 0)
                    </div>
                  </div>
                )}

                {/* Target container DOM node for Skulpt's Turtle Canvas - Standard Block Container for Layer Stacking */}
                <div 
                  id={turtleTargetId} 
                  className="w-[600px] h-[500px] bg-[#0f172a] rounded-xs shadow-2xl border border-[#2d2d30] overflow-hidden"
                  style={{
                    width: '600px',
                    height: '500px',
                    display: 'block',
                    position: 'relative',
                  }}
                />

                {/* Empty placeholder message if turtle canvas hasn't drawn anything yet */}
                {!hasTurtle && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#858585] space-y-2.5 p-4 text-center z-20">
                    <div className="w-12 h-12 rounded-full bg-[#1e293b] flex items-center justify-center text-[#38bdf8] shadow-inner">
                      <Compass className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#e2e8f0]">Python Turtle Canvas</p>
                      <p className="text-[11px] text-[#94a3b8] max-w-xs leading-relaxed">
                        Ready to draw! Run any script with <code className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-[#38bdf8] font-mono border border-[#334155]">import turtle</code> to render graphics in real-time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};
