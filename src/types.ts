export interface ProjectFile {
  id: string;
  name: string;
  extension: 'py' | 'txt';
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface OutputMessage {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'input-prompt' | 'input-echo';
  text: string;
  timestamp: string;
}

export interface ErrorInfo {
  rawMessage: string;
  errorType: string;
  line?: number;
  column?: number;
  codeLine?: string;
  explanation: string;
  suggestions: string[];
  autoFix?: {
    label: string;
    newCode: string;
    targetLine?: number;
    description: string;
  };
}

export type ViewMode = 'both' | 'console' | 'turtle';
