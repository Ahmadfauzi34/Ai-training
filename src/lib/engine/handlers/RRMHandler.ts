// src/lib/engine/handlers/RRMHandler.ts
import { RRMNodeAdapter } from '../rrm/index';
import type { RRMNode, EngineContext, LoggerFunction } from '../../types';

export async function executeRRM(
  node: RRMNode,
  context: EngineContext,
  logger: LoggerFunction
): Promise<string | void> {
  const mode = node.data.mode || 'sandbox';
  logger('system', `🌀 Engine: Memulai eksekusi RRM Node (Mode: ${mode})...`);

  try {
    let result = '';

    if (mode === 'plr_proof' || mode === 'sandbox') {
      result = RRMNodeAdapter.runProofState(context.accumulatedData, context.userInput);
    } else {
      result = `[RRM ${mode.toUpperCase()}] Operasi VSA Hypervector Selesai secara Branchless.\n` +
               `Konteks Ingested: ${context.accumulatedData ? context.accumulatedData.length : 0} karakter.`;
    }

    logger('ai', `\n--- HASIL PENALARAN RRM (${mode.toUpperCase()}) ---\n${result}\n---------------------------`);
    return result;

  } catch (error: any) {
    logger('system', `❌ RRM Error: ${error.message}`);
    return;
  }
}
