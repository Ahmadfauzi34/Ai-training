<script>
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { Factory, Settings, ChevronUp } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';

  let { id, data, isConnectable } = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(false);

  // Ambil hasil perhitungan dari State Global
  let resultMatrix = $derived(appState.executionResults[id]);

  function updateOp(val) {
    updateNodeData(id, { operation: val });
    appState.lastChange = Date.now();
  }
</script>

<div class="shadow-xl rounded-lg border-2 border-nord-primary bg-nord-panel w-48 transition-all duration-300">

  <!-- HEADER -->
  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-primary text-nord-bg rounded"><Factory size={14} /></div>
      <div class="text-xs font-bold text-nord-text">TF Layer</div>
    </div>
    <button onclick={() => expanded = !expanded} class="text-nord-light hover:text-nord-primary transition cursor-pointer">
      {#if expanded} <ChevronUp size={14} /> {:else} <Settings size={14} /> {/if}
    </button>
  </div>

  <!-- INPUT HANDLE -->
  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-primary !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  <div class="p-3 bg-nord-bg/50">

    <!-- SETTINGS (EXPANDED) -->
    {#if expanded}
      <div class="space-y-2 animate-in slide-in-from-top-2 duration-200">
        <label class="text-[9px] text-nord-light uppercase">Activation / Op</label>
        <select 
          value={data.operation || 'relu'} 
          onchange={(e) => updateOp(e.target.value)}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          <option value="matmul">MatMul (Dense)</option>
          <option value="add">Add (Bias)</option>
          <option value="relu">ReLU (Activation)</option>
          <option value="sigmoid">Sigmoid (Activation)</option>
        </select>
      </div>
    {:else}
      <div class="text-[10px] text-nord-light text-center uppercase font-mono">
        {data.operation || 'RELU'}
      </div>
    {/if}

    <!-- 👇 BAGIAN INI YANG KEMARIN BELUM LENGKAP -->
    <!-- VISUALISASI HASIL (GRID) -->
    {#if resultMatrix && resultMatrix.rows && resultMatrix.cols}
      <div class="mt-2 pt-2 border-t border-nord-border">
        <div class="text-[9px] text-nord-success font-bold mb-1 text-center flex justify-between px-1">
          <span>OUTPUT</span>
          <span>[{resultMatrix.rows}x{resultMatrix.cols}]</span>
        </div>

        <div 
          class="grid gap-1 p-1 bg-nord-dark rounded overflow-auto max-h-32 nodrag"
          style="grid-template-columns: repeat({resultMatrix.cols}, minmax(0, 1fr));"
        >
          {#each resultMatrix.data as val}
            <div class="text-[9px] text-center py-1 px-0.5 bg-nord-panel rounded text-nord-text font-mono truncate" title={val}>
              {val.toFixed(2)}
            </div>
          {/each}
        </div>
      </div>
    {/if}

  </div>

  <!-- OUTPUT HANDLE -->
  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />
</div>