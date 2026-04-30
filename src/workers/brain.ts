// src/workers/brain.ts
import { Hono } from 'hono';

import { getEmbedding } from './utils/ai';
import { handleActionNode } from './handlers/action';
import { handleRagNode, retrieveContext } from './handlers/rag';

const app = new Hono();

console.log("⚙️ Worker Brain: Starting (Pipeline Mode)...");

app.onError((err, c) => {
  console.error('🔥 WORKER ERROR:', err);
  return c.json({ error: true, message: err.message || 'Internal Error' }, 500);
});

app.get('/', (c) => c.json({ 
  status: 'ONLINE', 
  engine: 'Hono Modular',
}));


// --- ROUTE LAMA (RAG & AI) ---

app.post('/embed', async (c) => {
  const { text, apiKey } = await c.req.json<{ text: string, apiKey: string }>();
  const vector = await getEmbedding(text, apiKey);
  return c.json({ success: true, vector });
});

app.post('/retrieve', async (c) => {
  try {
    const body = await c.req.json<any>();
    const result = await retrieveContext(body);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: true, message: e.message }, 500);
  }
});

app.post('/process', async (c) => {
  try {
    const body = await c.req.json<any>().catch(() => null);
    if (!body) return c.json({ error: true, message: "Invalid JSON" }, 400);

    const { nodeType } = body;

    if (nodeType === 'action' || !nodeType) {
      const result = await handleActionNode(body);
      return c.json(result);
    }
    else if (nodeType === 'rag_memory') {
      const result = await handleRagNode(body);
      return c.json(result);
    }
    else if (nodeType === 'web_search') {
      return c.json({ success: true, reply: `[Simulasi] Mencari: ${body.input}` });
    }
    else {
      return c.json({ error: true, message: `Unknown Node Type: ${nodeType}` }, 400);
    }

  } catch (e: any) {
    return c.json({ error: true, message: e.message }, 500);
  }
});

// Listener Worker
const workerSelf = self as unknown as DedicatedWorkerGlobalScope;

workerSelf.onmessage = async (event: MessageEvent) => {
  const { id, path, method, body } = event.data;
  try {
    const req = new Request(`http://localhost${path}`, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null,
    });

    const res = await app.fetch(req);

    if (!res.headers.get('content-type')?.includes('json')) {
      throw new Error(`Worker Error: ${await res.text()}`);
    }

    const data = await res.json();
    workerSelf.postMessage({ id, success: res.ok, data });

  } catch (err: any) {
    workerSelf.postMessage({ id, success: false, error: err.message });
  }
};