import { ProjectFile } from '../types';

const STORAGE_KEY = 'python_studio_files_v1';
const ACTIVE_FILE_KEY = 'python_studio_active_file_v1';

export const STARTER_FILES: ProjectFile[] = [
  {
    id: 'f_turtle_star',
    name: 'turtle_star',
    extension: 'py',
    content: `# Python Turtle Graphics Demo: 36-Point Geometric Star
import turtle

t = turtle.Turtle()
t.speed(8)
turtle.bgcolor("#0f172a")
t.pensize(2)

colors = ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#34d399"]

print("Starting Turtle Drawing...")

for i in range(36):
    t.color(colors[i % len(colors)])
    t.forward(140)
    t.left(170)
    t.forward(60)
    t.left(20)

t.penup()
t.goto(-40, -160)
t.color("#f8fafc")
t.pendown()

print("Geometric star finished successfully!")
turtle.done()
`,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000,
  },
  {
    id: 'f_main',
    name: 'main',
    extension: 'py',
    content: `# Welcome to Python IDE!
# You can write and run standard Python code here.

def fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

print("=" * 40)
print("🐍 Python 3 In-Browser Workspace")
print("=" * 40)

# Calculate Fibonacci numbers
count = 10
fibs = fibonacci(count)
print(f"First {count} Fibonacci numbers: {fibs}")

# List comprehension & calculations
squares = [x**2 for x in range(1, 8)]
print(f"Squares of 1..7: {squares}")

# Interactive greetings
name = "Developer"
print(f"Happy coding, {name}!")
print("Tip: Click 'Run' (or press Ctrl+Enter) to execute code.")
`,
    createdAt: Date.now() - 200000,
    updatedAt: Date.now() - 200000,
  },
  {
    id: 'f_turtle_spiral',
    name: 'rainbow_spiral',
    extension: 'py',
    content: `# Rainbow Spiral Pattern with Turtle
import turtle

t = turtle.Turtle()
turtle.bgcolor("#090d16")
t.speed(0)
t.pensize(2)

colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#a855f7"]

print("Drawing rainbow vortex spiral...")

for x in range(120):
    t.pencolor(colors[x % 6])
    t.forward(x * 2)
    t.left(59)

print("Spiral completed!")
turtle.done()
`,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: 'f_notes',
    name: 'notes',
    extension: 'txt',
    content: `Project Notes:
==========================
- This IDE supports multi-file management in LocalStorage.
- You can create both Python (.py) and plain text (.txt) files.
- Code editor features:
  * Proper Python syntax coloring
  * Indentation tab lines
  * Autocomplete for keywords, built-ins, and turtle functions
  * Real-time error detection with fix suggestions
  * Turtle graphics canvas with export
`,
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000,
  }
];

export function loadFilesFromStorage(): ProjectFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveFilesToStorage(STARTER_FILES);
      return STARTER_FILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return STARTER_FILES;
  } catch (err) {
    console.error('Failed to load files from localStorage:', err);
    return STARTER_FILES;
  }
}

export function saveFilesToStorage(files: ProjectFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('Failed to save files to localStorage:', err);
  }
}

export function loadActiveFileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_FILE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveFileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_FILE_KEY, id);
  } catch {
    // ignore
  }
}

export { saveFileAsTxt, saveFileAsPy, exportFileToDocx, exportToGoogleDocs } from './exportDocs';

export function downloadFile(file: ProjectFile, format: 'txt' | 'py' | 'docx' = 'txt'): void {
  if (format === 'py') {
    const blob = new Blob([file.content], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  
  // Default is saving as .txt
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
