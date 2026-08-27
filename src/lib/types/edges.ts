// src/lib/types/edges.ts
import type { EdgeId, NodeId } from './core';
import type { Edge } from '@xyflow/svelte';

export type EdgeMarkerType = NonNullable<Edge['markerEnd']>;

export type AppEdge = Omit<Edge, 'id' | 'source' | 'target'> & {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
};
