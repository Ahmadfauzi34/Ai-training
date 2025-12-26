<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { Cpu, Settings, ChevronUp } from 'lucide-svelte';

  // Menerima data dari GraphView
  let { data } = $props();

  // State lokal untuk buka/tutup laci
  let expanded = $state(false);

  // ID unik untuk aksesibilitas (menghilangkan warning kuning)
  const id = crypto.randomUUID(); 
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-64' : 'border-nord-border w-40'}`}>

  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-warning">
        <Cpu size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate max-w-[80px]">
        {data.label}
      </div>
    </div>
    <button 
      onclick={() => expanded = !expanded}
      class="text-nord-light hover:text-nord-primary transition cursor-pointer"
    >
      {#if expanded}
        <ChevronUp size={14} />
      {:else}
        <Settings size={14} />
      {/if}
    </button>
  </div>

  <Handle 
    type="target" 
    position={Position.Top} 
    class="!bg-nord-primary !w-4 !h-4 !border-2 !border-nord-bg transition-transform hover:scale-125" 
  />

  {#if expanded}
    <div class="p-3 space-y-3 bg-nord-bg/95 backdrop-blur animate-in slide-in-from-top-2 duration-200 border-t border-nord-border">

      <div>
        <label for={`model-${id}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Model AI</label>
        <select 
          id={`model-${id}`}
          bind:value={data.model}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
        </select>
      </div>

      <div>
        <label for={`prompt-${id}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Prompt</label>
        <textarea 
          id={`prompt-${id}`}
          bind:value={data.prompt}
          class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-2 h-24 outline-none focus:border-nord-primary resize-none font-mono text-[10px]"
          placeholder="Instruksi untuk AI..."
        ></textarea>
      </div>

    </div>
  {/if}

  <Handle 
    type="source" 
    position={Position.Bottom} 
    class="!bg-nord-success !w-4 !h-4 !border-2 !border-nord-bg transition-transform hover:scale-125" 
  />

</div>