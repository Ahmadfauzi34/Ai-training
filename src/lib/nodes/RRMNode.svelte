<script>
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { BrainCircuit, Settings, ChevronUp } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';

  let { id, data, isConnectable } = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(false);
  const uid = crypto.randomUUID();

  function updateField(field, value) {
    updateNodeData(id, { [field]: value });
    appState.lastChange = Date.now();
  }
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-64' : 'border-nord-border w-40'}`}>

  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-primary">
        <BrainCircuit size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate max-w-[80px]">
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
          value={data.mode || 'sandbox'}
          onchange={(e) => updateField('mode', e.target.value)}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          <option value="sandbox">Quantum Sandbox</option>
          <option value="fhrr">VSA / FHRR Calc</option>
          <option value="entanglement">Entanglement Optimizer</option>
        </select>
      </div>
    </div>
  {/if}

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>