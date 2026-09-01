// src/lib/types/nodes.ts
import type { NodeId } from './core';
import type { Node } from '@xyflow/svelte';

// --- DATA DEFINITIONS ---
export interface BaseNodeData extends Record<string, unknown> {
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
  mode: 'sandbox' | 'plr_proof' | 'fhrr' | 'entanglement';
  customParams?: Record<string, unknown>;
}

export type AppNodeData = 
  | InputNodeData 
  | ActionNodeData 
  | MemoryNodeData 
  | MatrixNodeData
  | RRMNodeData;

// --- NODE INTERFACES ---
export type BaseNode = Omit<Node, 'id' | 'data' | 'type'> & { id: NodeId };

export type InputNode = BaseNode & { type: 'input'; data: InputNodeData };
export type ActionNode = BaseNode & { type: 'action'; data: ActionNodeData };
export type MemoryNode = BaseNode & { type: 'rag_memory'; data: MemoryNodeData };
export type MathNode = BaseNode & { type: 'math_op'; data: MatrixNodeData };
export type RRMNode = BaseNode & { type: 'rrm_reasoning'; data: RRMNodeData };

export type AppNode = 
  | InputNode 
  | ActionNode 
  | MemoryNode 
  | MathNode
  | RRMNode;
