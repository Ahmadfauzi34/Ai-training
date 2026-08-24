import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SwarmBenchmark } from './SwarmBenchmark.ts';
import { EntityManifold } from '../core/EntityManifold.ts';

describe('Swarm Benchmark & Market Engine Tests', () => {
  it('populateAgents correctly allocates entities in manifold', () => {
    const manifold = new EntityManifold();
    const created = SwarmBenchmark.populateAgents(manifold, 500);

    assert.strictEqual(created, 500);
    assert.strictEqual(manifold.activeCount, 500);
    assert.strictEqual(manifold.masses[0], 1.0);
  });

  it('runSimulation calculates performance metrics correctly', () => {
    const metrics = SwarmBenchmark.runSimulation(100, 10, {
      cohesion: 0.1,
      separation: 0.05,
      alignment: 0.02
    });

    assert.strictEqual(metrics.agentCount, 100);
    assert.strictEqual(metrics.iterations, 10);
    assert.ok(metrics.totalTimeMs >= 0);
    assert.ok(metrics.fps > 0);
    assert.ok(metrics.agentsPerSecond >= 0);
    assert.strictEqual(metrics.cohesionFactor, 0.1);
  });
});
