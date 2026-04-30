
// src/lib/brain.ts

// Inisialisasi Worker (Pastikan path mengarah ke workers/brain.ts)
const worker = new Worker(new URL('../workers/brain.ts', import.meta.url), {
  type: 'module'
});

// Definisi Tipe Response
interface WorkerResponse {
  success: boolean;
  data?: any;
  error?: string | boolean;
  message?: string;
  id: string;
}

// 👇 INI YANG DICARI VITE: Kata kunci 'export'
export function askBrain(
  path: string, 
  method: string = 'GET', 
  body: any = null 
): Promise<any> {

  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {

    // 1. Timer Timeout (10 Detik)
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', handler);
      reject(new Error("TIMEOUT: Neural Core tidak merespons (10s)."));
    }, 10000);

    const handler = (event: MessageEvent) => {
      const data = event.data as WorkerResponse;

      if (data.id === id) {
        // 2. Matikan Timer
        clearTimeout(timeout);
        worker.removeEventListener('message', handler);

        if (data.success) {
          resolve(data.data);
        } else {
          const errorMsg = data.data?.message || data.error || "Unknown Worker Error";
          resolve({ error: true, message: errorMsg });
        }
      }
    };

    worker.addEventListener('message', handler);

    // Kirim pesan ke Worker
    worker.postMessage({ id, path, method, body });
  });
}