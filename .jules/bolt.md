
## 2024-05-18 - Matrix Multiplication Bottleneck
**Learning:** In V8 / Node.js 22, the standard naive I-J-K matrix multiplication is subject to poor memory access patterns for the inner loop over the second matrix. Transposing the second matrix B so that the inner loop iterates continuously in memory over the transposed matrix results in ~20% faster execution for larger matrices. Transposing has minimal overhead relative to N^3 matrix multiplication, but produces better cache coherence.
**Action:** Always optimize large array iterations for linear memory access. Implement transpose logic internally to Matrix multiply to eliminate cross-row jumps inside the inner product loop.
