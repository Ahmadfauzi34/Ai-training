// src/lib/engine/utils/io.ts

import type { AppNode, EngineContext, AppEdge } from '../../types';

export function resolveInputData(node: AppNode, ctx: EngineContext): Record<string, any> {
  const inputs: Record<string, any> = {};

  // 1. Ambil Default Value
  if (node.data) {
    Object.assign(inputs, node.data);
  }

  // 2. Cari Kabel yang nyolok ke Node ini
  const incomingEdges = ctx.graph.edges.filter((edge: AppEdge) => edge.target === node.id);

  // 3. Ambil Data dari Kabel
  for (const edge of incomingEdges) {
    const sourceData = ctx.nodeResults?.get(edge.source);

    if (sourceData !== undefined) {
      // 🛠️ PERBAIKAN DI SINI: Mencegah Overwrite!

      // Jika kabel punya targetHandle spesifik (misal 'a' atau 'b'), pakai itu.
      // TAPI, jika tidak ada (masuk ke body node), kita buat key unik pakai ID pengirim.
      // Ini menjamin Matrix A dan Matrix B tersimpan semua, tidak saling timpa.
      const handleName = edge.targetHandle || `input_from_${edge.source}`;

      inputs[handleName] = sourceData;
    }
  }

  return inputs;
}