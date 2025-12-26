import { Hono } from 'hono'
import { getEmbedding } from './utils/ai.js';
import { handleActionNode } from './handlers/action.js';
// 👇 UPDATE IMPORT: Tambahkan retrieveContext
import { handleRagNode, retrieveContext } from './handlers/rag.js';

const app = new Hono()

console.log("⚙️ Worker Brain: Starting (Pipeline Mode)...");

app.onError((err, c) => {
  console.error('🔥 WORKER ERROR:', err)
  return c.json({ error: true, message: err.message || 'Internal Error' }, 500)
})

app.get('/', (c) => c.json({ status: 'ONLINE', engine: 'Hono Modular' }))

// 1. ROUTE HELPER: EMBED (Bikin Vector saat simpan data)
app.post('/embed', async (c) => {
  const { text, apiKey } = await c.req.json();
  const vector = await getEmbedding(text, apiKey);
  return c.json({ success: true, vector });
});

// 2. ROUTE BARU: RETRIEVE (Cuma cari Context, JANGAN JAWAB)
// Ini dipanggil oleh ChatView saat melewati Memory Node
app.post('/retrieve', async (c) => {
  try {
    const body = await c.req.json();
    // Panggil fungsi pencari data murni
    const result = await retrieveContext(body);
    return c.json(result);
  } catch (e) {
    return c.json({ error: true, message: e.message }, 500);
  }
});

// 3. ROUTE UTAMA: PROCESS (Eksekusi Akhir / AI Mikir)
app.post('/process', async (c) => {
  try {
    const body = await c.req.json().catch(() => null)
    if (!body) return c.json({ error: true, message: "Invalid JSON" }, 400)

    const { nodeType } = body;

    // --- ROUTER ---
    
    // A. Chat Biasa / AI Node (Action)
    if (nodeType === 'action' || !nodeType) {
      const result = await handleActionNode(body);
      return c.json(result);
    }

    // B. RAG Memory (Standalone)
    // (Opsional: Kalau user menyambungkan Start langsung ke Memory tanpa AI Node)
    else if (nodeType === 'rag_memory') {
      const result = await handleRagNode(body);
      return c.json(result);
    }

    // C. Web Search (Placeholder)
    else if (nodeType === 'web_search') {
      return c.json({ success: true, reply: `[Simulasi] Mencari: ${body.input}` });
    }

    else {
      return c.json({ error: true, message: `Unknown Node Type: ${nodeType}` }, 400);
    }

  } catch (e) {
    return c.json({ error: true, message: e.message }, 500);
  }
})

// Listener Worker
self.onmessage = async (event) => {
  const { id, path, method, body } = event.data
  try {
    const req = new Request(`http://localhost${path}`, {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null,
    })
    const res = await app.fetch(req)
    if (!res.headers.get('content-type')?.includes('json')) throw new Error(`Worker Error: ${await res.text()}`)
    const data = await res.json()
    self.postMessage({ id, success: res.ok, data })
  } catch (err) {
    self.postMessage({ id, success: false, error: err.message })
  }
}