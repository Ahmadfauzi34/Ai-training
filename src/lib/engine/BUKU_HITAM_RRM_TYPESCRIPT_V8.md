# 📜 BUKU HITAM ARSITEKTUR RRM - TYPESCRIPT V8 EDITION
**Katalog Dosa-Dosa Performa untuk Engine V8: Hidden Classes, JIT, dan Memory**

> Versi: 4.0-TypeScript  
> Domain: Node.js, Browser, Deno, Bun - JIT-Compiled JavaScript  
> Engine Target: V8 (Ignition → Sparkplug → Maglev → TurboFan)  
> Constraint: GC-managed, dynamic typing, but deterministic optimization

---

## ⚠️ FILOSOFI V8: "Shape is Everything"

V8 adalah engine **speculative optimizing JIT**. Ia membuat asumsi tentang code-mu, mengcompile ke machine code, dan **deoptimize** jika asumsi salah. Cost deoptimization: **2x-100x slowdown** [^4^].

> *"V8 rewards predictable, stable object shapes and punishes dynamic, unpredictable ones"* [^4^]

---

## 🚫 DOSA TS1: "Hidden Class Assassination (Shape Mutation)"

### Bentuk Dosa
```typescript
// Dosa: Property order tidak konsisten = different hidden classes
const user1 = { name: "Alice", email: "a@b.com" };
const user2 = { email: "b@c.com", name: "Bob" }; // Different shape!

// Dosa: Dynamic property addition
const obj: any = { x: 1, y: 2 };
if (condition) {
    obj.z = 3; // New hidden class transition!
}

// Dosa: Delete property (Dictionary Mode)
delete obj.y; // GAME OVER - object jadi hash table [^3^]
```

### Kenapa Menghancurkan Mesin?
- **Hidden Class Transition**: Tiap property order/add/delete = new map [^7^]
- **Megamorphic IC**: >4 shapes = inline cache give up, jadi slow lookup [^5^]
- **Dictionary Mode**: `delete` memaksa V8 pakai hash table, property access 10x slower [^3^]

### Penebusan Dosa (Monomorphic Shapes)
```typescript
// ✅ Benar: Consistent property order dan complete initialization
interface Entity {
    x: number;
    y: number;
    z: number | null; // Always present, null jika tidak used
    mass: number;
    active: boolean;
}

function createEntity(x: number, y: number, z?: number): Entity {
    return {
        x,           // Property 1
        y,           // Property 2  
        z: z ?? null, // Property 3 - always present!
        mass: 1.0,    // Property 4
        active: true  // Property 5
    };
}

// ✅ Benar: Object pooling untuk shape stability
class EntityPool {
    private pool: Entity[] = [];
    private capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        // Pre-allocate dengan shape yang sama
        for (let i = 0; i < capacity; i++) {
            this.pool.push({
                x: 0, y: 0, z: null, mass: 0, active: false
            });
        }
    }

    acquire(): Entity {
        const entity = this.pool.pop() || this.createNew();
        entity.active = true;
        return entity;
    }

    release(entity: Entity): void {
        entity.active = false;
        entity.mass = 0;
        // Reset lainnya tapi jangan delete property!
        this.pool.push(entity);
    }

    private createNew(): Entity {
        // Fallback: tetap sama shape
        return { x: 0, y: 0, z: null, mass: 0, active: false };
    }
}

// ✅ Benar: Array of homogeneous objects (SOA philosophy di JS)
class EntityManifoldTS {
    xs: Float64Array;        // TypedArray = shape stable
    ys: Float64Array;
    masses: Float64Array;
    actives: Uint8Array;

    constructor(capacity: number) {
        this.xs = new Float64Array(capacity);
        this.ys = new Float64Array(capacity);
        this.masses = new Float64Array(capacity);
        this.actives = new Uint8Array(capacity);
    }

    // Monomorphic access - V8 bisa optimize
    getX(i: number): number { return this.xs[i]; }
    setX(i: number, v: number): void { this.xs[i] = v; }
}
```

### Kapan Boleh Melanggar?
- **Cold code**: Initialization, config parsing (jarang dieksekusi)
- **Dynamic schema**: Jika memang butuh runtime property discovery (tapi expect slow)

---

## 🚫 DOSA TS2: "Type Polymorphism di Hot Path"

### Bentuk Dosa
```typescript
// Dosa: Function menerima multiple types
function processValue(val: number | string | boolean): number {
    if (typeof val === 'number') return val * 2;
    if (typeof val === 'string') return val.length;
    return val ? 1 : 0;
}

// Dosa: Array heterogeneous (Smi vs Double vs Object)
const arr: any[] = [1, 2, 3]; // Packed Smi array (fast)
arr.push(4.5); // Transition ke Double array (slower)
arr.push("x"); // Transition ke generic array (slowest) [^4^]
```

### Kenapa Menghancurkan Mesin?
- **Type Feedback**: V8 compile berdasakan type yang dilihat pertama kali [^8^]
- **Deopt trigger**: Type berbeda = "wrong map" bailout [^9^]
- **Element kind transition**: Array downgrade dari Smi → Double → Object [^4^]

### Penebusan Dosa (Monomorphic Types)
```typescript
// ✅ Benar: Separate functions per type (monomorphic)
function processNumber(val: number): number {
    return val * 2; // V8 optimize untuk number saja
}

function processString(val: string): number {
    return val.length;
}

function processBoolean(val: boolean): number {
    return val ? 1 : 0;
}

// ✅ Benar: Tagged union dengan discriminant (type-safe + optimizable)
type Entity = 
    | { kind: 'particle'; x: number; y: number; mass: number }
    | { kind: 'field'; strength: number; radius: number }
    | { kind: 'empty' };

function processEntity(e: Entity): number {
    // V8 bisa optimize: shape consistent (kind di offset sama)
    switch (e.kind) {
        case 'particle': return e.mass;
        case 'field': return e.strength;
        case 'empty': return 0;
    }
}

// ✅ Benar: TypedArray untuk numerical batch processing
function processBatch(arr: Float64Array): void {
    // Guaranteed monomorphic: semua number (double)
    for (let i = 0; i < arr.length; i++) {
        arr[i] *= 2.5; // V8 SIMD optimize
    }
}

// ✅ Benar: Array pre-allocate dengan correct type
const particles: Array<{x: number, y: number}> = [];
// Pre-allocate capacity untuk avoid growth transition
particles.length = 1000;
particles.fill({x: 0, y: 0});
// Sekarang assign: tidak trigger transition
for (let i = 0; i < 1000; i++) {
    particles[i] = {x: i * 1.0, y: i * 2.0}; // Same shape
}
```

### Kapan Boleh Melanggar?
- **API boundary**: Input validation bisa polymorphic, tapi convert ke internal format
- **Error handling**: Exception path boleh slow

---

## 🚫 DOSA TS3: "Closure Allocation di Loop Kritis"

### Bentuk Dosa
```typescript
// Dosa: Arrow function allocation per iterasi
function processEntities(entities: Entity[]) {
    return entities.map(e => {
        // Arrow function baru dibuat tiap panggilan!
        return transform(e);
    });
}

// Dosa: Capture variable yang tidak perlu
for (let i = 0; i < 1000000; i++) {
    const factor = 2.0; // Could be const outside
    const result = entities.map(e => e.x * factor); // Capture factor tiap iterasi!
}
```

### Kenapa Menghancurkan Mesin?
- **GC Pressure**: Tiap closure = object allocation di heap [^5^]
- **Hidden Class**: Closure punya hidden class sendiri (context capture)
- **Inline fail**: V8 tidak bisa inline function yang terlalu complex

### Penebusan Dosa (Function Hoisting + Iterators)
```typescript
// ✅ Benar: Function declaration di luar loop (reusable)
function transformEntity(e: Entity): Entity {
    return {
        x: e.x * 2,
        y: e.y * 2,
        z: e.z,
        mass: e.mass,
        active: e.active
    };
}

function processEntitiesFast(entities: Entity[]): Entity[] {
    const result = new Array(entities.length);
    for (let i = 0; i < entities.length; i++) {
        result[i] = transformEntity(entities[i]); // Monomorphic call
    }
    return result;
}

// ✅ Benar: Generator untuk lazy iteration (no intermediate array)
function* activeEntities(entities: Entity[]): Generator<Entity> {
    for (const e of entities) {
        if (e.active) yield e;
    }
}

// Usage: no allocation untuk intermediate array
for (const e of activeEntities(entities)) {
    process(e);
}

// ✅ Benar: Manual loop untuk hot path (no iterator overhead)
function updatePositions(entities: EntityManifoldTS): void {
    const xs = entities.xs;
    const ys = entities.ys;
    const actives = entities.actives;

    // V8 optimize: linear access, no function call
    for (let i = 0; i < xs.length; i++) {
        if (actives[i]) {
            xs[i] += 1.0;
            ys[i] += 1.0;
        }
    }
}
```

### Kapan Boleh Melanggar?
- **Readability**: Non-hot path, map/filter/reduce OK
- **Functional style**: Business logic, bukan inner loop

---

## 🚫 DOSA TS4: "Megamorphic Property Access"

### Bentuk Dosa
```typescript
// Dosa: Dynamic property access dengan bracket notation
function getProperty(obj: any, prop: string): any {
    return obj[prop]; // Megamorphic - could be any property!
}

// Dosa: Prototype chain traversal
class A { x = 1; }
class B extends A { y = 2; }
class C extends B { z = 3; }

function process(obj: A) {
    return obj.x + (obj as any).y + (obj as any).z; // Prototype walk!
}
```

### Kenapa Menghancurkan Mesin?
- **Inline Cache miss**: `obj[prop]` tidak bisa cache, property unknown [^7^]
- **Prototype chain**: Tiak level = memory indirection [^4^]
- **Polymorphic IC**: >4 object types = megamorphic (no optimization)

### Penebusan Dosa (Direct Property Access)
```typescript
// ✅ Benar: Direct dot access (monomorphic IC)
interface Point { x: number; y: number; }

function distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x; // Fast: offset known
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ✅ Benar: Flatten object, avoid deep prototype
interface EntityFlat {
    // Flatten dari hierarchy
    posX: number;
    posY: number;
    velX: number;
    velY: number;
    mass: number;
    // ... no prototype chain
}

// ✅ Benar: Struct-like dengan known offsets
class Particle {
    // Public fields = predictable memory layout
    x: number = 0;
    y: number = 0;
    vx: number = 0;
    vy: number = 0;
    mass: number = 1.0;

    update(): void {
        // V8 optimize: inline property access
        this.x += this.vx;
        this.y += this.vy;
    }
}

// ✅ Benar: Switch untuk property selection (bukan dynamic access)
function getComponent(e: Entity, component: 'x' | 'y' | 'mass'): number {
    // V8 bisa optimize: switch adalah constant-time
    switch (component) {
        case 'x': return e.x;
        case 'y': return e.y;
        case 'mass': return e.mass;
    }
}
```

### Kapan Boleh Melanggar?
- **Reflection**: JSON parsing, serialization (jarang dieksekusi)
- **Plugin system**: Dynamic loading dengan expect slow

---

## 🚫 DOSA TS5: "Array Hole dan Sparse Array"

### Bentuk Dosa
```typescript
// Dosa: Holey array (sparse)
const arr: number[] = [];
arr[0] = 1;
arr[1000] = 2; // Creates hole! [^4^]

// Dosa: Delete dari array
delete arr[0]; // Hole created!

// Dosa: Array length manipulation
arr.length = 10000; // Holey array
```

### Kenapa Menghancurkan Mesin?
- **Holey elements**: V8 pakai different backing store (slower) [^4^]
- **Bounds check**: Tiap access harus check hole vs undefined
- **No SIMD**: Holey array tidak bisa vectorize

### Penebusan Dosa (Packed Arrays + TypedArray Optimization)

#### ⚠️ KRITICAL: Float32Array vs Float64Array

**Pilih berdasarkan use case, bukan asumsi "lebih kecil = lebih cepat":**

| Kriteria | Float64Array | Float32Array |
|----------|-------------|--------------|
| **V8 Native** | ✅ JS `number` = double (no conversion) | ❌ Convert up/down tiap access |
| **Pure JS Compute** | ✅ **2-15% faster** | ❌ Conversion tax |
| **WebGL/GPU Upload** | ❌ Must convert | ✅ **Native GPU format** |
| **Memory Bandwidth** | ❌ 2× memory | ✅ 2× density, cache friendly |
| **SIMD Throughput** | 4-wide (AVX2) / 8-wide (AVX-512) | 8-wide (AVX2) / 16-wide (AVX-512) |

**Rule of Thumb:**
- **Float64Array**: Untuk physics engine, simulation, heavy computation di JS
- **Float32Array**: Untuk renderer, GPU buffers, neural network weights, audio processing

```typescript
// ✅ Benar: Float64Array untuk pure V8 computation (no conversion tax)
class PhysicsEngine {
    positions: Float64Array;  // Best: update loop di JS, no GPU
    velocities: Float64Array;

    update(): void {
        for (let i = 0; i < this.positions.length; i++) {
            // Direct double arithmetic, no conversion
            this.positions[i] += this.velocities[i] * 0.016;
        }
    }
}

// ✅ Benar: Float32Array untuk GPU interop
class Renderer {
    vertices: Float32Array;   // Best: WebGL buffer, zero-copy upload

    upload(gl: WebGLRenderingContext): void {
        // No conversion needed untuk GPU
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    }
}

// ✅ Benar: Hybrid approach - compute di Float64, convert sekali ke Float32
class PhysicsRenderer {
    private physics: Float64Array;  // Fast V8 computation
    private render: Float32Array;   // GPU-ready format

    updateAndRender(): void {
        // Step 1: Compute di Float64 (fastest untuk V8)
        for (let i = 0; i < this.physics.length; i++) {
            this.physics[i] = this.compute(this.physics[i]);
        }

        // Step 2: Batch convert sekali per frame (amortized cost)
        for (let i = 0; i < this.physics.length; i++) {
            this.render[i] = this.physics[i];  // Double → float
        }

        // Step 3: Upload ke GPU
        this.uploadToGPU(this.render);
    }
}
```

#### Packed Array Patterns

```typescript
// ✅ Benar: Dense array dengan pre-allocation
const arr = new Array(1000); // length = 1000, tapi holey!
// Isi semua slot untuk jadi packed:
for (let i = 0; i < 1000; i++) {
    arr[i] = 0; // Now packed SMI/Double array
}

// ✅ Benar: TypedArray (selalu dense, no holes)
const xs = new Float64Array(1000); // Pre-filled with 0
const actives = new Uint8Array(1000);

// ✅ Benar: Array sebagai queue dengan head/tail pointer (no shift)
class RingBuffer<T> {
    private buffer: T[];
    private head = 0;
    private tail = 0;
    private size = 0;

    constructor(capacity: number) {
        this.buffer = new Array(capacity);
    }

    push(item: T): void {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.buffer.length;
        this.size++;
    }

    shift(): T | undefined {
        if (this.size === 0) return undefined;
        const item = this.buffer[this.head];
        this.buffer[this.head] = undefined as any; // Allow GC
        this.head = (this.head + 1) % this.buffer.length;
        this.size--;
        return item;
    }
}

// ✅ Benar: Mark 'empty' dengan sentinel value, bukan hole
const EMPTY = -999999; // Sentinel
const grid = new Int32Array(1000);
grid.fill(EMPTY); // Packed, no holes

function isEmpty(val: number): boolean {
    return val === EMPTY;
}
```

### Kapan Boleh Melanggar?
- **Large sparse data**: Hash map lebih appropriate (Map/Set)
- **Associative array**: Gunakan Object/Map, bukan Array

## 🚫 DOSA TS6: "Deoptimization Trigger di Hot Loop"

### Bentuk Dosa
```typescript
// Dosa: Try-catch di hot loop (historical issue, tapi tetap hati-hati)
function processLoop(items: Item[]) {
    for (const item of items) {
        try {
            riskyOperation(item);
        } catch (e) {
            // Deopt trigger di V8 lama, tapi modern V8 OK [^4^]
        }
    }
}

// Dosa: Arguments object (NEVER use!)
function sum(): number {
    let total = 0;
    for (let i = 0; i < arguments.length; i++) { // Arguments = deopt magnet!
        total += arguments[i];
    }
    return total;
}

// Dosa: eval / with (unoptimizable!)
function dynamicCode(obj: any) {
    with (obj) { // V8 give up!
        return x + y;
    }
}
```

### Kenapa Menghancurkan Mesin?
- **Arguments object**: Array-like tapi bukan array, magic properties [^4^]
- **eval/with**: Black box untuk compiler, cannot optimize [^4^]
- **Try-catch**: Modern V8 OK, tapi tetap overhead [^4^]

### Penebusan Dosa (Optimizable Patterns)
```typescript
// ✅ Benar: Rest parameters (modern, optimizable)
function sumModern(...args: number[]): number {
    let total = 0;
    for (const arg of args) {
        total += arg;
    }
    return total;
}

// ✅ Benar: Error handling di luar hot loop
function processBatch(items: Item[]): Result {
    const results: Result[] = [];

    // Hot loop: no try-catch
    for (const item of items) {
        if (!isValid(item)) {
            return { error: 'Invalid item' }; // Early return
        }
        results.push(fastProcess(item));
    }

    return { data: results };
}

// ✅ Benar: No dynamic code execution
function getProperty(obj: { x: number; y: number }, key: 'x' | 'y'): number {
    return obj[key]; // Inline cache bisa handle (known keys)
}

// ✅ Benar: Function dengan consistent return type
function calculate(a: number, b: number): number {
    // V8 optimize: selalu return number
    if (b === 0) return 0; // Consistent type
    return a / b;
}
```

### Kapan Boleh Melanggar?
- **Error boundaries**: Top-level error handling (jarang dieksekusi)
- **Dynamic loading**: Plugin system (expect slow)

---

## 🛠️ TOOLING: Profiling & Debugging V8

### 1. Chrome DevTools / Node.js Profiling
```bash
# Trace deoptimization
node --trace-deopt app.js

# Trace inline cache (IC) state
node --trace-ic app.js

# Trace hidden class transitions
node --trace-maps app.js

# Full optimization log
node --trace-opt --trace-deopt app.js
```

### 2. TypeScript Compiler Flags (Performance)
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",        // Modern JS = better V8 optimization
    "module": "ESNext",
    "strict": true,            // Type safety = less dynamic checks
    "noImplicitAny": true,     // Prevent polymorphic any
    "downlevelIteration": false // Native iteration (faster)
  }
}
```

### 3. Runtime Type Checking (Development Only)
```typescript
// Strip di production dengan babel-plugin-transform-remove-console
function assertShape<T>(obj: T, keys: (keyof T)[]): void {
    if (process.env.NODE_ENV === 'development') {
        for (const key of keys) {
            if (!(key in (obj as any))) {
                console.warn(`Shape mismatch: missing ${String(key)}`);
            }
        }
    }
}
```

### 4. Benchmarking Pattern
```typescript
// Warmup: V8 perlu beberapa iterasi untuk optimize
function benchmark<T>(fn: () => T, iterations: number = 100000): number {
    // Warmup
    for (let i = 0; i < 1000; i++) fn();

    // Measure
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    const end = performance.now();

    return (end - start) / iterations;
}

// Cek deopt dengan --trace-deopt
```

---

## 📊 CHEAT SHEET: Hidden Class Friendly vs Enemy

| Friendly ✅ | Enemy ❌ |
|------------|---------|
| `{x, y, z}` semua property ada | `{x, y}` lalu tambah `z` |
| Property order consistent | Property order random |
| `obj.prop = null` | `delete obj.prop` |
| `class` dengan fields declared | `this.newField = x` di constructor |
| `number[]` (packed) | `arr[1000] = x` (holey) |
| Direct `obj.x` access | `obj[dynamicKey]` |
| Monomorphic functions | Polymorphic arguments |
| Flat objects (no prototype) | Deep inheritance chains |
| `const arr = [1,2,3]` (packed Smi) | `arr.push(1.5)` (transition to Double) |

---

## 🎯 CHECKLIST: Code V8-Ready?

- [ ] Semua object punya shape yang consistent (property order, no dynamic add)
- [ ] Tidak ada `delete` operator di hot path
- [ ] Array selalu packed (no holes, no sparse indices)
- [ ] Function monomorphic: 1 type per argument di hot path
- [ ] No `arguments` object, pakai rest parameters
- [ ] No `eval` atau `with`
- [ ] Property access: dot notation > bracket notation
- [ ] TypedArray untuk numerical batch processing
- [ ] Pre-allocate array dengan length known
- [ ] Profiling dengan `--trace-deopt` tidak menunjukkan bailout

---

## 🔥 KESIMPULAN

TypeScript/V8 programming adalah **cooperation dengan JIT compiler**:
- Tulis code yang **predictable** (stable shapes, monomorphic types)
- Hindari **dynamic patterns** yang V8 tidak bisa optimize
- Profile dengan **V8 flags** untuk deteksi deoptimization

> *"V8 adalah engine yang sangat cepat untuk code yang boring. Jadikan code-mu boring untuk V8."* — Arsitek V8 TS

---

**License: MIT**  
**Maintainer: Core Team RRM**  
**Kontribusi: Benchmark dengan `--trace-deopt` wajib untuk PR**
