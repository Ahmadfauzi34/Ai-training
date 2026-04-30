// src/lib/engine/GraphRunner.ts
import { Subject } from 'rxjs'; // ✅ Import RxJS
import { executeRag } from './handlers/RagHandler';
import { executeAction } from './handlers/ActionHandler';
import { executeMath } from './handlers/MathHandler';
import { appState } from '../state.svelte'; 

import type { 
  AppNode, 
  AppEdge, 
  EngineContext, 
  LoggerFunction, 
  NodeId, 
  LogRole,
  ActionNode 
} from '../types';

// Definisi Handler
type NodeHandler = (
  node: AppNode, 
  context: EngineContext, 
  logger: LoggerFunction
) => Promise<string | void>;

const HANDLERS: Record<string, NodeHandler> = {
  'rag_memory': executeRag as unknown as NodeHandler,
  'action': executeAction as unknown as NodeHandler,
  'math_op': executeMath as unknown as NodeHandler

};

export class GraphRunner {
  nodes: AppNode[];
  edges: AppEdge[];
  onLog: LoggerFunction;

  constructor(nodes: AppNode[], edges: AppEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.onLog = (role: LogRole, text: string) => console.log(`[${role}] ${text}`);
  }

  setLogger(fn: LoggerFunction) { 
    this.onLog = fn; 
  }

  async run(userInput: string) {
    const startNode = this.nodes.find((n): n is AppNode & { type: 'input' } => n.type === 'input');

    if (!startNode) {
      this.onLog('system', "❌ Error: Tidak ada Node Start.");
      return;
    }

    // Setup Environment
    const rawApiKey = localStorage.getItem('gemini_key');
    const env: { apiKey?: string } = {}; 
    if (rawApiKey) {
      env.apiKey = rawApiKey;
    }

    // 👇 UPDATE CONTEXT SETUP (YANG BERSIH)
    let context: EngineContext = {
      userInput: userInput,
      accumulatedData: "",
      env: env,

      // Inisialisasi Map
      nodeResults: new Map(),
      tensorRegistry: new Map(),

      // Snapshot Graph
      graph: {
        nodes: this.nodes,
        edges: this.edges
      },

      // ✅ Inisialisasi Stream RxJS
      events$: new Subject() 
    };

    // --- MULAI TRAVERSAL ---

    let queue: AppNode[] = [startNode];
    let visited = new Set<NodeId>([startNode.id]);
    let deferredAiNode: ActionNode | null = null; 

    this.onLog('system', '🌊 Engine: Memulai penelusuran...');

    while (queue.length > 0) {
      const currentNode = queue.shift(); 
      if (!currentNode) continue; 

      // LOGIKA 1: Tahan AI Node
      if (currentNode.type === 'action') {
        deferredAiNode = currentNode as ActionNode;
      } 
      // LOGIKA 2: Jalankan Handler Lain
      else {
        const handler = HANDLERS[currentNode.type];
        if (handler) {
          const result = await handler(currentNode, context, this.onLog);

          // Simpan Hasil ke Context & State Global (Visualisasi)
          if (result !== undefined) {
            context.nodeResults.set(currentNode.id, result);
            appState.executionResults[currentNode.id] = result; // Update UI

            // Legacy RAG support
            if (typeof result === 'string' && result) {
              context.accumulatedData += result;
            }

            // Contoh Emit Event RxJS (Opsional)
            context.events$.next({
              type: 'LOG',
              nodeId: currentNode.id,
              payload: 'Node Executed'
            });
          }
        }
      }

      // LOGIKA 3: Traversal
      const outgoingEdges = this.edges.filter(e => e.source === currentNode.id);

      for (const edge of outgoingEdges) {
        const nextNode = this.nodes.find(n => n.id === edge.target);

        if (nextNode && !visited.has(nextNode.id)) {
          visited.add(nextNode.id);
          queue.push(nextNode);
        }
      }
    }

    // EKSEKUSI FINAL AI
    if (deferredAiNode) {
      await executeAction(deferredAiNode, context, this.onLog);
    }

    // Selesai: Complete Stream
    context.events$.complete();
  }
}