<script>
  import { onMount } from 'svelte';
  import { Terminal, GitGraph, MessageSquare, Settings, Loader2 } from 'lucide-svelte'; // Tambah Loader2
  import { appState, setStatus, initSystem } from './lib/state.svelte.js';
  import { storage } from './lib/storage.js'; // Pakai adapter baru
  import { askBrain } from './lib/brain.js';

  import ChatView from './lib/views/ChatView.svelte';
  import GraphView from './lib/GraphView.svelte';
  import SettingsView from './lib/views/SettingsView.svelte';

  onMount(async () => {
    // 1. Cek Koneksi Worker
    try {
      const res = await askBrain('/');
      // Jangan timpa status kalau lagi loading DB
      if (appState.isReady) setStatus(`ENGINE: ${res.engine}`);
    } catch (e) {
      setStatus("⚠️ OFFLINE: Worker Not Responding");
    }

    // 2. LOAD DATABASE (PENTING)
    await initSystem();
  });

  // --- AUTO-SAVE SYSTEM (ASYNC READY) ---
  $effect(() => {
    // Jangan simpan kalau system belum siap (nanti data kosong menimpa data asli!)
    if (!appState.isReady) return;

    // Deteksi perubahan pada nodes/edges
    const dataToSave = {
      nodes: appState.nodes,
      edges: appState.edges
    };

    // Simpan via Adapter (Fire and Forget)
    storage.saveGraph(dataToSave).then(() => {
       // console.log('Auto-saved via Adapter');
    });
  });
</script>

<div class="h-screen w-full bg-nord-bg text-nord-text font-mono flex flex-col overflow-hidden">

  <!-- HEADER -->
  <div class="h-14 bg-nord-panel border-b border-nord-border flex items-center justify-between px-4 shrink-0 z-50 shadow-md">
    <div class="flex items-center gap-2 text-nord-primary select-none">
      <Terminal size={20} />
      <span class="font-bold text-lg tracking-wider">V76</span>
    </div>

    <!-- MENU TABS -->
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
    
    <!-- LOADING SCREEN (PENTING UNTUK ASYNC DB) -->
    {#if !appState.isReady}
      <div class="absolute inset-0 flex flex-col items-center justify-center bg-nord-bg z-50">
        <Loader2 size={40} class="text-nord-primary animate-spin mb-4" />
        <div class="text-nord-light text-sm animate-pulse">{appState.status}</div>
      </div>
    {/if}

    <!-- CONTENT -->
    {#if appState.activeTab === 'chat'}
      <ChatView />
    {:else if appState.activeTab === 'brain'}
      <GraphView />
    {:else if appState.activeTab === 'config'}
      <SettingsView />
    {/if}
  </div>

  <!-- FOOTER STATUS -->
  <div class="bg-nord-panel text-[10px] text-nord-light px-2 py-1 text-center border-t border-nord-border select-none">
    {appState.status}
  </div>

</div>