<script>
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { Users, Settings, ChevronUp, Play } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';

  let { id, data, isConnectable } = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(true);
  const uid = crypto.randomUUID();

  let agentCount = $derived(data.agentCount ?? 10000);
  let cohesion = $derived(data.cohesion ?? 0.05);
  let separation = $derived(data.separation ?? 0.02);
  let alignment = $derived(data.alignment ?? 0.01);

  let resultText = $derived(appState.executionResults[id] || '');

  function updateField(field, value) {
    updateNodeData(id, { [field]: value });
    appState.lastChange = Date.now();
  }
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-72' : 'border-nord-border w-48'}`}>

  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-primary">
        <Users size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate max-w-[120px]">
        {data.label || 'Swarm Engine'}
      </div>
    </div>
    <button onclick={() => expanded = !expanded} class="text-nord-light hover:text-nord-primary transition cursor-pointer">
      {#if expanded} <ChevronUp size={14} /> {:else} <Settings size={14} /> {/if}
    </button>
  </div>

  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-primary !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  <div class="p-3 space-y-3 bg-nord-bg/95 backdrop-blur border-t border-nord-border">
    {#if expanded}
      <div>
        <div class="flex justify-between items-center mb-1">
          <label for={`agents-${uid}`} class="text-[9px] font-mono text-nord-light uppercase">Populasi Agen</label>
          <span class="text-[10px] font-bold text-nord-primary">{agentCount.toLocaleString()} Agen</span>
        </div>
        <input
          id={`agents-${uid}`}
          type="range"
          min="100"
          max="50000"
          step="500"
          value={agentCount}
          oninput={(e) => updateField('agentCount', parseInt(e.target.value, 10))}
          class="nodrag w-full accent-nord-primary cursor-pointer"
        />
      </div>

      <div class="grid grid-cols-3 gap-2 text-[9px] font-mono">
        <div>
          <label for={`cohesion-${uid}`} class="text-nord-light uppercase block mb-1">Cohesion</label>
          <input
            id={`cohesion-${uid}`}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={cohesion}
            oninput={(e) => updateField('cohesion', parseFloat(e.target.value))}
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-nord-text p-1 text-center"
          />
        </div>
        <div>
          <label for={`sep-${uid}`} class="text-nord-light uppercase block mb-1">Separation</label>
          <input
            id={`sep-${uid}`}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={separation}
            oninput={(e) => updateField('separation', parseFloat(e.target.value))}
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-nord-text p-1 text-center"
          />
        </div>
        <div>
          <label for={`align-${uid}`} class="text-nord-light uppercase block mb-1">Alignment</label>
          <input
            id={`align-${uid}`}
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={alignment}
            oninput={(e) => updateField('alignment', parseFloat(e.target.value))}
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-nord-text p-1 text-center"
          />
        </div>
      </div>
    {/if}

    {#if resultText}
      <div class="p-2 bg-nord-dark/80 rounded border border-nord-border text-[10px] font-mono text-nord-success whitespace-pre-wrap max-h-24 overflow-y-auto">
        {resultText}
      </div>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>
