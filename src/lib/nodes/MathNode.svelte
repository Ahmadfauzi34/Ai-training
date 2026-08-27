<script lang="ts">
  import { useSvelteFlow, Handle, Position } from '@xyflow/svelte';
  import { Calculator, Settings, ChevronUp, Grid3X3 } from 'lucide-svelte';
  import { appState } from '../state.svelte.ts';
  import { Matrix } from '../engine/math/Matrix';
  import type { MatrixNodeData } from '../types';

  interface Props {
    id: string;
    data: MatrixNodeData;
    isConnectable: boolean;
  }

  let { id, data, isConnectable }: Props = $props();
  const { updateNodeData } = useSvelteFlow();

  let expanded = $state(false);

  let rawInput = $state('');

  function parseNumbers(text: string) {
    return text
      .split(/[\s,]+/)
      .filter(s => s.trim() !== '')
      .map(Number)
      .filter(n => !isNaN(n));
  }

  // Sinkronisasi: Jika data dari luar berubah, update input lokal
  // Kita hanya update rawInput jika secara matematis nilainya berbeda
  // Ini mencegah kursor melompat dan hilangnya karakter pemisah (koma/spasi) saat mengetik
  $effect(() => {
    const externalValues = data.defaultValue || [];
    const currentValues = parseNumbers(rawInput);

    const isDifferent = currentValues.length !== externalValues.length ||
                        currentValues.some((v, i) => v !== externalValues[i]);

    if (isDifferent) {
      rawInput = externalValues.join(', ');
    }
  });

  // Ambil hasil dari Global State
  let resultMatrix = $derived(appState.executionResults[id] as Matrix | null | undefined);

  function updateOperation(operation: NonNullable<MatrixNodeData['operation']>) {
    updateNodeData(id, { operation });
    appState.lastChange = Date.now();
  }

  function updateDimension(field: 'rows' | 'cols', value: string) {
    updateNodeData(id, { [field]: Number.parseInt(value, 10) || 1 });
    appState.lastChange = Date.now();
  }

  function handleOperationChange(event: Event) {
    const operation = (event.currentTarget as HTMLSelectElement).value as NonNullable<MatrixNodeData['operation']>;
    updateOperation(operation);
  }

  function handleRowsInput(event: Event) {
    updateDimension('rows', (event.currentTarget as HTMLInputElement).value);
  }

  function handleColsInput(event: Event) {
    updateDimension('cols', (event.currentTarget as HTMLInputElement).value);
  }

  function handleValueInput(event: Event) {
    const text = (event.currentTarget as HTMLTextAreaElement).value;
    rawInput = text; // Update UI lokal langsung biar responsif

    const numberArray = parseNumbers(text);
    updateNodeData(id, { defaultValue: numberArray });
    appState.lastChange = Date.now();
  }
</script>

<div class={`shadow-xl rounded-lg border-2 transition-all duration-300 bg-nord-panel ${expanded ? 'border-nord-primary w-64' : 'border-nord-border w-48'}`}>

  <!-- HEADER -->
  <div class="flex items-center justify-between p-2 bg-nord-dark rounded-t-md">
    <div class="flex items-center gap-2">
      <div class="p-1 bg-nord-bg rounded text-nord-primary">
        <Calculator size={14} />
      </div>
      <div class="text-xs font-bold text-nord-text truncate">
        {data.label || 'Math Op'}
      </div>
    </div>
    <button 
      onclick={() => expanded = !expanded}
      class="text-nord-light hover:text-nord-primary transition cursor-pointer"
      aria-label={expanded ? 'Collapse settings' : 'Expand settings'}
    >
      {#if expanded} <ChevronUp size={14} /> {:else} <Settings size={14} /> {/if}
    </button>
  </div>

  <Handle type="target" position={Position.Left} isConnectable={isConnectable} class="!bg-nord-primary !w-3 !h-6 !rounded-sm !border-none -ml-1.5 z-50" />

  <div class="p-3 bg-nord-bg/50">
    {#if !expanded}
      <div class="flex items-center justify-between text-[10px] text-nord-light font-mono">
        <span class="uppercase bg-nord-dark px-1 rounded">{data.operation || 'OP'}</span>
        <span>[{data.rows || 1} x {data.cols || 1}]</span>
      </div>
    {/if}

    {#if expanded}
      <div class="space-y-3 animate-in slide-in-from-top-2 duration-200">

        <div>
          <label for={`op-${id}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Operation</label>
          <select 
            id={`op-${id}`}
            value={data.operation || 'multiply'}
            onchange={handleOperationChange}
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 outline-none focus:border-nord-primary"
          >
            <option value="multiply">Multiply (Perkalian)</option>
            <option value="add">Add (Penjumlahan)</option>
            <option value="subtract">Subtract (Pengurangan)</option>
            <option value="transpose">Transpose (Putar)</option>
          </select>
        </div>

        <div class="flex gap-2">
          <div class="flex-1">
            <label for={`rows-${id}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Rows</label>
            <input 
              id={`rows-${id}`}
              type="number" min="1"
              value={data.rows || 1}
              oninput={handleRowsInput}
              class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 text-center outline-none focus:border-nord-primary"
            />
          </div>
          <div class="flex items-end pb-2 text-nord-light">x</div>
          <div class="flex-1">
            <label for={`cols-${id}`} class="text-[9px] font-mono text-nord-light uppercase block mb-1">Cols</label>
            <input 
              id={`cols-${id}`}
              type="number" min="1"
              value={data.cols || 1}
              oninput={handleColsInput}
              class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-1 text-center outline-none focus:border-nord-primary"
            />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label for={`vals-${id}`} class="text-[9px] font-mono text-nord-light uppercase">Values</label>
            <Grid3X3 size={10} class="text-nord-light" />
          </div>
          <textarea 
            id={`vals-${id}`}
            value={rawInput}
            oninput={handleValueInput}
            class="nodrag w-full bg-nord-dark border border-nord-border rounded text-xs text-nord-text p-2 h-20 outline-none focus:border-nord-primary resize-none font-mono text-[10px]"
            placeholder="Contoh: 1, 0, 0, 1"
          ></textarea>
          <div class="text-[9px] text-nord-light/50 text-right mt-1">
            Total: {data.defaultValue?.length || 0} items
          </div>
        </div>

      </div>
    {/if}

    <!-- VISUALISASI HASIL -->
    {#if resultMatrix && resultMatrix.rows && resultMatrix.cols}
      <div class="mt-2 pt-2 border-t border-nord-border">
        <div class="text-[9px] text-nord-success font-bold mb-1 flex justify-between">
          <span>RESULT</span>
          <span>[{resultMatrix.rows} x {resultMatrix.cols}]</span>
        </div>
        <div 
          class="grid gap-1 p-1 bg-nord-dark rounded overflow-auto max-h-32 nodrag"
          style="grid-template-columns: repeat({resultMatrix.cols}, minmax(0, 1fr));"
        >
          {#each resultMatrix.data as val}
            <div class="text-[9px] text-center py-1 px-0.5 bg-nord-panel rounded text-nord-text font-mono truncate" title={String(val)}>
              {val.toFixed(2)}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <Handle type="source" position={Position.Right} isConnectable={isConnectable} class="!bg-nord-success !w-3 !h-6 !rounded-sm !border-none -mr-1.5 z-50" />

</div>
