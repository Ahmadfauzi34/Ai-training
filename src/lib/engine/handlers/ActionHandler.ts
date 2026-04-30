import { askBrain } from '../../brain.ts'; // Pastikan .ts
import type { ActionNode, EngineContext, LoggerFunction } from '../../types';

// Interface Response (Biar ga any)
interface BrainResponse {
  error?: boolean;
  message?: string;
  reply?: string;
}

export async function executeAction(
  node: ActionNode, 
  context: EngineContext, 
  logger: LoggerFunction
) {
  logger('system', '🤖 Engine: Menjalankan AI Node...');

  // 👇 AMBIL DARI CONTEXT (STERIL)
  const apiKey = context.env?.apiKey;

  if (!apiKey) {
    logger('system', '❌ Error: API Key tidak ditemukan (Cek Config).');
    return;
  }

  const nodeData = { ...node.data }; 

  if (context.accumulatedData) {
    nodeData.prompt = `
    DATA PENDUKUNG:
    ${context.accumulatedData}

    INSTRUKSI:
    ${nodeData.prompt || "Jawab pertanyaan user."}
    `;
  }

  // Panggil Worker
  const rawRes = await askBrain('/process', 'POST', { 
    input: context.userInput,
    apiKey,
    nodeType: 'action',
    nodeData: nodeData
  });

  const res = rawRes as BrainResponse;

  if (res.error) {
    logger('system', `❌ Error: ${res.message}`);
  } else {
    logger('ai', res.reply || "...");
  }
}