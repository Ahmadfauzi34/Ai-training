// src/lib/engine/rrm/adapter.ts

import { Matrix } from '../math/Matrix';

/**
 * RRMAdapter: Jembatan Semi-OOP (Memory View Pattern)
 * Membungkus array linear raksasa dari Entity Component System (ECS) RRM
 * menjadi instance objek OOP (Matrix) tanpa menyalin (Zero Allocation).
 */
export class RRMAdapter {
    /**
     * Membuat objek Matrix dari bagian (slice) buffer ECS.
     * Segala modifikasi pada Matrix ini akan langsung memodifikasi buffer ECS aslinya.
     *
     * @param buffer Array 1D yang besar (misal EntityManifold.tensors)
     * @param offset Titik mulai vektor
     * @param length Panjang vektor
     * @param rows Jumlah baris untuk Matrix
     * @param cols Jumlah kolom untuk Matrix
     */
    static createView(buffer: Float32Array, offset: number, length: number, rows: number, cols: number): Matrix {
        if (rows * cols !== length) {
            throw new Error(`Dimensi Matrix (${rows}x${cols}) tidak sesuai dengan panjang buffer (${length})`);
        }

        // subarray TIDAK menyalin memori, ia hanya membuat view referensi pointer
        const view = buffer.subarray(offset, offset + length);

        // Injeksikan ke dalam kelas OOP kita
        return new Matrix(rows, cols, view);
    }
}
