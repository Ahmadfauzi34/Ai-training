import { generateText } from '../utils/ai.js';

export async function handleActionNode({ input, nodeData, apiKey }) {
  if (!apiKey) throw new Error("MISSING API KEY");

  const model = nodeData?.model || "gemini-2.5-flash";
  const prompt = nodeData?.prompt || "";

  // Gabung Prompt + Input
  const finalMsg = prompt ? `${prompt}\n\nUser: ${input}` : input;

  // Panggil utility
  const reply = await generateText(model, finalMsg, apiKey);
  
  return { success: true, reply };
}