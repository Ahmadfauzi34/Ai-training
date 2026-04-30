<script>
  import { onMount } from 'svelte';
  import { Terminal, GitGraph, MessageSquare, Settings, Loader2 } from 'lucide-svelte';
  import { appState, setStatus, initSystem } from './lib/state.svelte.ts';
  import { storage } from './lib/storage.js';
  import { askBrain } from './lib/brain.ts';

  import ChatView from './lib/views/ChatView.svelte';
  import GraphView from './lib/GraphView.svelte';
  import SettingsView from './lib/views/SettingsView.svelte';

  // Variabel untuk menampung Timer
  let saveTimer;

  onMount(async () => {
    try {
      const res = await askBrain('/');
      if (appState.isReady) setStatus(`ENGINE: ${res.engine}`);
    } catch (e) {
      setStatus("⚠️ OFFLINE: Worker Not Responding");
    }
    await initSystem();
  });

  // --- AUTO-SAVE PINTAR (DEBOUNCE + SAFETY) ---
  $effect(() => {
    // 1. "Sentuh" variabel agar Svelte mendeteksi perubahan
    const _n = appState.nodes;
    const _e = appState.edges;

    // 👇 PENTING: Deteksi perubahan teks (Heartbeat)
    const _trigger = appState.lastChange; 

    // 2. SAFETY GUARD (Gembok Pengaman)
    // Jika sistem belum siap ATAU ada error storage fatal, JANGAN SAVE.
    if (!appState.isReady || appState.isStorageError) {
      if (appState.isStorageError) {
        console.warn("⛔ Auto-save diblokir karena Storage Error (Safe Mode).");
      }
      return;
    }

    // 3. Reset timer (Debounce)
    clearTimeout(saveTimer);

    // 4. Mulai timer baru (Tunggu 1 detik)
    saveTimer = setTimeout(() => {
      console.log('💾 Auto-saving...'); 
      const dataToSave = { nodes: appState.nodes, edges: appState.edges };

      storage.saveGraph(dataToSave).then(() => {
         // Save berhasil di background
      });
    }, 1000); 

    // Cleanup
    return () => clearTimeout(saveTimer);
  });
</script>

<div class="h-screen w-full bg-nord-bg text-nord-text font-mono flex flex-col overflow-hidden">

  <!-- HEADER -->
  <div class="h-14 bg-nord-panel border-b border-nord-border flex items-center justify-between px-4 shrink-0 z-50 shadow-md">
    <div class="flex items-center gap-2 text-nord-primary select-none">
      <Terminal size={20} />
      <span class="font-bold text-lg tracking-wider">V76</span>
    </div>

    <div class="flex gap-1 bg-nord-bg/50 p-1 rounded-lg border border-nord-border/30">
      <button onclick={() => appState.activeTab = 'chat'} class={`px-3 py-1 rounded text-xs flex items-center gap-2 transition ${appState.activeTab === 'chat' ? 'bg-nord-primary text-nord-bg font-bold shadow-sm' : 'hover:text-nord-primary text-nord-light'}`}>
        <MessageSquare size={14} /> CHAT
      </button>
      <button onclick={() => appState.activeTab = 'brain'} class={`px-3 py-1 rounded text-xs flex items-center gap-2 transition ${appState.activeTab === 'brain' ? 'bg-nord-primary text-nord-bg font-bold shadow-sm' : 'hover:text-nord-primary text-nord-light'}`}>
        <GitGraph size={14} /> BRAIN
      </button>
      <button onclick={() => appState.activeTab = 'config'} class={`px-3 py-1 rounded text-xs flex items-center gap-2 transition ${appState.activeTab === 'config' ? 'bg-nord-primary text-nord-bg font-bold shadow-sm' : 'hover:text-nord-primary text-nord-light'}`}>
        <Settings size={14} /> CONFIG
      </button>
    </div>
  </div>

  <!-- MAIN CONTENT AREA -->
  <div class="flex-1 relative overflow-hidden bg-nord-bg">

    {#if !appState.isReady}
      <div class="absolute inset-0 flex flex-col items-center justify-center bg-nord-bg z-[100]">
        <Loader2 size={40} class="text-nord-primary animate-spin mb-4" />
        <div class="text-nord-light text-sm animate-pulse">{appState.status}</div>
      </div>
    {/if}

    <!-- 
      LOGIKA LAYER (Z-INDEX):
      - Graph: z-10 (Paling Bawah)
      - Chat: z-20 (Di atas Graph)
      - Settings: z-30 (Paling Atas)
    -->

    <!-- 1. CHAT VIEW (Z-20) -->
    <div class={`absolute inset-0 transition-all duration-300 ${appState.activeTab === 'chat' ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
      <ChatView />
    </div>

    <!-- 2. GRAPH VIEW (Z-10) -->
    <div class={`absolute inset-0 transition-opacity duration-300 ${appState.activeTab === 'brain' ? 'opacity-100 z-10 visible' : 'opacity-0 z-0 invisible'}`}>
      <GraphView />
    </div>

    <!-- 3. SETTINGS VIEW (Z-30) -->
    <div class={`absolute inset-0 transition-all duration-300 ${appState.activeTab === 'config' ? 'opacity-100 z-30 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
      <SettingsView />
    </div>

  </div>

  <!-- FOOTER -->
  <div class="bg-nord-panel text-[10px] text-nord-light px-2 py-1 text-center border-t border-nord-border select-none">
    {appState.status}
  </div>

</div>