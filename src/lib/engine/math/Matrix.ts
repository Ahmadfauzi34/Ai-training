// src/lib/engine/math/Matrix.ts

export class Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: Float32Array;

  constructor(rows: number, cols: number, data?: Float32Array) {
    this.rows = rows;
    this.cols = cols;
    // Jika data disediakan, pakai itu. Jika tidak, alokasi baru.
    this.data = data || new Float32Array(rows * cols);
  }

  // --- STATIC CONSTRUCTORS ---

  static fromArray(arr: number[]): Matrix {
    const m = new Matrix(arr.length, 1); // Default jadi Kolom Vector (N x 1)
    m.data.set(arr); 
    return m;
  }

  // --- CORE OPERATIONS (HOT PATHS) ---

  /**
   * Perkalian Matriks (Dot Product).
   * @param out (Opsional) Matrix tujuan (Zero Allocation Mode).
   */
  static multiply(a: Matrix, b: Matrix, out?: Matrix): Matrix | null {
    // 1. Validasi Dimensi
    if (a.cols !== b.rows) {
      console.error(`Dimension Mismatch: [${a.rows}x${a.cols}] vs [${b.rows}x${b.cols}]`);
      return null;
    }

    // 2. Siapkan wadah hasil
    let result: Matrix;
    if (out) {
      if (out.rows !== a.rows || out.cols !== b.cols) {
        console.error("Output matrix dimensions do not match result.");
        return null;
      }
      result = out;
    } else {
      result = new Matrix(a.rows, b.cols);
    }

    // Cache properties untuk performa loop
    const aRows = a.rows;
    const aCols = a.cols; 
    const bCols = b.cols;
    const aData = a.data;
    const bData = b.data;
    const resData = result.data;

    // 3. The Hot Loop (Optimized via IKJ iteration order for Cache Locality)
    // By reordering loops from I-J-K to I-K-J, we iterate linearly over B matrix
    // in the inner loop, significantly improving CPU cache utilization without extra allocations.
    resData.fill(0); // Zero output before accumulation
    for (let i = 0; i < aRows; i++) {
      const i_aCols = i * aCols;
      const i_bCols = i * bCols;
      for (let k = 0; k < aCols; k++) {
        const valA = aData[i_aCols + k]!;
        const k_bCols = k * bCols;
        for (let j = 0; j < bCols; j++) {
          resData[i_bCols + j] += valA * bData[k_bCols + j]!;
        }
      }
    }

    return result;
  }

  // --- ARITHMETIC OPERATIONS ---

  /**
   * Penjumlahan Matrix (Element-wise).
   */
  static add(a: Matrix, b: Matrix, out?: Matrix): Matrix | null {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      console.error("Dimension mismatch for add");
      return null;
    }

    let result = out || new Matrix(a.rows, a.cols);
    
    // Safety check
    if (result.data.length !== a.data.length) { 
        result = new Matrix(a.rows, a.cols);
    }

    for (let i = 0; i < a.data.length; i++) {
      result.data[i] = a.data[i]! + b.data[i]!;
    }
    return result;
  }

  /**
   * Pengurangan Matrix (Element-wise).
   */
  static subtract(a: Matrix, b: Matrix, out?: Matrix): Matrix | null {
    if (a.rows !== b.rows || a.cols !== b.cols) {
      console.error("Dimension mismatch for subtract");
      return null;
    }

    let result = out || new Matrix(a.rows, a.cols);
    
    for (let i = 0; i < a.data.length; i++) {
      result.data[i] = a.data[i]! - b.data[i]!;
    }
    return result;
  }

  // --- VECTOR / RAG OPERATIONS ---

  get magnitude(): number {
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      const val = this.data[i]!;
      sum += val * val;
    }
    return Math.sqrt(sum);
  }

  // Normalisasi (In-Place Mutation)
  normalize(): this {
    const mag = this.magnitude;
    if (mag === 0) return this; 

    const invMag = 1.0 / mag; 
    for (let i = 0; i < this.data.length; i++) {
      this.data[i]! *= invMag;
    }
    return this;
  }

  // Transpose (Putar Dimensi)
  transpose(out?: Matrix): Matrix {
    let result: Matrix;
    if (out) {
      if (out.rows !== this.cols || out.cols !== this.rows) {
         console.error("Output matrix dimensions mismatch for transpose.");
         result = new Matrix(this.cols, this.rows);
      } else {
        result = out;
      }
    } else {
      result = new Matrix(this.cols, this.rows);
    }

    const rows = this.rows;
    const cols = this.cols;
    const thisData = this.data;
    const resData = result.data;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        resData[j * rows + i] = thisData[i * cols + j]!;
      }
    }
    return result;
  }

  static dot(a: Matrix, b: Matrix): number {
    if (a.data.length !== b.data.length) return 0;
    let sum = 0;
    for (let i = 0; i < a.data.length; i++) {
      sum += a.data[i]! * b.data[i]!;
    }
    return sum;
  }

  // --- UTILS ---

  randomize(): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Math.random() * 2 - 1;
    }
  }
  
  map(func: (val: number) => number): this {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = func(this.data[i]!);
    }
    return this;
  }

  toArray(): number[] {
    return Array.from(this.data); 
  }
  
  print(label: string = "Matrix"): void {
    console.log(`--- ${label} [${this.rows}x${this.cols}] ---`);
    // Tampilkan max 10 baris biar console ga penuh
    const limit = Math.min(this.rows, 10);
    for(let i=0; i<limit; i++) {
        const rowStart = i * this.cols;
        const rowEnd = rowStart + this.cols;
        console.log(this.data.subarray(rowStart, rowEnd));
    }
  }
}