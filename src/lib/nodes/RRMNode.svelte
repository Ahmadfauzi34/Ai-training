<script lang="ts">
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { BrainCircuit, Settings, ChevronUp } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';
  import { normalizeRRMMode, RRM_MODE_OPTIONS } from '../types/rrm.ts';
  import type { RRMMode } from '../types/rrm.ts';
  import type { RRMNodeData } from '../types/nodes.ts';

  interface Props {
    id: string;
    data: RRMNodeData;
    isConnectable?: boolean;
  }

  let { id, data, isConnectable = true }: Props = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(false);
  const uid = crypto.randomUUID();

  function updateMode(value: RRMMode) {
    updateNodeData(id, { mode: value });
    appState.lastChange = Date.now();
  }

  function handleModeChange(event: Event) {
    updateMode((event.currentTarget as HTMLSelectElement).value as RRMMode);
  }

  function handleSymbolInput(event: Event) {
    updateNodeData(id, { symbol: (event.currentTarget as HTMLInputElement).value });
    appState.lastChange = Date.now();
  }

  function formatExecutionOutput(value: unknown): string {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    if ('kind' in value && value.kind === 'rrm.hypervector' && 'label' in value && 'vector' in value) {
      return `${String(value.label)} [${(value.vector as Float32Array).length}D]`;
    }
    if ('kind' in value && value.kind === 'rrm.similarity' && 'score' in value) {
      return `Similarity: ${Number(value.score).toFixed(6)}`;
    }
    return JSON.stringify(value);
  }

  let executionOutput = $derived(appState.executionResults?.[id] || '');
  let executionOutputText = $derived(formatExecutionOutput(executionOutput));
  let selectedMode = $derived(normalizeRRMMode(data.mode) || 'plr_proof');
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
          value={selectedMode}
          onchange={handleModeChange}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          {#each RRM_MODE_OPTIONS as option}
            <option value={option.value} disabled={!option.implemented}>
              {option.label}{option.implemented ? '' : ' (belum aktif)'}
            </option>
          {/each}
        </select>
        <div class="mt-1 text-[9px] text-nord-light leading-tight">
          {RRM_MODE_OPTIONS.find(option => option.value === selectedMode)?.description}
        </div>
      </div>

      {#if selectedMode === 'fhrr_encode'}
        <div>
          <label for={`symbol-${uid}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Symbol</label>
          <input
            id={`symbol-${uid}`}
            value={data.symbol || ''}
            oninput={handleSymbolInput}
            placeholder="contoh: APPLE"
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-2 outline-none focus:border-nord-primary"
          />
        </div>
      {/if}

      {#if executionOutputText}
        <div class="p-2 bg-nord-dark/80 rounded border border-nord-border text-[10px] font-mono text-nord-light max-h-32 overflow-y-auto whitespace-pre-wrap">
          {executionOutputText}
        </div>
      {/if}
    </div>
  {:else if executionOutputText}
    <div class="px-2 py-1 text-[9px] font-mono text-nord-light truncate border-t border-nord-border bg-nord-dark/50">
      ▶ {executionOutputText.slice(0, 30)}...
    </div>
  {/if}

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>
