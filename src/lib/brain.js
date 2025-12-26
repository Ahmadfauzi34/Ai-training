// src/lib/brain.js
// Client-side wrapper untuk Worker Hono

// Inisialisasi Worker
const worker = new Worker(new URL('../workers/brain.js', import.meta.url), {
  type: 'module'
})

export function askBrain(path, method = 'GET', body = null) {
  const id = crypto.randomUUID()
  
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      if (event.data.id === id) {
        worker.removeEventListener('message', handler)
        
        // --- LOGIKA BARU YANG DIPERBAIKI ---
        if (event.data.success) {
          // Jika sukses 200 OK
          resolve(event.data.data)
        } else {
          // Jika gagal (400/500), ambil pesan error dari 'data' atau 'error'
          // Hono mengirim error dalam format JSON body, jadi ada di event.data.data
          const errorMsg = event.data.data?.message || event.data.error || "Unknown Worker Error";
          
          resolve({ 
            error: true, 
            message: errorMsg 
          })
        }
      }
    }
    worker.addEventListener('message', handler)
    worker.postMessage({ id, path, method, body })
  })
}
