// src/lib/types/core.ts

export type NodeId = string & { readonly __brand: unique symbol };
export type EdgeId = string & { readonly __brand: unique symbol };

// Helpers
export function asNodeId(id: string): NodeId {
  return id as NodeId;
}

export function asEdgeId(id: string): EdgeId {
  return id as EdgeId;
}