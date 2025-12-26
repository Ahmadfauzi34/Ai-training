import ActionNode from '../nodes/ActionNode.svelte';
import MemoryNode from '../nodes/MemoryNode.svelte'; // <--- Import ini
import { Cpu, BrainCircuit } from 'lucide-svelte'; 

export const NODE_REGISTRY = {
  'action': {
    // ... (kode lama action node) ...
    component: ActionNode,
    label: 'AI Generator',
    icon: Cpu,
    description: 'Generative AI Model (Gemini)',
    defaultData: { label: 'AI Node', model: 'gemini-2.5-flash', prompt: '' }
  },

  // --- TAMBAHAN BARU: RAG MEMORY ---
  'rag_memory': {
    component: MemoryNode,
    label: 'Memory Bank',
    icon: BrainCircuit,
    description: 'Simpan data untuk diingat AI (RAG)',
    defaultData: { text: '' }
  }
};