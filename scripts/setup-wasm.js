import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokasi Source (di node_modules)
const sourceDir = path.resolve(__dirname, '../node_modules/@tensorflow/tfjs-backend-wasm/dist');

// Lokasi Target (di public/tfjs-wasm)
const targetDir = path.resolve(__dirname, '../public/tfjs-wasm');

// 1. Buat folder target jika belum ada
if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir, { recursive: true });
}

// 2. Copy file .wasm
const files = [
    'tfjs-backend-wasm.wasm',
    'tfjs-backend-wasm-simd.wasm',
    'tfjs-backend-wasm-threaded-simd.wasm'
];

files.forEach(file => {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);
    
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✅ Copied: ${file}`);
    } else {
        console.error(`❌ Missing: ${src}`);
    }
});

console.log("🎉 WASM Setup Complete!");