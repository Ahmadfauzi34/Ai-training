<script lang="ts">
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte'; // + useSvelteFlow
  import { Cpu, Settings, ChevronUp } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts'; // + appState
  import type { ActionNodeData } from '../types';

  // + id
  interface Props {
    id: string;
    data: ActionNodeData;
    isConnectable: boolean;
  }

  let { id, data, isConnectable }: Props = $props();
  const { updateNodeData } = useSvelteFlow(); // + hook

  let expanded = $state(false);
  const uid = crypto.randomUUID(); 

  // Handler Generik untuk Update Data
  function updateField(field: 'model' | 'prompt', value: string) {
    updateNodeData(id, { [field]: value });
    appState.lastChange = Date.now();
  }

  function handleModelChange(event: Event) {
    updateField('model', (event.currentTarget as HTMLSelectElement).value);
  }

  function handlePromptInput(event: Event) {
    updateField('prompt', (event.currentTarget as HTMLTextAreaElement).value);
  }
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-64' : 'border-nord-border w-40'}`}>

  <!-- Header tetap sama -->
  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-warning">
        <Cpu size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate max-w-[80px]">
        {data.label}
      </div>
    </div>
    <button onclick={() => expanded = !expanded} class="text-nord-light hover:text-nord-primary transition cursor-pointer">
      {#if expanded} <ChevronUp size={14} /> {:else} <Settings size={14} /> {/if}
    </button>
  </div>

  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-primary !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  {#if expanded}
    <div class="p-3 space-y-3 bg-nord-bg/95 backdrop-blur animate-in slide-in-from-top-2 duration-200 border-t border-nord-border">

      <!-- MODEL SELECT -->
      <div>
        <label for={`model-${uid}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Model AI</label>
        <select 
          id={`model-${uid}`}
          value={data.model}
          onchange={handleModelChange}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
        </select>
      </div>

      <!-- PROMPT TEXTAREA -->
      <div>
        <label for={`prompt-${uid}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Prompt</label>
        <textarea 
          id={`prompt-${uid}`}
          value={data.prompt}
          oninput={handlePromptInput}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-2 h-24 outline-none focus:border-nord-primary resize-none font-mono text-[10px]"
          placeholder="Instruksi untuk AI..."
        ></textarea>
      </div>

    </div>
  {/if}

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>
