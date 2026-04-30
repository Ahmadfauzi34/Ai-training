// src/lib/types/state.ts
import type { LogRole } from './engine';
import type { AppNode } from './nodes';
import type { AppEdge } from './edges';

export interface LogMessage {
  role: LogRole;
  text: string;
  timestamp: number; 
}

export interface V76State {
  isReady: boolean;
  status: 'idle' | 'running' | 'error'; 
  activeTab: 'chat' | 'brain' | 'config';
  lastChange: number;
  logs: LogMessage[];
  nodes: AppNode[]; 
  edges: AppEdge[];
  input: string;
  isStorageError?: boolean;

  executionResults: Record<string, any>; 
}