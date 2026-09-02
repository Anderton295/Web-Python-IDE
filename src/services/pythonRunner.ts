import { OutputMessage, ErrorInfo } from '../types';
import { analyzePythonError } from './errorAnalyzer';

export interface RunOptions {
  code: string;
  onOutput: (msg: OutputMessage) => void;
  onRequestInput: (prompt: string) => Promise<string>;
  onTurtleActive: () => void;
  turtleTargetId: string;
  turtleWidth?: number;
  turtleHeight?: number;
  turtleFast?: boolean;
}

export interface RunResult {
  success: boolean;
  error?: ErrorInfo;
  executionTimeMs: number;
}

// Reset turtle environment, animation loops, and Skulpt turtleInstance cache
export function resetTurtleEnvironment(turtleTargetId: string = 'turtle-canvas-container'): void {
  if (typeof window === 'undefined') return;
  const w = window as any;

  // 1. Stop any active Skulpt turtle animation frames & timers
  if (w.Sk?.TurtleGraphics) {
    if (typeof w.Sk.TurtleGraphics.stop === 'function') {
      try {
        w.Sk.TurtleGraphics.stop();
      } catch (_) {}
    }
    if (typeof w.Sk.TurtleGraphics.reset === 'function') {
      try {
        w.Sk.TurtleGraphics.reset();
      } catch (_) {}
    }
    delete w.Sk.TurtleGraphics.module;
    delete w.Sk.TurtleGraphics.raw;
  }

  // 2. Clear target DOM element and remove internal turtleInstance cache
  const targetElement = document.getElementById(turtleTargetId);
  if (targetElement) {
    const elAny = targetElement as any;
    if (elAny.turtleInstance) {
      try {
        elAny.turtleInstance.stop?.();
        elAny.turtleInstance.reset?.();
      } catch (_) {}
      delete elAny.turtleInstance;
    }
    while (targetElement.firstChild) {
      targetElement.removeChild(targetElement.firstChild);
    }
  }
}

// Ensure Skulpt runtime is loaded and ready
export async function ensureSkulptLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  if (w.Sk && w.Sk.importMainWithBody) return true;

  // Wait up to 5 seconds if script is currently loading via <script> tag
  for (let i = 0; i < 25; i++) {
    if (w.Sk && w.Sk.importMainWithBody) return true;
    await new Promise(r => setTimeout(r, 200));
  }

  // Fallback: Dynamically inject if somehow not loaded
  try {
    if (!w.Sk) {
      await loadScript('https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js');
    }
    return !!(w.Sk && w.Sk.importMainWithBody);
  } catch (err) {
    console.error('Failed to load Skulpt runtime:', err);
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

function builtinRead(file: string) {
  const Sk = (window as any).Sk;
  if (!Sk || !Sk.builtinFiles || !Sk.builtinFiles['files'] || !Sk.builtinFiles['files'][file]) {
    throw new Error(`File not found: '${file}'`);
  }
  return Sk.builtinFiles['files'][file];
}

export async function executePythonCode(options: RunOptions): Promise<RunResult> {
  const { code, onOutput, onRequestInput, onTurtleActive, turtleTargetId, turtleWidth, turtleHeight, turtleFast } = options;
  const startTime = performance.now();

  const isReady = await ensureSkulptLoaded();
  if (!isReady) {
    const errorInfo: ErrorInfo = {
      rawMessage: 'Python runtime environment failed to load.',
      errorType: 'RuntimeInitializationError',
      explanation: 'Could not connect to the in-browser Python interpreter. Please check your internet connection.',
      suggestions: ['Check network connectivity and refresh the application.'],
    };
    return { success: false, error: errorInfo, executionTimeMs: 0 };
  }

  const Sk = (window as any).Sk;

  // Detect if code uses turtle
  const usesTurtle = /import\s+turtle|from\s+turtle\s+import/i.test(code);
  if (usesTurtle) {
    onTurtleActive();
    // Allow React state & layout to commit if turtle panel was collapsed or hidden
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  // Always reset turtle state cleanly before executing to prevent ghost animations or corrupted module caches
  resetTurtleEnvironment(turtleTargetId);

  // Configure Skulpt
  Sk.pre = 'output';
  Sk.configure({
    output: (text: string) => {
      onOutput({
        id: Math.random().toString(36).substring(2, 9),
        type: 'stdout',
        text,
        timestamp: new Date().toLocaleTimeString(),
      });
    },
    read: builtinRead,
    inputfun: async (promptText: string) => {
      onOutput({
        id: Math.random().toString(36).substring(2, 9),
        type: 'input-prompt',
        text: promptText,
        timestamp: new Date().toLocaleTimeString(),
      });
      const userInput = await onRequestInput(promptText);
      onOutput({
        id: Math.random().toString(36).substring(2, 9),
        type: 'input-echo',
        text: userInput + '\n',
        timestamp: new Date().toLocaleTimeString(),
      });
      return userInput;
    },
    inputfunTakesPrompt: true,
    __future__: Sk.python3,
  });

  // Setup standard Cartesian coordinate space (600x500 standard viewport)
  const canvasWidth = turtleWidth || 600;
  const canvasHeight = turtleHeight || 500;

  (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = turtleTargetId;
  Sk.TurtleGraphics.width = canvasWidth;
  Sk.TurtleGraphics.height = canvasHeight;
  Sk.TurtleGraphics.animate = !turtleFast;
  Sk.TurtleGraphics.bufferSize = 0;
  Sk.TurtleGraphics.allowUndo = true;

  try {
    const promise = Sk.misceval.asyncToPromise(() => {
      return Sk.importMainWithBody('<stdin>', false, code, true);
    });

    await promise;

    const elapsed = Math.round(performance.now() - startTime);
    return {
      success: true,
      executionTimeMs: elapsed,
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);
    const rawError = err ? (err.toString ? err.toString() : String(err)) : 'Unknown Python error';
    
    // Parse error & generate intelligent suggestions
    const errorInfo = analyzePythonError(rawError, code);

    // Send stderr to console
    onOutput({
      id: Math.random().toString(36).substring(2, 9),
      type: 'stderr',
      text: `${rawError}\n`,
      timestamp: new Date().toLocaleTimeString(),
    });

    return {
      success: false,
      error: errorInfo,
      executionTimeMs: elapsed,
    };
  }
}
