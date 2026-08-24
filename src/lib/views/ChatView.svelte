<script>
  import { Send } from 'lucide-svelte';
  import { appState, addLog } from '../state.svelte.ts'; 
  import { askBrain } from '../brain.ts';
  
  // IMPORT ENGINE BARU KITA
  import { GraphRunner } from '../engine/GraphRunner.ts';
  import { executeLabCommand } from '../commands/labCommands.ts';

  async function sendMessage() {
    // 1. Validasi Input Kosong
    if (!appState.input.trim()) return;

    const userMsg = appState.input;
    addLog('user', userMsg);
    appState.input = ""; // Kosongkan input segera

    // Perintah berawalan "/" dieksekusi lokal dan tidak pernah memanggil LLM.
    const commandResult = executeLabCommand(userMsg, appState.nodes, appState.edges);
    if (commandResult.handled) {
      if (commandResult.nodes) appState.nodes = commandResult.nodes;
      if (commandResult.edges) appState.edges = commandResult.edges;
      if (commandResult.nodes || commandResult.edges) appState.lastChange = Date.now();
      addLog('system', commandResult.message || 'Perintah selesai.');
      return;
    }

    // --- CARA BARU: DELEGASIKAN KE ENGINE ---
    try {
      // A. Siapkan Engine dengan data Graph saat ini
      const engine = new GraphRunner(appState.nodes, appState.edges);

      // B. Sambungkan kabel Log (Agar Engine bisa nulis ke layar Chat)
      engine.setLogger((role, text) => {
        addLog(role, text);
      });

      // C. Jalankan Engine!
      await engine.run(userMsg);

    } catch (e) {
      addLog('system', `❌ Critical Error: ${e.message}`);
    }
  }
</script>

<!-- TAMPILAN HTML TETAP SAMA (SUDAH BENAR) -->
<div class="flex flex-col h-full p-4 animate-in fade-in duration-300 bg-nord-bg">

  <!-- AREA LOG CHAT -->
  <div class="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-hide">
    {#each appState.logs as log}
      <div class={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div class={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm ${
          log.role === 'user' ? 'bg-nord-panel border border-nord-primary text-nord-text' : 
          log.role === 'system' ? 'bg-red-900/20 border border-red-500/50 text-red-200 text-xs w-full text-center py-1' :
          'bg-nord-panel border border-nord-border text-nord-text'
        }`}>
          <div class="text-[10px] opacity-50 mb-1 uppercase font-bold tracking-wider">{log.role}</div>
          <div class="whitespace-pre-wrap leading-relaxed">{log.text}</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- AREA INPUT -->
  <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2">
    <input 
      aria-label="Ketik pesan Anda"
      bind:value={appState.input}
      class="flex-1 bg-nord-panel border border-nord-border rounded px-4 py-3 outline-none focus:border-nord-primary transition text-sm text-nord-text"
      placeholder="Ketik pesan atau /help untuk perintah lab..."
    />
    <button
      type="submit"
      disabled={!appState.input.trim()}
      aria-label="Kirim pesan"
      class="bg-nord-primary text-nord-bg p-3 rounded hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
      <Send size={20} />
    </button>
  </form>
</div>
