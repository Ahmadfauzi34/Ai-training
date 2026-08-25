// src/lib/engine/GraphRunner.ts
import { Subject } from 'rxjs';
import { executeRag } from './handlers/RagHandler';
import { executeAction } from './handlers/ActionHandler';
import { executeMath } from './handlers/MathHandler';
import { executeRRM } from './handlers/RRMHandler';
import { buildExecutionPlan } from './utils/graph';
import { appState } from '../state.svelte'; 

import type { 
  AppNode, 
  AppEdge, 
  EngineContext, 
  LoggerFunction, 
  NodeId, 
  LogRole,
  NodeResult
} from '../types';

type NodeHandler = (
  node: AppNode, 
  context: EngineContext, 
  logger: LoggerFunction
) => Promise<NodeResult | void>;

const HANDLERS: Record<string, NodeHandler> = {
  'rag_memory': executeRag as unknown as NodeHandler,
  'action': executeAction as unknown as NodeHandler,
  'math_op': executeMath as unknown as NodeHandler,
  'rrm_reasoning': executeRRM as unknown as NodeHandler
};

export class GraphRunner {
  nodes: AppNode[];
  edges: AppEdge[];
  onLog: LoggerFunction;
  tensorRegistry: Map<NodeId, any>;

  constructor(nodes: AppNode[], edges: AppEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.onLog = (role: LogRole, text: string) => console.log(`[${role}] ${text}`);
    this.tensorRegistry = new Map();
  }

  setLogger(fn: LoggerFunction) { 
    this.onLog = fn; 
  }

  async run(userInput: string) {
    if (!this.nodes || this.nodes.length === 0) {
      this.onLog('system', "⚠️ Error: Graph kosong.");
      return;
    }

    let startNodes: AppNode[] = this.nodes.filter(n => n.type === 'input');

    if (startNodes.length === 0) {
      // Fallback: Cari node yang tidak punya in-edges (root nodes)
      const targetNodeIds = new Set(this.edges.map(e => e.target));
      const rootNodes = this.nodes.filter(n => !targetNodeIds.has(n.id));
      startNodes = rootNodes.length > 0 ? rootNodes : this.nodes[0] ? [this.nodes[0]] : [];
    }

    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    const executionPlan = buildExecutionPlan(
      this.nodes.map(node => node.id),
      this.edges,
      startNodes.map(node => node.id)
    );

    if (executionPlan.blockedNodeIds.length > 0) {
      this.onLog(
        'system',
        `❌ Graph memiliki dependency cycle. Eksekusi dibatalkan: ${executionPlan.blockedNodeIds.join(', ')}`
      );
      return;
    }

    // Safe environment setup
    const env: { apiKey?: string } = {}; 
    try {
      if (typeof localStorage !== 'undefined') {
        const rawApiKey = localStorage.getItem('gemini_key');
        if (rawApiKey) env.apiKey = rawApiKey;
      }
    } catch (_) {
      // Safe guard bila localStorage di-block
    }

    let context: EngineContext = {
      userInput: userInput,
      accumulatedData: "",
      env: env,
      nodeResults: new Map(),
      tensorRegistry: this.tensorRegistry,
      graph: {
        nodes: this.nodes,
        edges: this.edges
      },
      events$: new Subject() 
    };

    this.onLog('system', '🌊 Engine: Memulai eksekusi Graph Runner...');

    for (const nodeId of executionPlan.orderedNodeIds) {
      const currentNode = nodeMap.get(nodeId);
      if (!currentNode) continue;

      const handler = HANDLERS[currentNode.type];
      if (handler) {
        const result = await handler(currentNode, context, this.onLog);

        if (result !== undefined) {
          context.nodeResults.set(currentNode.id, result);
          if (appState && appState.executionResults) {
            appState.executionResults[currentNode.id] = result;
          }

          if (typeof result === 'string' && result) {
             if (context.accumulatedData) {
               context.accumulatedData += "\n\n---\n\n";
             }
             context.accumulatedData += result;
          }

          context.events$.next({
            type: 'LOG',
            nodeId: currentNode.id,
            payload: 'Node Executed'
          });
        }
      }

    }

    context.events$.complete();
  }
}
