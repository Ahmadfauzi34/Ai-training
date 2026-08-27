export const RRM_MODE_DEFINITIONS = {
  plr_proof: {
    label: 'PLR Proof State',
    description: 'Menyusun goal, premise, evidence, dan derivation sebagai proof state.',
    implemented: true
  },
  fhrr_encode: {
    label: 'FHRR Symbol Encoder',
    description: 'Mengubah simbol menjadi hypervector deterministik 8192 dimensi.',
    implemented: true
  },
  sandbox_simulation: {
    label: 'Sandbox Simulation',
    description: 'Simulasi multi-universe; dinonaktifkan sampai alokasi memorinya dapat dikonfigurasi.',
    implemented: false
  },
  fhrr_bind: {
    label: 'FHRR Bind',
    description: 'Binding dua hypervector; menunggu typed edge payload untuk input tensor.',
    implemented: true
  },
  fhrr_similarity: {
    label: 'FHRR Similarity',
    description: 'Mengukur kemiripan dua hypervector; menunggu typed edge payload.',
    implemented: true
  },
  entanglement_optimize: {
    label: 'Entanglement Optimizer',
    description: 'Optimasi relasi entity; menunggu EntityManifold input yang eksplisit.',
    implemented: false
  }
} as const;

export type RRMMode = keyof typeof RRM_MODE_DEFINITIONS;

export interface RRMHypervectorResult {
  kind: 'rrm.hypervector';
  operation: 'encode' | 'bind';
  vector: Float32Array;
  label: string;
}

export interface RRMSimilarityResult {
  kind: 'rrm.similarity';
  score: number;
  labels: [string, string];
}

export type RRMNodeResult = RRMHypervectorResult | RRMSimilarityResult;

export const RRM_MODE_OPTIONS = Object.entries(RRM_MODE_DEFINITIONS).map(([value, definition]) => ({
  value: value as RRMMode,
  ...definition
}));

const LEGACY_RRM_MODES: Record<string, RRMMode> = {
  // `sandbox` sebelumnya juga menjalankan PLR, jadi migrasi mempertahankan perilakunya.
  sandbox: 'plr_proof',
  fhrr: 'fhrr_similarity',
  entanglement: 'entanglement_optimize'
};

export function isRRMMode(value: unknown): value is RRMMode {
  return typeof value === 'string' && Object.hasOwn(RRM_MODE_DEFINITIONS, value);
}

export function normalizeRRMMode(value: unknown): RRMMode | null {
  if (isRRMMode(value)) return value;
  if (typeof value === 'string' && Object.hasOwn(LEGACY_RRM_MODES, value)) {
    return LEGACY_RRM_MODES[value] ?? null;
  }
  return null;
}

export function isRRMHypervectorResult(value: unknown): value is RRMHypervectorResult {
  return typeof value === 'object' && value !== null &&
    (value as RRMHypervectorResult).kind === 'rrm.hypervector' &&
    (value as RRMHypervectorResult).vector instanceof Float32Array;
}
