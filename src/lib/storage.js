import Dexie from 'dexie';

const db = new Dexie('V76_Neural_DB');

// UPGRADE VERSI KE 2
// Kita tambah tabel 'vectors'
db.version(2).stores({
  graphs: 'id',
  settings: 'id',
  logs: '++id, role',
  files: 'id, name, type',

  // TABEL BARU UNTUK RAG:
  // id: Auto increment
  // fileId: Supaya tau ini vector punya file mana
  // (Kita tidak perlu index vector-nya karena Dexie gak bisa search vector, kita ambil semua nanti)
  vectors: '++id, fileId' 
});

const MAIN_GRAPH_ID = 'main_flow_v1';

export const storage = {

  // ... (Fungsi loadGraph, saveGraph, reset TETAP SAMA, jangan diubah) ...
  async loadGraph() { /* ...kode lama... */ },
  async saveGraph(data) { /* ...kode lama... */ },
  async reset() { /* ...kode lama... */ },

  // --- FITUR RAG (VECTOR STORAGE) ---

  // 1. Simpan Potongan Teks & Vector-nya
  async saveVector(fileId, textChunk, embeddingArray) {
    await db.vectors.add({
      fileId: fileId,
      text: textChunk,       // Potongan kalimat asli
      embedding: embeddingArray, // Array angka [0.1, -0.5, ...]
      createdAt: new Date()
    });
  },

  // 2. Ambil SEMUA Vector (Untuk dibandingkan manual/Brute Force)
  async getAllVectors() {
    return await db.vectors.toArray();
  }
};