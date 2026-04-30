// src/workers/handlers/rag.ts
import { getEmbedding, cosineSimilarity, generateText } from '../utils/ai';

// Definisi Dokumen Vector (Sesuai dengan yang disimpan di Dexie)
interface VectorDoc {
  text: string;
  embedding: number[];
}

interface RagInput {
  input: string;
  apiKey: string;
  knowledgeBase: VectorDoc[];
}

// --- FUNGSI 1: STANDALONE RAG ---
export async function handleRagNode({ input, apiKey, knowledgeBase }: RagInput) {
  if (!apiKey) throw new Error("MISSING API KEY");

  const userVector = await getEmbedding(input, apiKey);

  if (!knowledgeBase || knowledgeBase.length === 0) {
    return { success: true, reply: "Memory kosong." };
  }

  const scoredDocs = knowledgeBase.map(doc => ({
    text: doc.text,
    score: cosineSimilarity(userVector, doc.embedding)
  }));

  scoredDocs.sort((a, b) => b.score - a.score);
  const topContext = scoredDocs.slice(0, 3).map(d => d.text).join("\n---\n");

  const finalPrompt = `Info:\n${topContext}\n\nTanya:\n${input}`;
  const reply = await generateText("gemini-2.5-flash", finalPrompt, apiKey);

  return { success: true, reply };
}

// --- FUNGSI 2: RETRIEVE ONLY (PIPELINE MODE) ---
export async function retrieveContext({ input, apiKey, knowledgeBase }: RagInput) {
  if (!apiKey) throw new Error("MISSING API KEY");

  // 1. Embed Pertanyaan
  const userVector = await getEmbedding(input, apiKey);

  // 2. Cek Memory
  if (!knowledgeBase || knowledgeBase.length === 0) {
    return { success: true, context: "" }; 
  }

  // 3. Hitung Skor Kemiripan
  const scoredDocs = knowledgeBase.map(doc => ({
    text: doc.text,
    score: cosineSimilarity(userVector, doc.embedding)
  }));

  // 4. Ambil Top 3 Relevan
  scoredDocs.sort((a, b) => b.score - a.score);

  const topContext = scoredDocs.slice(0, 3).map(d => d.text).join("\n---\n");

  // 5. KEMBALIKAN KONTEKS SAJA
  return { success: true, context: topContext };
}