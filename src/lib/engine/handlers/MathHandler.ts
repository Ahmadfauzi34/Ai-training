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
  if (!context.nodeResults) {
    context.nodeResults = new Map();
  }

  // 2. MODE GENERATOR
  const defaultVals = node.data.defaultValue;
  if (defaultVals && defaultVals.length > 0) {
    const rows = node.data.rows || 1;
    const cols = node.data.cols || defaultVals.length;

    // Zero Allocation Mode: Re-use Matrix if exists and dimensions match
    let mat = context.tensorRegistry?.get(node.id);
    if (!mat || mat.rows !== rows || mat.cols !== cols) {
      mat = new Matrix(rows, cols);
      if (context.tensorRegistry) {
        context.tensorRegistry.set(node.id, mat);
      }
    }

    mat.data.set(defaultVals);

    logger('engine', `🧮 Math: Generator [${rows}x${cols}] reused/created.`);
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
  // Get pre-allocated result matrix from registry if it exists
  let outMat = context.tensorRegistry?.get(node.id);

  try {
    if (op === 'transpose') {
      // Validasi Khusus Transpose (Cukup 1 input)
      if (!matA) throw new Error("Butuh minimal 1 input untuk transpose.");

      // Ensure outMat has correct dimensions, otherwise clear it to allocate a new one
      if (outMat && (outMat.rows !== matA.cols || outMat.cols !== matA.rows)) {
        outMat = undefined;
      }

      result = matA.transpose(outMat);
    }
    else if (op === 'multiply') {
      // Validasi Khusus Binary Ops (Butuh 2 input)
      if (!matA || !matB) throw new Error("Butuh 2 input (A & B) untuk perkalian.");

      if (outMat && (outMat.rows !== matA.rows || outMat.cols !== matB.cols)) {
        outMat = undefined;
      }

      result = Matrix.multiply(matA, matB, outMat);
    }
    else if (op === 'add') {
      if (!matA || !matB) throw new Error("Butuh 2 input untuk penjumlahan.");

      if (outMat && (outMat.rows !== matA.rows || outMat.cols !== matA.cols)) {
        outMat = undefined;
      }

      result = Matrix.add(matA, matB, outMat);
    }
    else if (op === 'subtract') {
      if (!matA || !matB) throw new Error("Butuh 2 input untuk pengurangan.");

      if (outMat && (outMat.rows !== matA.rows || outMat.cols !== matA.cols)) {
        outMat = undefined;
      }

      result = Matrix.subtract(matA, matB, outMat);
    }
    else {
      throw new Error(`Operasi '${op}' belum didukung.`);
    }

    // Store back into registry for next run
    if (result && context.tensorRegistry && result !== outMat) {
       context.tensorRegistry.set(node.id, result);
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