import { SwarmBenchmark } from '../rrm/reasoning/SwarmBenchmark.ts';
import type { SwarmNode, EngineContext, LoggerFunction } from '../../types/index.ts';

export async function executeSwarm(
  node: SwarmNode,
  context: EngineContext,
  logger: LoggerFunction
): Promise<string> {
  const agentCount = node.data.agentCount ?? 10000;
  const cohesion = node.data.cohesion ?? 0.05;
  const separation = node.data.separation ?? 0.02;
  const alignment = node.data.alignment ?? 0.01;
  const iterations = node.data.iterations ?? 60;

  logger('system', `🐝 Swarm Engine: Menjalankan simulasi ${agentCount.toLocaleString()} agen (${iterations} ticks)...`);

  const metrics = SwarmBenchmark.runSimulation(agentCount, iterations, {
    cohesion,
    separation,
    alignment
  });

  const summary = `[SWARM METRICS]
• Agen Aktif: ${metrics.agentCount.toLocaleString()}
• Throughput: ${Math.round(metrics.agentsPerSecond).toLocaleString()} ops/sec
• Waktu Iterasi: ${metrics.totalTimeMs.toFixed(2)} ms (${metrics.fps.toFixed(0)} FPS)
• Parameter: C=${cohesion}, S=${separation}, A=${alignment}`;

  logger('ai', `\n--- SIMULASI GEROMBOLAN / SWARM MARKET ---\n${summary}\n------------------------------------------`);

  return summary;
}
