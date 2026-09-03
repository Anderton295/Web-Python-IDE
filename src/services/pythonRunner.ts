import { OutputMessage, ErrorInfo } from '../types';
import { analyzePythonError } from './errorAnalyzer';
import { setupGCSELibraries } from './gcseLibraries';

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
  stopped?: boolean;
  error?: ErrorInfo;
  executionTimeMs: number;
}

// Active execution control state for interrupts
interface ActiveRunControl {
  isInterrupted: boolean;
  turtleTargetId: string;
  cancelInputPrompt?: () => void;
}

let currentRunControl: ActiveRunControl | null = null;

// Stop running Python code immediately
export function stopPythonExecution(): void {
  if (currentRunControl) {
    currentRunControl.isInterrupted = true;
    if (typeof currentRunControl.cancelInputPrompt === 'function') {
      try {
        currentRunControl.cancelInputPrompt();
      } catch (_) {}
    }
  }

  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.Sk) {
      w.Sk.hardInterrupt = true;
    }
  }

  // Immediately stop and clear any active turtle animations
  resetTurtleEnvironment(currentRunControl?.turtleTargetId || 'turtle-canvas-container');
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
    // Restore default container styling
    targetElement.style.backgroundColor = '';
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

  // Initialize active run control for stop button interrupts
  let cancelInputPromise: (() => void) | undefined;
  const activeControl: ActiveRunControl = {
    isInterrupted: false,
    turtleTargetId,
    cancelInputPrompt: () => {
      if (cancelInputPromise) {
        cancelInputPromise();
      }
    },
  };
  currentRunControl = activeControl;
  Sk.hardInterrupt = false;

  // Setup GCSE Computer Science Libraries & patch Turtle module
  setupGCSELibraries(Sk, turtleTargetId);

  // Detect if code uses turtle
  const usesTurtle = /import\s+turtle|from\s+turtle\s+import/i.test(code);
  if (usesTurtle) {
    onTurtleActive();
    // Allow React state & layout to commit if turtle panel was collapsed or hidden
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  // Always reset turtle state cleanly before executing to prevent ghost animations or corrupted module caches
  resetTurtleEnvironment(turtleTargetId);

  // Configure Skulpt with interrupt hooks and responsive yields
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
    killableWhile: true,
    killableFor: true,
    yieldLimit: 20,
    breakpoints: () => {
      if (activeControl.isInterrupted || Sk.hardInterrupt) {
        throw new Error('Program stopped by user');
      }
      return false;
    },
    inputfun: async (promptText: string) => {
      if (activeControl.isInterrupted) {
        throw new Error('Program stopped by user');
      }

      onOutput({
        id: Math.random().toString(36).substring(2, 9),
        type: 'input-prompt',
        text: promptText,
        timestamp: new Date().toLocaleTimeString(),
      });

      const inputPromise = new Promise<string>((resolve, reject) => {
        cancelInputPromise = () => {
          reject(new Error('Program stopped by user'));
        };
        onRequestInput(promptText)
          .then((val) => resolve(val))
          .catch((err) => reject(err));
      });

      const userInput = await inputPromise;

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

    // Handle user stop/interrupt without showing syntax error modals
    if (activeControl.isInterrupted || rawError.includes('Program stopped by user')) {
      onOutput({
        id: Math.random().toString(36).substring(2, 9),
        type: 'system',
        text: '\n🛑 Program execution stopped by user.\n',
        timestamp: new Date().toLocaleTimeString(),
      });

      return {
        success: false,
        stopped: true,
        executionTimeMs: elapsed,
      };
    }
    
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
  } finally {
    if (currentRunControl === activeControl) {
      currentRunControl = null;
    }
  }
}
