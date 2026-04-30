// src/lib/engine/handlers/MathHandler.ts

import { Matrix } from '../math/Matrix';
import { resolveInputData } from '../utils/io';
import type { MathNode, EngineContext, LoggerFunction } from '../../types';

export async function executeMath(
  node: MathNode, 
  context: EngineContext, 
  logger: LoggerFunction
) {
  const op = node.data.operation || 'multiply';

  // 1. Inisialisasi Registry
  // (Gunakan nodeResults atau tensorRegistry sesuai setup terakhirmu)
  // Disini kita pakai nodeResults agar konsisten dengan IO
  if (!context.nodeResults) {
    context.nodeResults = new Map();
  }

  // 2. MODE GENERATOR
  const defaultVals = node.data.defaultValue;
  if (defaultVals && defaultVals.length > 0) {
    const rows = node.data.rows || 1;
    const cols = node.data.cols || defaultVals.length;

    const mat = new Matrix(rows, cols);
    mat.data.set(defaultVals);

    logger('engine', `🧮 Math: Generator [${rows}x${cols}] created.`);
    return mat; 
  }

  logger('engine', `🧮 Math: Menghitung ${op}...`);

  // 3. MODE OPERASI
  const inputs = resolveInputData(node, context);

  // Ambil semua input yang berupa Matrix
  const matrixInputs = Object.values(inputs).filter((val): val is Matrix => val instanceof Matrix);

  if (matrixInputs.length === 0) {
    logger('engine', `⚠️ Math Error: Tidak ada input Matrix.`);
    return null;
  }

  // Ambil kandidat input (Bisa undefined karena strict mode)
  const matA = matrixInputs[0];
  const matB = matrixInputs[1];

  let result: Matrix | null = null;

  try {
    if (op === 'transpose') {
      // Validasi Khusus Transpose (Cukup 1 input)
      if (!matA) throw new Error("Butuh minimal 1 input untuk transpose.");
      result = matA.transpose();
    }
    else if (op === 'multiply') {
      // Validasi Khusus Binary Ops (Butuh 2 input)
      if (!matA || !matB) throw new Error("Butuh 2 input (A & B) untuk perkalian.");
      result = Matrix.multiply(matA, matB);
    }
    else if (op === 'add') {
      if (!matA || !matB) throw new Error("Butuh 2 input untuk penjumlahan.");
      result = Matrix.add(matA, matB);
    }
    else if (op === 'subtract') {
      if (!matA || !matB) throw new Error("Butuh 2 input untuk pengurangan.");
      result = Matrix.subtract(matA, matB);
    }
    else {
      throw new Error(`Operasi '${op}' belum didukung.`);
    }

    if (result) {
      logger('engine', `✅ Output: Matrix [${result.rows}x${result.cols}] calculated.`);
      return result;
    }

  } catch (e: any) {
    logger('engine', `❌ Math Exception: ${e.message}`);
  }

  return null;
}