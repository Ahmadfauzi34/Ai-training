import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../../scripts/test-runner/src/core/test-runner.ts';
import { asNodeId } from '../../types/core.ts';
import type { AppEdge } from '../../types/edges.ts';
import { buildOutgoingIndex } from './graph.ts';

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
