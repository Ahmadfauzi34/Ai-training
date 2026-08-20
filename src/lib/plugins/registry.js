// src/lib/plugins/registry.js

import ActionNode from '../nodes/ActionNode.svelte';
import MemoryNode from '../nodes/MemoryNode.svelte';
import MathNode from '../nodes/MathNode.svelte';
import RRMNode from '../nodes/RRMNode.svelte';
import SwarmNode from '../nodes/SwarmNode.svelte';

// 2. Import Icon Factory
import { Cpu, BrainCircuit, Calculator, Orbit, Users } from 'lucide-svelte';

export const NODE_REGISTRY = {
  'action': {
    component: ActionNode,
    label: 'AI Generator',
    icon: Cpu,
    description: 'Generative AI Model (Gemini)',
    defaultData: { label: 'AI Node', model: 'gemini-2.5-flash', prompt: '' }
  },

  'rag_memory': {
    component: MemoryNode,
    label: 'Memory Bank',
    icon: BrainCircuit,
    description: 'Simpan data untuk diingat AI (RAG)',
    defaultData: { text: '' }
  },

  'math_op': {
    component: MathNode,
    label: 'Matrix Engine',
    icon: Calculator,
    description: 'Operasi Matematika / Tensor',
    defaultData: { 
      label: 'Math Node', 
      operation: 'multiply', 
      rows: 2, 
      cols: 2,
      defaultValue: [1, 0, 0, 1] 
    }
  },

  'rrm_reasoning': {
    component: RRMNode,
    label: 'RRM Reasoning',
    icon: Orbit,
    description: 'Quantum/VSA Engine untuk HDC Reasoning',
    defaultData: { label: 'RRM Reasoner', mode: 'sandbox' }
  },

  'swarm_sim': {
    component: SwarmNode,
    label: 'Swarm / Market Engine',
    icon: Users,
    description: 'Simulasi Swarm Agent & Market (10,000+ Agen)',
    defaultData: {
      label: 'Swarm Sim',
      agentCount: 10000,
      cohesion: 0.05,
      separation: 0.02,
      alignment: 0.01
    }
  }
};