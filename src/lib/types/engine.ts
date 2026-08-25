// src/lib/types/engine.ts
import type { Matrix } from '../engine/math/Matrix';
import type { NodeId } from './core';
import type { AppNode } from './nodes';
import type { AppEdge } from './edges';
import type { RRMNodeResult } from './rrm';

// 👇 1. Import RxJS Subject
import { Subject } from 'rxjs';

// Definisi Event untuk Training AI
export interface EngineEvent {
  type: 'EPOCH_END' | 'BATCH_END' | 'LOG' | 'ERROR';
  nodeId?: NodeId;
  payload: any;
}

export interface EngineContext {
  userInput: string;
  accumulatedData: string;

  env: {
    apiKey?: string;
  };

  // Kotak Surat Output
  nodeResults: Map<NodeId, NodeResult>;

  // Registry Matrix
  tensorRegistry?: Map<NodeId, Matrix>; 

  // Snapshot Graph
  graph: {
     nodes: AppNode[];
     edges: AppEdge[];
  }; 

  // 👇 2. Global Event Stream (Nadi Aplikasi)
  events$: Subject<EngineEvent>;
}

export type NodeResult = string | Matrix | RRMNodeResult | null;

export type LogRole = 'system' | 'user' | 'ai' | 'engine';
export type LoggerFunction = (role: LogRole, text: string) => void;
