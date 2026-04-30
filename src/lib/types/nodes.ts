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

// 👇 1. TAMBAHAN BARU: Data untuk TensorFlow Node
export interface TFNodeData extends BaseNodeData {
  operation: 'matmul' | 'add' | 'relu' | 'sigmoid';
  // Nanti bisa tambah: units, kernelSize, filters, dll.
}

export type AppNodeData = 
  | InputNodeData 
  | ActionNodeData 
  | MemoryNodeData 
  | MatrixNodeData
  | TFNodeData; // <-- Masukkan ke Union

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

// 👇 2. TAMBAHAN BARU: Interface Node TF
export interface TFNode extends BaseNode { type: 'tf_op'; data: TFNodeData; }

// 👇 3. UPDATE GLOBAL UNION
export type AppNode = 
  | InputNode 
  | ActionNode 
  | MemoryNode 
  | MathNode 
  | TFNode; // <-- Masukkan ke sini