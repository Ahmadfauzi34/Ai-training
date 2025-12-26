import { getEmbedding, cosineSimilarity, generateText } from '../utils/ai.js';

// --- FUNGSI 1: STANDALONE RAG (Opsional) ---
// Dipakai jika kamu mau Node Memory langsung menjawab (gaya lama).
export async function handleRagNode({ input, apiKey, knowledgeBase }) {
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
// ✅ INI YANG KITA PAKAI UNTUK GRAPH WALKER
// Tugasnya cuma cari data, lalu kembalikan teksnya ke ChatView.
// ChatView nanti yang akan bawa teks ini ke AI Node.
export async function retrieveContext({ input, apiKey, knowledgeBase }) {
  if (!apiKey) throw new Error("MISSING API KEY");

  // 1. Embed Pertanyaan
  const userVector = await getEmbedding(input, apiKey);

  // 2. Cek Memory
  if (!knowledgeBase || knowledgeBase.length === 0) {
    return { success: true, context: "" }; // Balikin kosong kalau gak ada data
  }

  // 3. Hitung Skor Kemiripan
  const scoredDocs = knowledgeBase.map(doc => ({
    text: doc.text,
    score: cosineSimilarity(userVector, doc.embedding)
  }));

  // 4. Ambil Top 3 Relevan
  scoredDocs.sort((a, b) => b.score - a.score);

  // (Opsional) Filter yang skornya terlalu rendah biar gak halu
  // const relevantDocs = scoredDocs.filter(d => d.score > 0.5); 

  const topContext = scoredDocs.slice(0, 3).map(d => d.text).join("\n---\n");

  // 5. KEMBALIKAN KONTEKS SAJA (Bukan Jawaban AI)
  return { success: true, context: topContext };
}