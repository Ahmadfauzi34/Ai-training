import { describe, it } from 'node:test';
import { StrictAssertions } from '../../../scripts/test-runner/src/core/test-runner.ts';
import { asEdgeId, asNodeId } from '../types/core.ts';
import type { AppEdge } from '../types/edges.ts';
import type { AppNode } from '../types/nodes.ts';
import { executeLabCommand } from './labCommands.ts';

const actionNode = {
  id: asNodeId('action-1'),
  type: 'action',
  position: { x: 0, y: 0 },
  data: { label: 'AI', model: 'gemini', prompt: 'old prompt' }
} as AppNode;

const rrmNode = {
  id: asNodeId('rrm-1'),
  type: 'rrm_reasoning',
  position: { x: 100, y: 0 },
  data: { label: 'Reasoner', mode: 'sandbox' }
} as AppNode;

const mathNode = {
  id: asNodeId('math-1'),
  type: 'math_op',
  position: { x: 200, y: 0 },
  data: { label: 'Matrix', operation: 'multiply', rows: 2, cols: 2 }
} as AppNode;

describe('Lab chat commands', () => {
  it('does not intercept normal chat messages', () => {
    const result = executeLabCommand('halo lab', [actionNode], []);
    StrictAssertions.strictEqual(result.handled, false);
  });

  it('updates node data without mutating the original node', () => {
    const result = executeLabCommand('/set action-1 prompt jawaban harus ringkas', [actionNode], []);

    StrictAssertions.strictEqual(result.handled, true);
    StrictAssertions.strictEqual(result.nodes![0]!.data.prompt, 'jawaban harus ringkas');
    StrictAssertions.strictEqual(actionNode.data.prompt, 'old prompt');
  });

  it('connects and disconnects nodes', () => {
    const connected = executeLabCommand(
      '/connect action-1 rrm-1',
      [actionNode, rrmNode],
      [],
      () => 'edge-1'
    );
    StrictAssertions.strictEqual(connected.edges!.length, 1);
    StrictAssertions.strictEqual(connected.edges![0]!.source, actionNode.id);
    StrictAssertions.strictEqual(connected.edges![0]!.target, rrmNode.id);

    const disconnected = executeLabCommand(
      '/disconnect action-1 rrm-1',
      [actionNode, rrmNode],
      connected.edges!
    );
    StrictAssertions.strictEqual(disconnected.edges!.length, 0);
  });

  it('lists node topology', () => {
    const edges = [{
      id: asEdgeId('edge-1'),
      source: actionNode.id,
      target: rrmNode.id
    }] as AppEdge[];

    const result = executeLabCommand('/nodes', [actionNode, rrmNode], edges);
    StrictAssertions.strictEqual(result.message!.includes('action-1 [action] → rrm-1'), true);
  });

  it('rejects invalid numeric node configuration', () => {
    const result = executeLabCommand('/set math-1 rows -2', [mathNode], []);
    StrictAssertions.strictEqual(result.message!.includes('bilangan bulat positif'), true);
  });

  it('rejects fields that do not belong to the target node type', () => {
    const result = executeLabCommand('/set action-1 rows 2', [actionNode], []);
    StrictAssertions.strictEqual(result.nodes, undefined);
    StrictAssertions.strictEqual(result.message!.includes('tidak berlaku'), true);
  });
});
