<script lang="ts">
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { BrainCircuit, Settings, ChevronUp } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';
  import type { RRMNodeData } from '../types';

  interface Props {
    id: string;
    data: RRMNodeData;
    isConnectable: boolean;
  }

  let { id, data, isConnectable }: Props = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(false);
  const uid = crypto.randomUUID();

  function handleModeChange(event: Event) {
    const mode = (event.currentTarget as HTMLSelectElement).value as RRMNodeData['mode'];
    updateNodeData(id, { mode });
    appState.lastChange = Date.now();
  }

  let executionOutput = $derived.by(() => {
    const output = appState.executionResults[id];
    return typeof output === 'string' ? output : '';
  });
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-72' : 'border-nord-border w-44'}`}>

  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-primary">
        <BrainCircuit size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate max-w-[100px]">
        {data.label || 'RRM Engine'}
      </div>
    </div>
    <button onclick={() => expanded = !expanded} class="text-nord-light hover:text-nord-primary transition cursor-pointer">
      {#if expanded} <ChevronUp size={14} /> {:else} <Settings size={14} /> {/if}
    </button>
  </div>

  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-primary !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  {#if expanded}
    <div class="p-3 space-y-3 bg-nord-bg/95 backdrop-blur animate-in slide-in-from-top-2 duration-200 border-t border-nord-border">
      <div>
        <label for={`mode-${uid}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Mode RRM</label>
        <select
          id={`mode-${uid}`}
          value={data.mode || 'plr_proof'}
          onchange={handleModeChange}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          <option value="plr_proof">PLR Proof State Kernel</option>
          <option value="sandbox">Quantum Sandbox</option>
          <option value="fhrr">VSA / FHRR Calc</option>
          <option value="entanglement">Entanglement Optimizer</option>
        </select>
      </div>

      {#if executionOutput}
        <div class="p-2 bg-nord-dark/80 rounded border border-nord-border text-[10px] font-mono text-nord-light max-h-32 overflow-y-auto whitespace-pre-wrap">
          {executionOutput}
        </div>
      {/if}
    </div>
  {:else if executionOutput}
    <div class="px-2 py-1 text-[9px] font-mono text-nord-light truncate border-t border-nord-border bg-nord-dark/50">
      ▶ {executionOutput.slice(0, 30)}...
    </div>
  {/if}

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>
