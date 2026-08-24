import type { AppEdge, NodeId } from '../../types';

/**
 * Index graph edges once so traversal does not scan the complete edge list for
 * every node it executes.
 */
export function buildOutgoingIndex(edges: readonly AppEdge[]): Map<NodeId, NodeId[]> {
  const outgoing = new Map<NodeId, NodeId[]>();

  for (const edge of edges) {
    const targets = outgoing.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    } else {
      outgoing.set(edge.source, [edge.target]);
    }
  }

  return outgoing;
}
