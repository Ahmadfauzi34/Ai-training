// src/workers/brain.ts
import { Hono } from 'hono';
import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

import { getEmbedding } from './utils/ai';
import { handleActionNode } from './handlers/action';
import { handleRagNode, retrieveContext } from './handlers/rag';

const app = new Hono();

console.log("⚙️ Worker Brain: Starting (Pipeline Mode)...");

// --- 1. SETUP TENSORFLOW WASM ---
const initTF = async () => {
  console.log("⚙️ TF.js: Initializing WASM Backend...");

  // Arahkan ke folder public tempat kita copy file .wasm tadi
  setWasmPaths('/tfjs-wasm/'); 

  await tf.setBackend('wasm');
  await tf.ready();

  console.log(`🚀 TF.js Ready! Backend: ${tf.getBackend()}`);
};

// Jalankan Init (Fire and Forget)
initTF();

app.onError((err, c) => {
  console.error('🔥 WORKER ERROR:', err);
  return c.json({ error: true, message: err.message || 'Internal Error' }, 500);
});

app.get('/', (c) => c.json({ 
  status: 'ONLINE', 
  engine: 'Hono Modular + TF.js',
  backend: tf.getBackend() 
}));

// --- 2. ROUTE BARU: TENSORFLOW ENGINE ---
app.post('/tf/run', async (c) => {
  try {
    // Terima payload: op, a, b, shapeA, shapeB
    const body = await c.req.json<{ 
      op: string; 
      a: number[]; 
      b?: number[]; 
      shapeA: [number, number]; 
      shapeB?: [number, number];
    }>();

    // tf.tidy() = Garbage Collector Otomatis! 
    // Mencegah memory leak di WASM
    const resultData = tf.tidy(() => {

      // Reconstruct Tensor A
      const tensorA = tf.tensor(body.a, body.shapeA);
      let result: tf.Tensor;

      // Eksekusi Operasi
      if (body.op === 'matmul') {
        if (!body.b || !body.shapeB) throw new Error("MatMul butuh input B");
        const tensorB = tf.tensor(body.b, body.shapeB);
        result = tensorA.matMul(tensorB);
      } 
      else if (body.op === 'add') {
        if (!body.b || !body.shapeB) throw new Error("Add butuh input B");
        const tensorB = tf.tensor(body.b, body.shapeB);
        result = tensorA.add(tensorB);
      }
      else if (body.op === 'relu') {
        result = tensorA.relu();
      }
      else if (body.op === 'sigmoid') {
        result = tensorA.sigmoid();
      }
      else {
        throw new Error(`Operasi TF '${body.op}' belum didukung.`);
      }

      // Kembalikan Data Mentah (Array) & Shape
      return {
        data: Array.from(result.dataSync()),
        shape: result.shape
      };
    });

    return c.json({ success: true, result: resultData });

  } catch (e: any) {
    return c.json({ error: true, message: e.message }, 500);
  }
});

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