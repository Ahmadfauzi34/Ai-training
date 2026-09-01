import type { TensorVector } from '../core/config.ts';
import { GLOBAL_DIMENSION, MAX_ENTITIES, MAX_HYPOTHESES, MAX_SEEDS } from '../core/config.ts';
import { EntityManifold } from '../core/EntityManifold.ts';
import { MultiverseSandbox } from './MultiverseSandbox.ts';
import type { Hypothesis } from './HamiltonianPruner.ts';

export interface GroverConfig {
  readonly dimensions: number;
  readonly searchSpaceSize: number;
  readonly temperature: number;
  readonly freeEnergyThreshold: number;
  readonly maxIterations: number;
}

/**
 * ============================================================================
 * GROVER DIFFUSION SYSTEM (Real-Valued VSA/FHRR Implementation)
 * ============================================================================
 * Menjalankan algoritma Grover (Amplitude Amplification) menggunakan
 * Termodinamika Berkelanjutan (Continuous Free Energy Oracle).
 * Beroperasi secara Zero-GC dan Math-Branchless menggunakan Array of Structures.
 */
export class GroverDiffusionSystem {
  public config: GroverConfig;

  // SoA Layout untuk State Grover
  public amplitudes: Float32Array;
  public multipliers: Float32Array;
  public energies: Float32Array;

  // Buffer sementara untuk kalkulasi Inversion About Mean
  private meanBuffer: Float32Array;

  // Referensi ke Alam Semesta Simulasi untuk Evaluasi Oracle
  private sandbox: MultiverseSandbox;

  constructor(sandbox: MultiverseSandbox, config: GroverConfig) {
    this.sandbox = sandbox;
    this.config = config;

    const totalSize = config.searchSpaceSize * config.dimensions;

    this.amplitudes = new Float32Array(totalSize);
    this.multipliers = new Float32Array(config.searchSpaceSize);
    this.energies = new Float32Array(config.searchSpaceSize);

    this.meanBuffer = new Float32Array(config.dimensions);
  }

  /**
   * MENGINISIALISASI "WARM START" (Hybrid ARC Architecture)
   * Berbeda dengan Grover konvensional (1/√N), kita memulai dengan
   * amplitudo awal proporsional terhadap keyakinan awal (Skor MCTS).
   */
  public warmStart(candidates: any[]): void {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    const D = this.config.dimensions;

    this.amplitudes.fill(0.0);

    let totalInitialEnergySq = 0.0;
    for (let i = 0; i < N; i++) {
      const energy = candidates[i]!.energy;
      const baseAmp = Math.max(0.001, Math.sqrt(energy));
      totalInitialEnergySq += baseAmp * baseAmp;
    }

    const normalizationFactor = 1.0 / Math.sqrt(totalInitialEnergySq + 1e-15);

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      const ruleTensor = candidates[i]!.tensor_rule || candidates[i]!.tensor;
      const energy = candidates[i]!.energy;

      const amp = Math.sqrt(energy) * normalizationFactor;

      for (let d = 0; d < D; d++) {
        this.amplitudes[baseIdx + d] = ruleTensor[d]! * amp;
      }
    }
  }

  /**
   * CONTINUOUS FREE ENERGY ORACLE
   */
  public evaluateOracle(candidates: any[], trainStates: { in: EntityManifold, out: EntityManifold }[]): void {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    const D = this.config.dimensions;
    const T = this.config.temperature;
    const threshold = this.config.freeEnergyThreshold;

    for (let i = 0; i < N; i++) {
      const candidate = candidates[i]!;
      let totalFreeEnergy = 0.0;

      const deltaX = candidate.deltaX || 0.0;
      const deltaY = candidate.deltaY || 0.0;
      const tensorRule = candidate.tensor_rule || candidate.tensor;
      const physicsTier = candidate.physicsTier || 0;

      for (let s = 0; s < trainStates.length; s++) {
        const state = trainStates[s]!;
        this.sandbox.cloneToUniverse(state.in, 0);
        this.sandbox.applyAxiom(0, tensorRule, deltaX, deltaY, physicsTier);
        totalFreeEnergy += this.sandbox.calculateFreeEnergy(0, state.out);
      }

      this.energies[i] = totalFreeEnergy;

      const score = 0.5 * (1.0 + Math.tanh((threshold - totalFreeEnergy) / T));

      this.multipliers[i] = 1.0 - (2.0 * score);
    }

    for (let i = 0; i < N; i++) {
      const mult = this.multipliers[i]!;
      const baseIdx = i * D;

      for (let d = 0; d < D; d += 8) {
        this.amplitudes[baseIdx + d]! *= mult;
        this.amplitudes[baseIdx + d + 1]! *= mult;
        this.amplitudes[baseIdx + d + 2]! *= mult;
        this.amplitudes[baseIdx + d + 3]! *= mult;
        this.amplitudes[baseIdx + d + 4]! *= mult;
        this.amplitudes[baseIdx + d + 5]! *= mult;
        this.amplitudes[baseIdx + d + 6]! *= mult;
        this.amplitudes[baseIdx + d + 7]! *= mult;
      }
    }
  }

  public applyDiffusion(N: number): void {
    const D = this.config.dimensions;
    const amps = this.amplitudes;
    const meanBuf = this.meanBuffer;

    meanBuf.fill(0);
    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        meanBuf[d]! += amps[baseIdx + d]!;
      }
    }

    const invN = 1.0 / N;
    for (let d = 0; d < D; d++) {
      meanBuf[d]! *= invN;
    }

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      for (let d = 0; d < D; d++) {
        const mean = meanBuf[d]!;
        amps[baseIdx + d] = 2.0 * mean - amps[baseIdx + d]!;
      }
    }

    this.thermalNormalize(N);
  }

  private thermalNormalize(N: number): void {
    const D = this.config.dimensions;
    const amps = this.amplitudes;
    const T = this.config.temperature;

    const norms = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      let sumSq = 0.0;

      for (let d = 0; d < D; d += 4) {
        const a0 = amps[baseIdx + d]!;
        const a1 = amps[baseIdx + d + 1]!;
        const a2 = amps[baseIdx + d + 2]!;
        const a3 = amps[baseIdx + d + 3]!;
        sumSq += a0*a0 + a1*a1 + a2*a2 + a3*a3;
      }

      norms[i] = Math.sqrt(sumSq);
    }

    for (let i = 0; i < N; i++) {
      const baseIdx = i * D;
      const norm = norms[i]! + 1e-10;

      const thermalFactor = Math.exp(-norm / T);
      const scale = 1.0 / (norm + thermalFactor);

      for (let d = 0; d < D; d++) {
        amps[baseIdx + d]! *= scale;
      }
    }
  }

  public search(candidates: any[], trainStates: { in: EntityManifold, out: EntityManifold }[]): any | null {
    const N = Math.min(this.config.searchSpaceSize, candidates.length);
    if (N === 0) return null;

    this.warmStart(candidates);

    const iterations = Math.min(this.config.maxIterations, Math.ceil((Math.PI / 4) * Math.sqrt(N)));

    for (let k = 0; k < iterations; k++) {
      this.evaluateOracle(candidates, trainStates);
      this.applyDiffusion(N);
    }

    let maxAmp = -9999.0;
    let winnerIdx = 0;

    for (let i = 0; i < N; i++) {
      const baseIdx = i * this.config.dimensions;
      let stateEnergy = 0.0;

      for (let d = 0; d < this.config.dimensions; d++) {
        const a = this.amplitudes[baseIdx + d]!;
        stateEnergy += a * a;
      }

      const isGreater = Number(stateEnergy > maxAmp);
      maxAmp = (stateEnergy * isGreater) + (maxAmp * (1 - isGreater));
      winnerIdx = (i * isGreater) + (winnerIdx * (1 - isGreater));
    }

    return candidates[winnerIdx] || null;
  }
}
