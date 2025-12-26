// src/lib/state.svelte.js
// Updated: Support Async Storage (Persiapan Dexie.js)

import { storage } from './storage.js'; // Pastikan file storage.js sudah dibuat

// Data Default (Dipakai jika Database kosong/pengguna baru)
const defaultNodes = [
  {
    id: 'start-1',
    type: 'input',
    data: { label: 'START SYSTEM' },
    position: { x: 250, y: 20 },
    style: "background: #88c0d0; color: #2e3440; border: none; font-weight: bold; width: 120px; text-align: center; border-radius: 8px;"
  },
  {
    id: 'ai-node-1', 
    type: 'action',
    data: { 
      label: 'AI Brain', 
      model: 'gemini-2.5-flash', 
      prompt: 'Kamu adalah asisten V76 yang sangat patuh.' 
    },
    position: { x: 220, y: 150 },
  }
];

export const appState = $state({
  // --- STATE SISTEM ---
  isReady: false,       // Penanda: Apakah DB sudah selesai dimuat?
  status: 'Booting...', // Pesan status di footer
  activeTab: 'chat',    // Tab yang aktif

  // --- DATA APLIKASI ---
  logs: [{ role: 'system', text: 'System V76 Initializing...' }],
  input: '',
  
  // Kita mulai dengan array kosong dulu.
  // Nanti diisi oleh fungsi initSystem()
  nodes: [], 
  edges: []
});

// --- FUNGSI UTAMA (ASYNC) ---
// Dipanggil oleh App.svelte saat pertama kali buka
export async function initSystem() {
  try {
    setStatus('Loading Database...');
    
    // Panggil Adapter Storage (Pura-pura loading kayak Dexie)
    const savedData = await storage.loadGraph();

    if (savedData) {
      // Kalau ada data di "Hardisk", pakai itu
      appState.nodes = savedData.nodes || defaultNodes;
      appState.edges = savedData.edges || [];
      addLog('system', '✅ Database Loaded.');
    } else {
      // Kalau kosong (User Baru), pakai default
      appState.nodes = defaultNodes;
      appState.edges = [];
      addLog('system', 'ℹ️ New Session Started.');
    }

    // Selesai Loading!
    appState.isReady = true; 
    setStatus('System Ready.');

  } catch (e) {
    console.error("Init Error:", e);
    setStatus('Storage Error!');
    addLog('system', '❌ Gagal memuat database.');
    // Tetap nyalakan app biar ga blank, meski error
    appState.isReady = true; 
  }
}

// --- HELPER FUNCTIONS ---

export function addLog(role, text) {
  appState.logs.push({ role, text });
}

export function setStatus(msg) {
  appState.status = msg;
}