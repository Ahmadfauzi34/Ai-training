<script lang="ts">
  // --- 1. IMPORTS LIBRARY ---
  import { 
    SvelteFlow, 
    Background, 
    Controls, 
    addEdge, 
    MarkerType,
    type EdgeEvents,
    type NodeTypes,
    type OnConnect
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  // Icons
  import { Plus, X, Trash2, Box, Play } from 'lucide-svelte';

  // --- 2. IMPORTS LOCAL ---
  // Pastikan import addLog juga
  import { appState, addLog } from './state.svelte.ts'; 
  import { NODE_REGISTRY } from './plugins/registry.js';
  import { GraphRunner } from './engine/GraphRunner';
  import { asNodeId, type AppEdge, type AppNode } from './types';

  // --- 3. STATE MANAGEMENT ---
  let isDrawerOpen = $state(false);
  let isRunning = $state(false); // Status loading saat run

  // Generate Tipe Node dari Registry
  type RegisteredNodeType = keyof typeof NODE_REGISTRY;

  const registryEntries = (Object.keys(NODE_REGISTRY) as RegisteredNodeType[]).map(
    (type) => [type, NODE_REGISTRY[type]] as const
  );

  const nodeTypes = Object.fromEntries(
    registryEntries.map(([key, val]) => [key, val.component])
  ) as NodeTypes;

  // --- 4. GRAPH HANDLERS (CONNECT & CLICK) ---

  const onConnect: OnConnect = (connection) => {
    const newEdge = {
      ...connection,
      type: 'smoothstep', // Gaya kabel siku-siku (Engineering Style)
      animated: true,
      style: "stroke: #88c0d0; stroke-width: 2;",
      markerEnd: { type: MarkerType.ArrowClosed, color: '#88c0d0' },
    };
    appState.edges = addEdge<AppEdge>(newEdge, appState.edges);
  };

  const onEdgeClick: NonNullable<EdgeEvents<AppEdge>['onedgeclick']> = ({ edge }) => {
    // Hapus kabel saat diklik
    appState.edges = appState.edges.filter(e => e.id !== edge.id);
  };

  // --- 5. ACTION HANDLERS (BUTTONS) ---

  const deleteSelected = () => {
    appState.nodes = appState.nodes.filter(n => !n.selected);
    appState.edges = appState.edges.filter(e => !e.selected);
  };

  function addNode(type: RegisteredNodeType) {
    const def = NODE_REGISTRY[type];
    if (!def) return;

    const id = asNodeId(crypto.randomUUID());
    const newNode = {
      id: id,
      type: type,
      // Random position biar gak numpuk
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { ...def.defaultData } 
    } as AppNode;
    appState.nodes = [...appState.nodes, newNode];
    isDrawerOpen = false; 
  }

  // --- 6. ENGINE RUNNER (THE BRAIN) ---

  async function runSimulation() {
    if (isRunning) return; // Cegah spam klik
    isRunning = true;

    try {
      addLog('system', '🚀 Manual Run triggered from Graph View...');

      // A. Instansiasi Engine dengan snapshot data saat ini
      const engine = new GraphRunner(appState.nodes, appState.edges);

      // B. Sambungkan Logger Engine ke UI Log
      engine.setLogger((role, text) => {
        addLog(role, text);
        console.log(`[${role}] ${text}`);
      });

      // C. Jalankan!
      await engine.run("MANUAL_TRIGGER");

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addLog('system', `❌ Error: ${message}`);
    } finally {
      isRunning = false;
    }
  }
</script>

<!-- --- UI LAYOUT --- -->
<div class="h-full w-full bg-nord-bg relative group overflow-hidden">

  <SvelteFlow 
    bind:nodes={appState.nodes} 
    bind:edges={appState.edges} 
    {nodeTypes}
    onconnect={onConnect}
    onedgeclick={onEdgeClick}
    fitView
    class="bg-nord-bg"
  >
    <Background patternColor="#4c566a" gap={25} size={1} />
    <Controls class="bg-nord-panel border-nord-border text-nord-text fill-nord-text" />

    <!-- --- FLOATING CONTROLS (TOP RIGHT) --- -->
    <div class="absolute top-4 right-4 flex gap-2 z-50">
      {#if !isDrawerOpen}

        <!-- 1. DELETE BUTTON -->
        <button 
          onclick={deleteSelected}
          class="bg-nord-danger text-nord-bg px-4 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 cursor-pointer"
          title="Hapus Node Terpilih"
        >
          <Trash2 size={16} />
        </button>

        <!-- 2. RUN BUTTON (NEW) -->
        <button 
          onclick={runSimulation}
          disabled={isRunning}
          class={`px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 cursor-pointer 
          ${isRunning ? 'bg-nord-warning text-nord-bg cursor-wait' : 'bg-nord-success text-nord-bg'}`}
        >
          <Play size={18} class={isRunning ? 'animate-pulse' : ''} /> 
          {isRunning ? 'Running...' : 'Run'}
        </button>

        <!-- 3. ADD NODE BUTTON -->
        <button 
          onclick={() => isDrawerOpen = true} 
          class="bg-nord-primary text-nord-bg px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition flex items-center gap-2 cursor-pointer animate-in zoom-in"
        >
          <Plus size={18} /> Add Node
        </button>
      {/if}
    </div>

    <!-- --- PLUGIN DRAWER (SIDEBAR) --- -->
    {#if isDrawerOpen}
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm z-[60] flex justify-end animate-in fade-in duration-200">
        <div class="w-64 h-full bg-nord-panel border-l border-nord-border shadow-2xl p-4 flex flex-col animate-in slide-in-from-right duration-300">

          <!-- Drawer Header -->
          <div class="flex items-center justify-between mb-6 border-b border-nord-border pb-4">
            <div class="flex items-center gap-2 text-nord-primary">
              <Box size={20} />
              <span class="font-bold text-lg">Plugin Store</span>
            </div>
            <button onclick={() => isDrawerOpen = false} class="text-nord-light hover:text-nord-danger transition">
              <X size={24} />
            </button>
          </div>

          <!-- Plugin List -->
          <div class="flex-1 overflow-y-auto space-y-3">
            {#each registryEntries as [type, def]}
              {@const Icon = def.icon}

              <button 
                onclick={() => addNode(type)}
                class="w-full text-left p-3 rounded-lg bg-nord-bg border border-nord-border hover:border-nord-primary hover:bg-nord-dark transition group flex items-start gap-3"
              >
                <div class="p-2 bg-nord-panel rounded text-nord-primary group-hover:text-nord-bg group-hover:bg-nord-primary transition">
                  <Icon size={20} />
                </div>

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
