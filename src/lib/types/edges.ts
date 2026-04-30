// src/lib/types/edges.ts
import type { EdgeId, NodeId } from './core';

export type EdgeMarkerType = {
  type: string;
  color?: string;
  width?: number;
  height?: number;
};

export interface AppEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  markerEnd?: EdgeMarkerType;
  selected?: boolean;
  style?: string;
}