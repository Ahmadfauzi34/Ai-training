<script lang="ts">
  // 1. Import useSvelteFlow
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { BrainCircuit, Save, Check } from 'lucide-svelte';
  import { askBrain } from '../brain.ts';
  import { storage } from '../storage.js';
  import { appState } from '../state.svelte.ts';
  import type { MemoryNodeData } from '../types';

  // 2. Terima 'id' dari props (Penting untuk updateNodeData)
  interface Props {
    id: string;
    data: MemoryNodeData;
    isConnectable: boolean;
  }

  let { id, data, isConnectable }: Props = $props();

  // 3. Ambil fungsi update dari hook
  const { updateNodeData } = useSvelteFlow();

  let isProcessing = $state(false);
  let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Fungsi Handler Input yang Aman
  function handleInput(event: Event) {
    const newValue = (event.currentTarget as HTMLTextAreaElement).value;

    // A. Update Data via Svelte Flow (Legal Way)
    updateNodeData(id, { text: newValue });

    // B. Trigger Auto-Save
    appState.lastChange = Date.now();
  }

  async function learnData() {
    if (!data.text || !data.text.trim()) return; 
    isProcessing = true;
    status = 'saving';
    try {
      // ... (logika sama) ...
      const apiKey = localStorage.getItem('gemini_key');
      if (!apiKey) throw new Error("API Key belum diisi di Config!");

      const res = await askBrain('/embed', 'POST', { text: data.text, apiKey });
      if (res.error) throw new Error(res.message);

      const memoryId = crypto.randomUUID();
      await storage.saveVector(memoryId, data.text, res.vector);

      status = 'saved';
      setTimeout(() => status = 'idle', 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Gagal belajar: ${message}`);
      status = 'error';
    } finally {
      isProcessing = false;
    }
  }
</script>

<div class="shadow-xl rounded-lg border-2 border-nord-warning bg-nord-panel w-64 transition-all duration-300">

  <div class="flex items-center gap-2 p-2 bg-nord-dark rounded-t-md border-b border-nord-border">
    <div class="p-1 bg-nord-warning text-nord-bg rounded">
      <BrainCircuit size={14} />
    </div>
    <div class="text-xs font-bold text-nord-text">Long-Term Memory</div>
  </div>

  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-warning !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  <div class="p-3 space-y-2">
    <div class="text-[9px] text-nord-light uppercase font-mono">Pengetahuan Dasar:</div>

    <!-- 
      PERBAIKAN DI SINI:
      1. Hapus bind:value
      2. Gunakan value={data.text} (One-way)
      3. Gunakan oninput={handleInput} (Update via function)
    -->
    <textarea 
      value={data.text} 
      oninput={handleInput}
      class="nodrag w-full bg-nord-bg border border-nord-border rounded text-xs text-nord-text p-2 h-24 outline-none focus:border-nord-warning resize-none"
      placeholder="Contoh: Kode rahasia brankas adalah 9988..."
    ></textarea>

    <button 
      onclick={learnData}
      disabled={isProcessing}
      class="w-full py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition
      {status === 'saved' ? 'bg-nord-success text-nord-bg' : 'bg-nord-warning text-nord-bg hover:brightness-110'}"
    >
      {#if isProcessing}
        <span>Learning...</span>
      {:else if status === 'saved'}
        <Check size={14} /> Tersimpan
      {:else}
        <Save size={14} /> Simpan ke Otak
      {/if}
    </button>
  </div>

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-warning !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />
</div>
