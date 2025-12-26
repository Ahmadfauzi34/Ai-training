<script>
  import { Send } from 'lucide-svelte';
  import { appState, addLog } from '../state.svelte.js'; 
  import { askBrain } from '../brain.js';
  import { storage } from '../storage.js';
  import { NODE_REGISTRY } from '../plugins/registry.js';

  async function sendMessage() {
    // 1. Validasi Input Kosong
    if (!appState.input.trim()) return;
    
    const userMsg = appState.input;
    addLog('user', userMsg);
    appState.input = ""; // Kosongkan input segera

    try {
      const apiKey = localStorage.getItem('gemini_key');
      if (!apiKey) throw new Error("API Key kosong! Cek tab Config.");

      // --- ALGORITMA "FLOOD FILL" (BANJIR) ---
      // Tujuannya: Menjelajahi semua cabang kabel untuk mengumpulkan data
      
      // A. Cari Titik Awal (Start Node)
      const startNode = appState.nodes.find(n => n.type === 'input');
      if (!startNode) throw new Error("Tidak ada Node Start! Tambahkan node 'Start System'.");

      // B. Persiapan Variabel Penjelajah
      let queue = [startNode];           // Antrian node yang akan dikunjungi
      let visited = new Set([startNode.id]); // Catatan node yang sudah didatangi (biar gak muter-muter)
      
      let accumulatedContext = "";       // "Tas" untuk menampung semua ingatan dari berbagai cabang
      let targetAiNode = null;           // Tujuan akhir (AI)

      addLog('system', '🌊 Memulai penelusuran Graph...');

      // C. LOOPING (Jalan terus selama masih ada antrian)
      while (queue.length > 0) {
        const currentNode = queue.shift(); // Ambil node paling depan antrian

        // --- 1. PROSES NODE SAAT INI ---
        
        // KASUS: MEMORY NODE (RAG)
        // Kalau ketemu memory, kita ambil datanya, masukkan ke tas, lalu lanjut jalan.
        if (currentNode.type === 'rag_memory') {
          const label = currentNode.data.label || 'Memory';
          addLog('system', `🔍 Scan ${label}...`);
          
          // Ambil semua data vector dari Dexie
          const knowledgeBase = await storage.getAllVectors();
          
          // Minta Worker cari yang relevan
          const res = await askBrain('/retrieve', 'POST', {
            input: userMsg,
            apiKey,
            knowledgeBase
          });
          
          if (res.context) {
            accumulatedContext += `[Sumber: ${label}]\n${res.context}\n---\n`;
          }
        }

        // KASUS: AI NODE (ACTION)
        // Kalau ketemu AI, tandai ini sebagai tujuan akhir.
        // JANGAN dieksekusi dulu, tunggu sampai semua cabang lain selesai diproses.
        if (currentNode.type === 'action') {
          targetAiNode = currentNode;
        }

        // --- 2. CARI TETANGGA (NEXT NODES) ---
        // Cari semua kabel yang keluar dari node ini (Bisa banyak cabang!)
        const outgoingEdges = appState.edges.filter(e => e.source === currentNode.id);
        
        for (const edge of outgoingEdges) {
          const nextNode = appState.nodes.find(n => n.id === edge.target);
          
          // Jika node ada DAN belum pernah dikunjungi
          if (nextNode && !visited.has(nextNode.id)) {
            visited.add(nextNode.id); // Tandai sudah dikunjungi
            queue.push(nextNode);     // Masukkan antrian
          }
        }
      }

      // D. EKSEKUSI FINAL (SETELAH SEMUA CABANG SELESAI)
      if (targetAiNode) {
        addLog('system', '🤖 AI Merangkum Data & Menjawab...');
        
        // Clone data node biar aman
        const nodeData = JSON.parse(JSON.stringify(targetAiNode.data));
        
        // Tempelkan semua konteks yang didapat dari perjalanan tadi
        if (accumulatedContext) {
          nodeData.prompt = `
          DATA PENDUKUNG DARI MEMORY:
          ${accumulatedContext}
          
          INSTRUKSI UTAMA:
          ${nodeData.prompt || "Jawab pertanyaan user berdasarkan data di atas."}
          `;
        }

        // Panggil Worker untuk mikir
        const res = await askBrain('/process', 'POST', { 
          input: userMsg,
          apiKey,
          nodeType: 'action',
          nodeData: nodeData
        });

        if (res.error) throw new Error(res.message);
        addLog('ai', res.reply);
      } else {
        addLog('system', '⚠️ Penelusuran selesai, tapi tidak menemukan AI Node di ujung.');
      }

    } catch (e) {
      addLog('system', `❌ Error: ${e.message || e}`);
    }
  }
</script>

<div class="flex flex-col h-full p-4 animate-in fade-in duration-300">
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
      bind:value={appState.input}
      class="flex-1 bg-nord-panel border border-nord-border rounded px-4 py-3 outline-none focus:border-nord-primary transition text-sm text-nord-text"
      placeholder="Tanya Hono..."
    />
    <button type="submit" class="bg-nord-primary text-nord-bg p-3 rounded hover:opacity-90 cursor-pointer">
      <Send size={20} />
    </button>
  </form>
</div>