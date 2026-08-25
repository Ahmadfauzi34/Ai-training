// src/lib/state.svelte.ts
import { storage } from './storage.js'; 
import { type V76State, type AppNode, type AppEdge, type LogRole, asNodeId } from './types';

const defaultNodes: AppNode[] = [
  {
    id: asNodeId('start-1'), 
    type: 'input',
    data: { label: 'START SYSTEM', inputType: 'text' },
    position: { x: 50, y: 100 }, 
    sourcePosition: 'right', 
    style: "background: #88c0d0; color: #2e3440; border: none; font-weight: bold; width: 120px; text-align: center; border-radius: 8px;"
  },
  {
    id: asNodeId('ai-node-1'), 
    type: 'action',
    data: { 
      label: 'AI Brain', 
      model: 'gemini-2.5-flash', 
      prompt: 'Kamu adalah asisten V76 yang sangat patuh.' 
    },
    position: { x: 400, y: 80 },
  },
  {
    id: asNodeId('rrm-node-1'),
    type: 'rrm_reasoning',
    data: {
      label: 'RRM Reasoner',
      mode: 'plr_proof'
    },
    position: { x: 700, y: 80 },
  }
];

export const appState = $state<V76State>({
  isReady: false,
  isStorageError: false,
  status: 'idle',
  activeTab: 'chat',
  lastChange: Date.now(),
  logs: [{ role: 'system', text: 'System V76 Initializing...', timestamp: Date.now() }],
  input: '',
  nodes: [],
  edges: [],

  // 👇 PERBAIKAN PENTING: Tambahkan ini!
  // Ini wadah untuk menyimpan hasil perhitungan Matrix agar bisa tampil di UI.
  executionResults: {} 
});

export async function initSystem() {
  try {
    const savedData = await storage.loadGraph();

    if (savedData) {
      appState.nodes = (savedData.nodes as AppNode[]) || defaultNodes;
      appState.edges = (savedData.edges as AppEdge[]) || [];
      addLog('system', '✅ Database Loaded.');
    } else {
      appState.nodes = defaultNodes;
      appState.edges = [];
      addLog('system', 'ℹ️ New Session Started.');
    }

    appState.isReady = true; 

  } catch (e) {
    console.error("Init Error:", e);
    appState.isStorageError = true; 
    appState.status = 'error';
    addLog('system', '❌ Gagal memuat database. Auto-save DIMATIKAN.');

    appState.nodes = defaultNodes;
    appState.isReady = true; 
  }
}

export function addLog(role: LogRole, text: string) {
  appState.logs = [...appState.logs, { role, text, timestamp: Date.now() }];
}

export function setStatus(msg: 'idle' | 'running' | 'error') {
  appState.status = msg;
}
