// src/lib/storage.js
import Dexie from 'dexie';

const db = new Dexie('V76_Neural_DB');

db.version(2).stores({
  graphs: 'id',
  settings: 'id',
  logs: '++id, role',
  vectors: '++id, fileId' 
});

const MAIN_GRAPH_ID = 'main_flow_v1';

export const storage = {

  // --- LOAD GRAPH ---
  async loadGraph() {
    try {
      const data = await db.graphs.get(MAIN_GRAPH_ID);
      return data ? data.payload : null;
    } catch (e) {
      console.error("Dexie Load Error:", e);
      return null;
    }
  },

  // --- SAVE GRAPH ---
  async saveGraph(data) {
    try {
      // Kita pakai JSON.parse(JSON.stringify()) untuk memutus referensi Proxy Svelte 5
      // Dexie kadang bingung kalau dikasih object Proxy mentah
      const cleanData = JSON.parse(JSON.stringify(data));

      await db.graphs.put({
        id: MAIN_GRAPH_ID,
        payload: cleanData,
        updatedAt: new Date()
      });
    } catch (e) {
      console.error("Dexie Save Error:", e);
    }
  },

  // --- RESET ---
  async reset() {
    await db.graphs.clear();
    await db.vectors.clear();
    window.location.reload();
  },

  // --- RAG VECTORS ---
  async saveVector(fileId, textChunk, embeddingArray) {
    await db.vectors.add({
      fileId: fileId,
      text: textChunk,
      embedding: embeddingArray,
      createdAt: new Date()
    });
  },

  async getAllVectors() {
    return await db.vectors.toArray();
  }
};