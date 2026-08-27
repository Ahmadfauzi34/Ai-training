import { EntityManifold } from '../core/EntityManifold.ts';
import { type TensorVector, GLOBAL_DIMENSION, MAX_ENTITIES, MAX_HYPOTHESES, MAX_SEEDS } from '../core/config.ts';
import { FHRR } from '../core/fhrr.ts';

/**
 * 🧩 ENTITY SEGMENTER (Fase 2: The Perception Layer)
 * Memindahkan Holographic Stream 1D dari UniversalManifold ke dalam
 * EntityManifold raksasa (Structure of Arrays) tanpa memuja OOP.
 */
export class EntitySegmenter {

    /**
     * Membangun Cognitive Entities dari aliran spektrum 1D menggunakan konsep
     * "Attractor Basin" (Cosine Similarity Clustering) dan memuatnya ke dalam ECS Manifold.
     *
     * @param stream Map kunci spasial -> Vektor partikel
     * @param manifold Buffer SoA raksasa (Pre-allocated Array)
     * @param similarityThreshold Batas kemiripan (0.0 - 1.0) untuk menggabungkan dua partikel.
     */
    public segmentStream(stream: Map<string, TensorVector>, manifold: EntityManifold, similarityThreshold: number = 0.85): void {
        const entries = Array.from(stream.entries());
        const visited = new Set<string>();

        // Simpan dimensi global agar MultiverseSandbox bisa menghitung tabrakan absolut
        let globalWidth = 1;
        let globalHeight = 1;

        // Parsing ID kunci (x,y_tToken)
        const parseKey = (key: string) => {
            const parts = key.split('_t');
            const coords = parts[0]!.split(',');
            return { x: parseInt(coords[0]!), y: parseInt(coords[1]!), token: parseInt(parts[1]!) };
        };

        let entityCounter = 1;

        const tokenGroups = new Map<number, { key: string, tensor: TensorVector, parsed: {x:number, y:number, token:number} }[]>();

        for (let i = 0; i < entries.length; i++) {
            const [key, tensor] = entries[i]!;
            const parsed = parseKey(key);
            let group = tokenGroups.get(parsed.token);
            if (!group) {
                group = [];
                tokenGroups.set(parsed.token, group);
            }
            group[group.length] = { key, tensor, parsed };

            globalWidth = Math.max(globalWidth, parsed.x + 1);
            globalHeight = Math.max(globalHeight, parsed.y + 1);
        }

        manifold.globalWidth = globalWidth;
        manifold.globalHeight = globalHeight;

        for (const [token, groupEntries] of tokenGroups.entries()) {
            for (let i = 0; i < groupEntries.length; i++) {
                const { key: keyA, tensor: tensorA, parsed: parsedA } = groupEntries[i]!;

                if (visited.has(keyA)) continue;

                let minX = parsedA.x;
                let maxX = parsedA.x;
                let minY = parsedA.y;
                let maxY = parsedA.y;

                const eIndex = manifold.allocateEntity();
                if (eIndex < 0) break;

                const eTensor = manifold.getTensor(eIndex);

                manifold.ids[eIndex] = `E_${entityCounter++}`;
                manifold.tokens[eIndex] = parsedA.token;
                manifold.masses[eIndex] = 1.0;

                this.addVectorInPlace(eTensor, tensorA);
                visited.add(keyA);

                let sumX = parsedA.x;
                let sumY = parsedA.y;
                let membersCount = 1;

                for (let j = i + 1; j < groupEntries.length; j++) {
                    const { key: keyB, tensor: tensorB, parsed: parsedB } = groupEntries[j]!;

                    if (visited.has(keyB)) continue;

                    const sim = FHRR.similarity(eTensor, tensorB);

                    if (sim >= similarityThreshold) {
                        this.addVectorInPlace(eTensor, tensorB);
                        visited.add(keyB);

                        sumX += parsedB.x;
                        sumY += parsedB.y;
                        membersCount++;
                        manifold.masses[eIndex] += 1.0;

                        minX = Math.min(minX, parsedB.x);
                        maxX = Math.max(maxX, parsedB.x);
                        minY = Math.min(minY, parsedB.y);
                        maxY = Math.max(maxY, parsedB.y);
                    }
                }

                manifold.spansX[eIndex] = (maxX - minX + 1);
                manifold.spansY[eIndex] = (maxY - minY + 1);

                manifold.centersX[eIndex] = sumX / membersCount;
                manifold.centersY[eIndex] = sumY / membersCount;

                manifold.normalizeL2(eIndex);
            }
        }
    }

    private addVectorInPlace(target: TensorVector, source: TensorVector): void {
        for (let i = 0; i < GLOBAL_DIMENSION; i++) {
            target[i]! += source[i]!;
        }
    }
}
