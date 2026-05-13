// src/lib/types/nodes.ts
import type { NodeId } from './core';

// --- DATA DEFINITIONS ---
export interface BaseNodeData {
  label?: string;
}

export interface InputNodeData extends BaseNodeData {
  inputType: 'text' | 'file';
}

export interface ActionNodeData extends BaseNodeData {
  model: string; 
  prompt: string;
  temperature?: number;
}

export interface MemoryNodeData extends BaseNodeData {
  text: string;
  collectionName?: string;
}

export interface MatrixNodeData extends BaseNodeData {
  rows?: number;
  cols?: number;
  defaultValue?: number[];
  operation?: 'add' | 'multiply' | 'subtract' | 'transpose' | 'normalize';
}

export interface RRMNodeData extends BaseNodeData {
  mode: 'sandbox' | 'fhrr' | 'entanglement' | 'orchestrator';
  customParams?: Record<string, any>;
}

export type AppNodeData = 
  | InputNodeData 
  | ActionNodeData 
  | MemoryNodeData 
  | MatrixNodeData
  | RRMNodeData;

// --- NODE INTERFACES ---
export interface BaseNode {
  id: NodeId;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  selected?: boolean;
  dragHandle?: string;
  sourcePosition?: string;
  targetPosition?: string;
  style?: string;
  class?: string;
}

export interface InputNode extends BaseNode { type: 'input'; data: InputNodeData; }
export interface ActionNode extends BaseNode { type: 'action'; data: ActionNodeData; }
export interface MemoryNode extends BaseNode { type: 'rag_memory'; data: MemoryNodeData; }
export interface MathNode extends BaseNode { type: 'math_op'; data: MatrixNodeData; }
export interface RRMNode extends BaseNode { type: 'rrm_reasoning'; data: RRMNodeData; }

export type AppNode = 
  | InputNode 
  | ActionNode 
  | MemoryNode 
  | MathNode
  | RRMNode;