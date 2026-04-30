// src/workers/utils/ai.ts

// Interface untuk Response Gemini (Text Generation)
interface GeminiCandidate {
  content: {
    parts: { text: string }[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string };
}

// Interface untuk Response Embedding
interface EmbeddingResponse {
  embedding: { values: number[] };
  error?: { message: string };
}

// 1. Generate Text
export async function generateText(model: string, prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = (await resp.json()) as GeminiResponse;

  if (data.error) throw new Error(data.error.message);

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI diam.";
}

// 2. Generate Embedding
export async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const model = "text-embedding-004"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: text }] }
    })
  });

  const data = (await response.json()) as EmbeddingResponse;

  if (data.error) throw new Error("Embedding Error: " + data.error.message);

  return data.embedding.values;
}

// 3. Matematika Vector (Cosine Similarity)
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // Safety check untuk panjang array
  const length = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < length; i++) {
    const a = vecA[i]!; // Non-null assertion aman karena loop
    const b = vecB[i]!;

    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}