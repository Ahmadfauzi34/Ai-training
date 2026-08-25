import { FHRR } from './core/fhrr.ts';
import type { RRMHypervectorResult, RRMMode, RRMNodeResult } from '../../types/rrm.ts';

export function hashSymbol(symbol: string): number {
  let hash = 5381;
  for (let index = 0; index < symbol.length; index++) {
    hash = ((hash << 5) + hash) + symbol.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

export function executeFHRROperation(
  mode: Extract<RRMMode, 'fhrr_encode' | 'fhrr_bind' | 'fhrr_similarity'>,
  symbol: string,
  inputs: readonly RRMHypervectorResult[]
): RRMNodeResult {
  if (mode === 'fhrr_encode') {
    const normalizedSymbol = symbol.trim();
    if (!normalizedSymbol) throw new Error('FHRR Encode membutuhkan field symbol.');
    return {
      kind: 'rrm.hypervector',
      operation: 'encode',
      vector: FHRR.create(hashSymbol(normalizedSymbol)),
      label: normalizedSymbol
    };
  }

  if (inputs.length < 2) {
    throw new Error(`${mode} membutuhkan dua output hypervector yang terhubung.`);
  }
  const [left, right] = inputs as [RRMHypervectorResult, RRMHypervectorResult];

  if (mode === 'fhrr_bind') {
    return {
      kind: 'rrm.hypervector',
      operation: 'bind',
      vector: FHRR.bind(left.vector, right.vector),
      label: `${left.label} ⊗ ${right.label}`
    };
  }

  return {
    kind: 'rrm.similarity',
    score: FHRR.similarity(left.vector, right.vector),
    labels: [left.label, right.label]
  };
}
