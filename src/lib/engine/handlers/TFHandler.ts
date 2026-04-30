// src/lib/engine/handlers/TFHandler.ts

import { askBrain } from '../../brain';
import { Matrix } from '../math/Matrix';
import { resolveInputData } from '../utils/io';
import type { TFNode, EngineContext, LoggerFunction } from '../../types';

export async function executeTF(
  node: TFNode, 
  context: EngineContext, 
  logger: LoggerFunction
) {
  const op = node.data.operation || 'relu';
  logger('engine', `🏭 TF.js: Menjalankan ${op}...`);

  // 1. Ambil Input
  const inputs = resolveInputData(node, context);
  const matrixInputs = Object.values(inputs).filter((val): val is Matrix => val instanceof Matrix);

  if (matrixInputs.length === 0) {
    logger('engine', `⚠️ TF Error: Tidak ada input Matrix.`);
    return null;
  }

  const matA = matrixInputs[0];
  const matB = matrixInputs[1]; // Opsional (tergantung operasi)

  // 🛠️ PERBAIKAN DI SINI: Guard Clause
  // Kita pastikan matA benar-benar ada sebelum mengakses propertinya.
  if (!matA) {
    logger('engine', `⚠️ TF Error: Input Matrix A (Index 0) gagal dimuat.`);
    return null;
  }

  // 2. Siapkan Payload untuk Worker
  // Sekarang TypeScript tahu matA pasti defined (Matrix)
  const payload: any = {
    op: op,
    a: Array.from(matA.data), 
    shapeA: [matA.rows, matA.cols]
  };

  // Cek matB secara aman juga
  if (matB) {
    payload.b = Array.from(matB.data);
    payload.shapeB = [matB.rows, matB.cols];
  }

  // 3. Kirim ke Worker (Pabrik AI)
  const response = await askBrain('/tf/run', 'POST', payload);

  if (response.error) {
    logger('engine', `❌ TF Error: ${response.message}`);
    return null;
  }

  // 4. Terima Hasil & Bungkus jadi Matrix lagi
  const { data, shape } = response.result;
  const rows = shape[0];
  const cols = shape[1] || 1; 

  const resultMatrix = new Matrix(rows, cols);
  resultMatrix.data.set(data); 

  logger('engine', `✅ TF Output: Tensor [${rows}x${cols}] processed via WASM.`);

  return resultMatrix;
}