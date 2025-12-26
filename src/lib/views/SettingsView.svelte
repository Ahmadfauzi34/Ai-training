<script>
  import { onMount } from 'svelte';
  import { Save, Key } from 'lucide-svelte';

  // State lokal untuk form ini
  let apiKey = $state('');

  // Ambil key dari localStorage saat komponen dimuat
  onMount(() => {
    apiKey = localStorage.getItem('gemini_key') || '';
  });

  function saveKey() {
    localStorage.setItem('gemini_key', apiKey);
    alert('✅ API Key berhasil disimpan!');
  }
</script>

<div class="p-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 pt-10">
  <div class="flex items-center gap-3 mb-6 border-b border-nord-border pb-3">
    <div class="p-2 bg-nord-primary/20 rounded-lg text-nord-primary">
      <Key size={24} />
    </div>
    <h2 class="text-2xl font-bold text-nord-text">Konfigurasi Neural Core</h2>
  </div>

  <div class="bg-nord-panel p-6 rounded-xl border border-nord-border shadow-xl">
    <label class="block text-xs font-mono text-nord-primary mb-2 font-bold uppercase tracking-wider">
      Google Gemini API Key
    </label>

    <div class="flex gap-2">
      <input 
        type="password" 
        bind:value={apiKey}
        placeholder="Mulai dengan AIza..."
        class="flex-1 bg-nord-bg border border-nord-border rounded-lg p-3 text-sm focus:border-nord-primary focus:ring-1 focus:ring-nord-primary outline-none text-nord-text transition-all"
      />
      <button 
        onclick={saveKey} 
        class="bg-nord-success text-nord-bg px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
      >
        <Save size={18} />
        Simpan
      </button>
    </div>

    <div class="mt-4 flex items-start gap-2 p-3 bg-nord-bg/50 rounded border border-nord-border/50">
      <div class="text-nord-warning mt-0.5">⚠️</div>
      <div class="text-[10px] text-nord-light leading-relaxed">
        Key disimpan di <strong>LocalStorage</strong> browser Anda. Aman untuk penggunaan lokal.
      </div>
    </div>
  </div>
</div>
