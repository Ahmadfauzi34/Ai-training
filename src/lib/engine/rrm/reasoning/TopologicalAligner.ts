import { EntityManifold } from '../core/EntityManifold.ts';
import type { TensorVector } from '../core/config.ts';
import { GLOBAL_DIMENSION, MAX_ENTITIES, MAX_HYPOTHESES, MAX_SEEDS } from '../core/config.ts';
import { FHRR } from '../core/fhrr.ts';
import { AxiomGenerator } from './AxiomGenerator.ts';
import { UniversalManifold } from '../perception/UniversalManifold.ts';
import { CoreSeeds } from '../core/CoreSeeds.ts';

export interface AlignmentMatch {
    sourceIndex: number;
    targetIndex: number; // -1 jika tidak ada target
    similarity: number;
    deltaTensor: TensorVector | null; // Selisih vektor (Pergerakan konseptual/spasial)
    deltaX: number; // Kinetika skalar X (Untuk O(1) render updates)
    deltaY: number; // Kinetika skalar Y (Untuk O(1) render updates)
    axiomType: string; // IDENTITY, MIRROR_X, MIRROR_Y, MIRROR_XY
    physicsTier: number; // 0: INSTANT, 1: DOMINO, 2: SWARM
}

/**
 * 🎭 TOPOLOGICAL ALIGNER (Fase 4: The Cortex)
 * Melacak entitas dari Manifold Input ke Manifold Output secara agnostik
 * tanpa memuja Array of Objects (SoA Ready).
 */
export class TopologicalAligner {
    private perceiver: UniversalManifold;

    // Memory Pool O(1) untuk menghindari Garbage Collection pada setiap panggilan align()
    private sourceIndicesBuffer: Int32Array;

    constructor(perceiver: UniversalManifold) {
        this.perceiver = perceiver;
        this.sourceIndicesBuffer = new Int32Array(MAX_ENTITIES);
    }

    private _matchesBuffer: AlignmentMatch[] = new Array(MAX_ENTITIES);

    public align(sourceManifold: EntityManifold, targetManifold: EntityManifold, enableAdvancedPhysics: boolean = false): AlignmentMatch[] {
        let matchCount = 0;
        const matches = this._matchesBuffer;
        const usedTargets = new Set<number>();

        let sourceCount = 0;
        for(let i = 0; i < sourceManifold.activeCount; i++) {
            if (sourceManifold.masses[i]! > 0) {
                this.sourceIndicesBuffer[sourceCount++] = i;
            }
        }

        const activeIndices = this.sourceIndicesBuffer.subarray(0, sourceCount);

        activeIndices.sort((a, b) => {
            const massDiff = sourceManifold.masses[b]! - sourceManifold.masses[a]!;
            if (massDiff !== 0) return massDiff;
            return a - b;
        });

        for (let i = 0; i < sourceCount; i++) {
            const sIdx = activeIndices[i]!;
            let bestTargetIdx = -1;
            let bestSim = -999.0;
            let bestAxiomType = "IDENTITY";
            let bestDx = 0.0;
            let bestDy = 0.0;

            const srcTensor = sourceManifold.getTensor(sIdx);
            const srcMass = sourceManifold.masses[sIdx]!;
            const srcRelX = sourceManifold.centersX[sIdx]!;
            const srcRelY = sourceManifold.centersY[sIdx]!;

            targetManifold.forEachActive((tIdx, tgtMass, tgtRelX, tgtRelY) => {
                if (usedTargets.has(tIdx)) return;

                const tgtTensor = targetManifold.getTensor(tIdx);

                const dx = tgtRelX - srcRelX;
                const dy = tgtRelY - srcRelY;

                const translationAxiom = AxiomGenerator.generateTranslationAxiom(
                    dx, dy,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const alignedSrcTensor = FHRR.bind(srcTensor, translationAxiom);

                const probeIdentity = alignedSrcTensor;

                const probeMirrorX = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 0.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const probeMirrorY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    0.0, 1.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const probeMirrorXY = AxiomGenerator.applyReflection(
                    alignedSrcTensor, tgtRelX, tgtRelY,
                    1.0, 1.0,
                    CoreSeeds.X_AXIS_SEED, CoreSeeds.Y_AXIS_SEED
                );

                const simId = FHRR.similarity(probeIdentity, tgtTensor);
                const simMx = FHRR.similarity(probeMirrorX, tgtTensor);
                const simMy = FHRR.similarity(probeMirrorY, tgtTensor);
                const simMxy = FHRR.similarity(probeMirrorXY, tgtTensor);

                const maxSim = Math.max(simId, simMx, simMy, simMxy);

                const massRatio = Math.min(srcMass, tgtMass) / (Math.max(srcMass, tgtMass) + 1e-15);
                const combinedScore = (maxSim * 0.7) + (massRatio * 0.3);

                if (combinedScore > bestSim) {
                    bestSim = combinedScore;
                    bestTargetIdx = tIdx;
                    bestDx = dx;
                    bestDy = dy;

                    if (maxSim === simId) bestAxiomType = `TRANSLATE_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMx) bestAxiomType = `MIRROR_X+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else if (maxSim === simMy) bestAxiomType = `MIRROR_Y+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;
                    else bestAxiomType = `MIRROR_XY+TRANS_${dx.toFixed(2)}_${dy.toFixed(2)}`;

                    const srcToken = sourceManifold.tokens[sIdx];
                    const tgtToken = targetManifold.tokens[tIdx];
                    if (srcToken !== tgtToken) {
                        bestAxiomType += `+COLOR(${srcToken}->${tgtToken})`;
                    }
                }
            });

            let delta: TensorVector | null = null;

            if (bestTargetIdx !== -1) {
                usedTargets.add(bestTargetIdx);

                const srcToken = sourceManifold.tokens[sIdx]!;
                const tgtToken = targetManifold.tokens[bestTargetIdx]!;

                if (srcToken !== tgtToken) {
                    const srcColorPhase = FHRR.fractionalBind(CoreSeeds.COLOR_SEED, srcToken);
                    const tgtColorPhase = FHRR.fractionalBind(CoreSeeds.COLOR_SEED, tgtToken);
                    delta = FHRR.bind(tgtColorPhase, FHRR.inverse(srcColorPhase));
                } else {
                    delta = new Float32Array(GLOBAL_DIMENSION);
                    delta[0] = 1.0; delta[GLOBAL_DIMENSION] = 1.0;
                }
            }

            matches[matchCount++] = {
                sourceIndex: sIdx,
                targetIndex: bestTargetIdx,
                similarity: bestSim,
                deltaTensor: delta,
                deltaX: bestDx,
                deltaY: bestDy,
                axiomType: bestAxiomType,
                physicsTier: 0
            };
        }

        const finalMatches = matches.slice(0, matchCount);
        this.applyMultiTierPhysicsDetection(finalMatches, sourceManifold);

        return finalMatches;
    }

    private applyMultiTierPhysicsDetection(matches: AlignmentMatch[], sourceManifold: EntityManifold): void {
        const momentumCounts = new Map<string, number>();

        for (const match of matches) {
            if (match.targetIndex === -1) continue;
            if (Math.abs(match.deltaX) < 0.001 && Math.abs(match.deltaY) < 0.001) continue;

            const key = `${match.deltaX.toFixed(3)}_${match.deltaY.toFixed(3)}`;
            momentumCounts.set(key, (momentumCounts.get(key) || 0) + 1);
        }

        const SWARM_THRESHOLD = 3;

        for (const match of matches) {
            if (match.targetIndex === -1) continue;
            if (Math.abs(match.deltaX) < 0.001 && Math.abs(match.deltaY) < 0.001) continue;

            const key = `${match.deltaX.toFixed(3)}_${match.deltaY.toFixed(3)}`;
            const count = momentumCounts.get(key) || 0;

            if (count >= SWARM_THRESHOLD) {
                match.physicsTier = 2;
                if (!match.axiomType.startsWith("SWARM_")) match.axiomType = `SWARM_${match.axiomType}`;
            } else {
                match.physicsTier = 1;
            }
        }
    }
}
