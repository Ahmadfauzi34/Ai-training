<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { BrainCircuit, Save, Check } from 'lucide-svelte';
  import { askBrain } from '../brain.js';
  import { storage } from '../storage.js';

  let { data } = $props();

  let inputText = $state(data.text || '');
  let isProcessing = $state(false);
  let status = $state('idle'); // idle, saving, saved, error

  // Fungsi: Minta Worker bikin Vector, lalu simpan ke Dexie
  async function learnData() {
    if (!inputText.trim()) return;

    isProcessing = true;
    status = 'saving';

    try {
      const apiKey = localStorage.getItem('gemini_key');
      if (!apiKey) throw new Error("API Key belum diisi di Config!");

      // 1. Minta Worker buatkan Vector (Embedding)
      const res = await askBrain('/embed', 'POST', { 
        text: inputText,
        apiKey 
      });

      if (res.error) throw new Error(res.message);

      // 2. Simpan Teks + Vector ke Dexie
      // Kita pakai ID unik biar bisa ditumpuk banyak ingatan
      const memoryId = crypto.randomUUID();
      await storage.saveVector(memoryId, inputText, res.vector);

      // Update UI
      data.text = inputText; // Simpan teks di node biar gak hilang visualnya
      status = 'saved';
      setTimeout(() => status = 'idle', 2000);

    } catch (e) {
      alert(`Gagal belajar: ${e.message}`);
      status = 'error';
    } finally {
      isProcessing = false;
    }
  }
</script>

<div class="shadow-xl rounded-lg border-2 border-nord-warning bg-nord-panel w-64 transition-all duration-300">

  <!-- Header -->
  <div class="flex items-center gap-2 p-2 bg-nord-dark rounded-t-md border-b border-nord-border">
    <div class="p-1 bg-nord-warning text-nord-bg rounded">
      <BrainCircuit size={14} />
    </div>
    <div class="text-xs font-bold text-nord-text">Long-Term Memory</div>
  </div>

  <Handle type="target" position={Position.Top} class="!bg-nord-warning !w-4 !h-4" />

  <!-- Body -->
  <div class="p-3 space-y-2">
    <div class="text-[9px] text-nord-light uppercase font-mono">Pengetahuan Dasar:</div>

    <textarea 
      bind:value={inputText}
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

  <Handle type="source" position={Position.Bottom} class="!bg-nord-warning !w-4 !h-4" />
</div>