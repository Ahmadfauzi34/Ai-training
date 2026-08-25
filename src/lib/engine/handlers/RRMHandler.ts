// src/lib/engine/handlers/RRMHandler.ts
import { RRMNodeAdapter } from '../rrm/index';
import { isRRMHypervectorResult, normalizeRRMMode, RRM_MODE_DEFINITIONS } from '../../types/rrm';
import { resolveInputData } from '../utils/io';
import { executeFHRROperation } from '../rrm/operations';
import type { RRMNode, EngineContext, LoggerFunction, RRMNodeResult } from '../../types';

export async function executeRRM(
  node: RRMNode,
  context: EngineContext,
  logger: LoggerFunction
): Promise<string | RRMNodeResult | void> {
  const mode = normalizeRRMMode(node.data.mode);
  if (!mode) {
    logger('system', `❌ RRM Error: Mode '${String(node.data.mode)}' tidak terdaftar.`);
    return;
  }
  logger('system', `🌀 Engine: Memulai eksekusi RRM Node (Mode: ${mode})...`);

  try {
    const definition = RRM_MODE_DEFINITIONS[mode];
    if (!definition.implemented) {
      logger('system', `⚠️ RRM ${definition.label}: ${definition.description}`);
      return;
    }

    if (mode === 'plr_proof') {
      const result = RRMNodeAdapter.runProofState(context.accumulatedData, context.userInput);
      logger('ai', `\n--- HASIL PENALARAN RRM (${mode.toUpperCase()}) ---\n${result}\n---------------------------`);
      return result;
    }

    if (mode === 'fhrr_encode' || mode === 'fhrr_bind' || mode === 'fhrr_similarity') {
      const inputs = Object.values(resolveInputData(node, context)).filter(isRRMHypervectorResult);
      const result = executeFHRROperation(mode, node.data.symbol ?? '', inputs);
      if (result.kind === 'rrm.similarity') {
        logger('engine', `📐 FHRR Similarity (${result.labels.join(' ↔ ')}): ${result.score.toFixed(6)}`);
      } else {
        logger('engine', `🧬 FHRR ${result.operation}: ${result.label} [${result.vector.length}D]`);
      }
      return result;
    }

    logger('system', `⚠️ RRM ${definition.label} belum memiliki executor.`);
    return;

  } catch (error: any) {
    logger('system', `❌ RRM Error: ${error.message}`);
    return;
  }
}
