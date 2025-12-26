// ALAT BANTU AI (UTILITIES)

// 1. Generate Text (Chat Biasa)
export async function generateText(model, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI diam.";
}

// 2. Generate Embedding (Vector)
export async function getEmbedding(text, apiKey) {
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

  const data = await response.json();
  if (data.error) throw new Error("Embedding Error: " + data.error.message);
  
  return data.embedding.values;
}

// 3. Matematika Vector
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}