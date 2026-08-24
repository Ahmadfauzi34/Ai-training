import type { AppEdge, NodeId } from '../../types';

export interface ExecutionPlan {
  orderedNodeIds: NodeId[];
  blockedNodeIds: NodeId[];
}

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

/**
 * Build a dependency-safe order for the portion of the graph reachable from
 * the selected start nodes. A node with multiple parents is emitted only after
 * every reachable parent has been emitted.
 */
export function buildExecutionPlan(
  nodeIds: readonly NodeId[],
  edges: readonly AppEdge[],
  startNodeIds: readonly NodeId[]
): ExecutionPlan {
  const knownNodes = new Set(nodeIds);
  const outgoing = buildOutgoingIndex(edges);
  const reachable = new Set<NodeId>();
  const discoveryQueue = startNodeIds.filter(nodeId => knownNodes.has(nodeId));

  for (let index = 0; index < discoveryQueue.length; index++) {
    const nodeId = discoveryQueue[index]!;
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);

    for (const targetId of outgoing.get(nodeId) ?? []) {
      if (knownNodes.has(targetId) && !reachable.has(targetId)) {
        discoveryQueue.push(targetId);
      }
    }
  }

  const indegree = new Map<NodeId, number>();
  for (const nodeId of reachable) indegree.set(nodeId, 0);
  for (const edge of edges) {
    if (reachable.has(edge.source) && reachable.has(edge.target)) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
  }

  const readyQueue = nodeIds.filter(nodeId => reachable.has(nodeId) && indegree.get(nodeId) === 0);
  const orderedNodeIds: NodeId[] = [];

  for (let index = 0; index < readyQueue.length; index++) {
    const nodeId = readyQueue[index]!;
    orderedNodeIds.push(nodeId);

    for (const targetId of outgoing.get(nodeId) ?? []) {
      if (!reachable.has(targetId)) continue;
      const remainingDependencies = (indegree.get(targetId) ?? 0) - 1;
      indegree.set(targetId, remainingDependencies);
      if (remainingDependencies === 0) readyQueue.push(targetId);
    }
  }

  return {
    orderedNodeIds,
    blockedNodeIds: [...reachable].filter(nodeId => (indegree.get(nodeId) ?? 0) > 0)
  };
}
