<script>
  import { 
    SvelteFlow, 
    Background, 
    Controls, 
    MiniMap, 
    addEdge, 
    MarkerType 
  } from '@xyflow/svelte';

  import '@xyflow/svelte/dist/style.css';
  import { Plus, X, Trash2, Box } from 'lucide-svelte'; // Tambah ikon Box & X

  import { appState } from './state.svelte.js';
  import { NODE_REGISTRY } from './plugins/registry.js';

  // State untuk Laci (Drawer)
  let isDrawerOpen = $state(false);

  // Generate Tipe Node Otomatis
  const nodeTypes = Object.fromEntries(
    Object.entries(NODE_REGISTRY).map(([key, val]) => [key, val.component])
  );

  const onConnect = (connection) => {
    const newEdge = {
      ...connection,
      animated: true,
      style: "stroke: #88c0d0; stroke-width: 2;",
      markerEnd: { type: MarkerType.ArrowClosed, color: '#88c0d0' },
    };
    appState.edges = addEdge(newEdge, appState.edges);
  };

  const onEdgeClick = (event, edge) => {
    if (!edge || !edge.id) return;
    appState.edges = appState.edges.filter(e => e.id !== edge.id);
  };

  const deleteSelected = () => {
    appState.nodes = appState.nodes.filter(n => !n.selected);
    appState.edges = appState.edges.filter(e => !e.selected);
  };

  // Fungsi Add Node (Otomatis Tutup Laci setelah klik)
  function addNode(type) {
    const def = NODE_REGISTRY[type];
    if (!def) return;

    const id = crypto.randomUUID();
    const newNode = {
      id: id,
      type: type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { ...def.defaultData } 
    };
    appState.nodes = [...appState.nodes, newNode];
    isDrawerOpen = false; // Tutup laci
  }
</script>

<div class="h-full w-full bg-nord-bg relative group overflow-hidden">
  <SvelteFlow 
    bind:nodes={appState.nodes} 
    bind:edges={appState.edges} 
    {nodeTypes}
    {onConnect} 
    onedgeclick={onEdgeClick}
    fitView
    class="bg-nord-bg"
  >
    <Background color="#4c566a" gap={25} size={1} />
    <Controls class="bg-nord-panel border-nord-border text-nord-text fill-nord-text" />
    <MiniMap nodeColor="#88c0d0" maskColor="rgba(46, 52, 64, 0.8)" style="background-color: #2e3440; border: 1px solid #4c566a;" />

    <!-- TOMBOL FLOAT DI POJOK KANAN ATAS -->
    <div class="absolute top-4 right-4 flex gap-2 z-50">
      {#if !isDrawerOpen}
        <button 
          onclick={deleteSelected}
          class="bg-nord-danger text-nord-bg px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 cursor-pointer"
        >
          <Trash2 size={16} />
        </button>

        <button 
          onclick={() => isDrawerOpen = true} 
          class="bg-nord-primary text-nord-bg px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 cursor-pointer animate-in zoom-in"
        >
          <Plus size={18} /> Add Node
        </button>
      {/if}
    </div>

    <!-- LACI PLUGIN (DRAWER) -->
    {#if isDrawerOpen}
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60] flex justify-end animate-in fade-in duration-200">
        <!-- Panel Laci -->
        <div class="w-64 h-full bg-nord-panel border-l border-nord-border shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-300">

          <!-- Header Laci -->
          <div class="flex items-center justify-between mb-6 border-b border-nord-border pb-4">
            <div class="flex items-center gap-2 text-nord-primary">
              <Box size={20} />
              <span class="font-bold text-lg">Plugin Store</span>
            </div>
            <button onclick={() => isDrawerOpen = false} class="text-nord-light hover:text-nord-danger transition">
              <X size={24} />
            </button>
          </div>

          <!-- List Plugin (Looping Otomatis dari Registry) -->
          <div class="flex-1 overflow-y-auto space-y-3">
            {#each Object.entries(NODE_REGISTRY) as [type, def]}
              <button 
                onclick={() => addNode(type)}
                class="w-full text-left p-3 rounded-lg bg-nord-bg border border-nord-border hover:border-nord-primary hover:bg-nord-dark transition group flex items-start gap-3"
              >
                <!-- Ikon Plugin -->
                <div class="p-2 bg-nord-panel rounded text-nord-primary group-hover:text-nord-bg group-hover:bg-nord-primary transition">
                  <svelte:component this={def.icon} size={20} />
                </div>

                <!-- Teks Plugin -->
                <div>
                  <div class="font-bold text-sm text-nord-text">{def.label}</div>
                  <div class="text-[10px] text-nord-light mt-0.5">{def.description}</div>
                </div>
              </button>
            {/each}
          </div>

          <div class="mt-4 text-center text-[10px] text-nord-light opacity-50">
            V76 Plugin System v1.0
          </div>

        </div>
      </div>
    {/if}

  </SvelteFlow>
</div>