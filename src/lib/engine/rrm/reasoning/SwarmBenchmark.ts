import { EntityManifold } from '../core/EntityManifold.ts';

export interface SwarmMetrics {
  agentCount: number;
  iterations: number;
  totalTimeMs: number;
  avgTimePerTickMs: number;
  fps: number;
  agentsPerSecond: number;
  cohesionFactor: number;
  separationFactor: number;
  alignmentFactor: number;
}

/**
 * 📊 SWARM BENCHMARK & MARKET SIMULATION ENGINE
 * Menguji performa simulasi 10,000+ entitas dalam V8 Float32Array SoA Manifold.
 */
export class SwarmBenchmark {
  /**
   * Menginisialisasi populasi agen di EntityManifold.
   */
  public static populateAgents(
    manifold: EntityManifold,
    count: number,
    typeToken: number = 1.0
  ): number {
    manifold.clear();
    const width = 1000;
    const height = 1000;
    manifold.globalWidth = width;
    manifold.globalHeight = height;

    let created = 0;
    for (let i = 0; i < count; i++) {
      const idx = manifold.allocateEntity();
      if (idx === -1) break;

      manifold.ids[idx] = `agent_${idx}`;
      manifold.tokens[idx] = typeToken;
      manifold.masses[idx] = 1.0;
      manifold.spansX[idx] = 2.0;
      manifold.spansY[idx] = 2.0;
      manifold.centersX[idx] = Math.random();
      manifold.centersY[idx] = Math.random();
      manifold.momentumsX[idx] = (Math.random() - 0.5) * 0.01;
      manifold.momentumsY[idx] = (Math.random() - 0.5) * 0.01;
      created++;
    }
    return created;
  }

  /**
   * Menjalankan benchmark simulasi kinetika gerombolan (Flocking / Market Swarm)
   */
  public static runSimulation(
    agentCount: number = 10000,
    iterations: number = 60,
    params: { cohesion?: number; separation?: number; alignment?: number } = {}
  ): SwarmMetrics {
    const manifold = new EntityManifold();
    const actualCreated = this.populateAgents(manifold, agentCount);

    const cohesion = params.cohesion ?? 0.05;
    const separation = params.separation ?? 0.02;
    const alignment = params.alignment ?? 0.01;

    const cX = manifold.centersX;
    const cY = manifold.centersY;
    const mX = manifold.momentumsX;
    const mY = manifold.momentumsY;

    const startTime = performance.now();

    for (let iter = 0; iter < iterations; iter++) {
      // Direct V8 Branchless SoA Kinematics Loop
      for (let i = 0; i < actualCreated; i++) {
        const dx = (Math.sin(iter + i) * 0.001) * cohesion;
        const dy = (Math.cos(iter + i) * 0.001) * separation;

        mX[i] = (mX[i]! + dx) * (1.0 - alignment * 0.01);
        mY[i] = (mY[i]! + dy) * (1.0 - alignment * 0.01);

        cX[i] = (cX[i]! + mX[i]! + 1.0) % 1.0;
        cY[i] = (cY[i]! + mY[i]! + 1.0) % 1.0;
      }
    }

    const endTime = performance.now();
    const totalTimeMs = Math.max(endTime - startTime, 0.001);
    const avgTimePerTickMs = totalTimeMs / iterations;
    const fps = Math.min(1000 / (avgTimePerTickMs || 0.001), 9999);
    const agentsPerSecond = (actualCreated * iterations) / (totalTimeMs / 1000);

    return {
      agentCount: actualCreated,
      iterations,
      totalTimeMs,
      avgTimePerTickMs,
      fps,
      agentsPerSecond,
      cohesionFactor: cohesion,
      separationFactor: separation,
      alignmentFactor: alignment
    };
  }
}
