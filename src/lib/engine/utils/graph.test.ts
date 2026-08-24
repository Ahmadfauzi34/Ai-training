import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../scripts/test-runner/src/core/test-runner.ts';
import { asNodeId } from '../../types/core.ts';
import type { AppEdge } from '../../types/edges.ts';
import { buildExecutionPlan, buildOutgoingIndex } from './graph.ts';

describe('Graph edge index', () => {
  it('groups targets by source while preserving edge order', () => {
    const source = asNodeId('source');
    const otherSource = asNodeId('other-source');
    const firstTarget = asNodeId('first-target');
    const secondTarget = asNodeId('second-target');
    const edges = [
      { id: 'edge-1', source, target: firstTarget },
      { id: 'edge-2', source: otherSource, target: firstTarget },
      { id: 'edge-3', source, target: secondTarget },
    ] as AppEdge[];

    const index = buildOutgoingIndex(edges);

    StrictAssertions.deepStrictEqual(index.get(source)!, [firstTarget, secondTarget]);
    StrictAssertions.deepStrictEqual(index.get(otherSource)!, [firstTarget]);
  });

  it('returns an empty index for a graph without edges', () => {
    const index = buildOutgoingIndex([]);

    StrictAssertions.strictEqual(index.size, 0);
  });
});

describe('Graph execution plan', () => {
  it('waits for every parent before scheduling a converging node', () => {
    const input = asNodeId('input');
    const left = asNodeId('left');
    const right = asNodeId('right');
    const join = asNodeId('join');
    const edges = [
      { source: input, target: left },
      { source: input, target: right },
      { source: left, target: join },
      { source: right, target: join }
    ] as AppEdge[];

    const plan = buildExecutionPlan([input, left, right, join], edges, [input]);

    StrictAssertions.deepStrictEqual(plan.orderedNodeIds, [input, left, right, join]);
    StrictAssertions.deepStrictEqual(plan.blockedNodeIds, []);
  });

  it('reports nodes blocked by a reachable dependency cycle', () => {
    const input = asNodeId('input');
    const first = asNodeId('first');
    const second = asNodeId('second');
    const edges = [
      { source: input, target: first },
      { source: first, target: second },
      { source: second, target: first }
    ] as AppEdge[];

    const plan = buildExecutionPlan([input, first, second], edges, [input]);

    StrictAssertions.deepStrictEqual(plan.orderedNodeIds, [input]);
    StrictAssertions.deepStrictEqual(plan.blockedNodeIds, [first, second]);
  });

  it('does not schedule graph components unreachable from the selected input', () => {
    const input = asNodeId('input');
    const reachable = asNodeId('reachable');
    const isolated = asNodeId('isolated');
    const edges = [{ source: input, target: reachable }] as AppEdge[];

    const plan = buildExecutionPlan([input, reachable, isolated], edges, [input]);

    StrictAssertions.deepStrictEqual(plan.orderedNodeIds, [input, reachable]);
  });
});
