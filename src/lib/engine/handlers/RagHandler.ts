import { askBrain } from '../../brain.ts'; // Pastikan .ts
import { storage } from '../../storage.js'; // storage masih .js tidak apa-apa
import type { MemoryNode, EngineContext, LoggerFunction } from '../../types';

interface RetrieveResponse {
  context?: string;
  error?: boolean;
}

export async function executeRag(
  node: MemoryNode, 
  context: EngineContext, 
  logger: LoggerFunction
): Promise<string> {

  const label = node.data.label || 'Memory';
  logger('system', `🔍 Engine: Scan ${label}...`);

  // 👇 AMBIL DARI CONTEXT (STERIL)
  const apiKey = context.env?.apiKey;

  if (!apiKey) {
    logger('system', '⚠️ API Key missing. Memory scan skipped.');
    return "";
  }

  const knowledgeBase = await storage.getAllVectors();

  const rawRes = await askBrain('/retrieve', 'POST', {
    input: context.userInput,
    apiKey,
    knowledgeBase
  });

  const res = rawRes as RetrieveResponse;

  if (res.context) {
    return `[Sumber: ${label}]\n${res.context}\n---\n`;
  }

  return "";
}