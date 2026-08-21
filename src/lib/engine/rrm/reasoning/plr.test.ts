import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLRKernel } from './PLRKernel.ts';
import { RRMNodeAdapter } from '../index.ts';

describe('PLRKernel & Proof State Reasoning', () => {
  it('initializes proof state with goal and premises correctly', () => {
    const plr = new PLRKernel();
    plr.setGoal('Sistem RRM terbukti konsisten');
    plr.addPremise('Semua VSA hypervectors beroperasi pada aljabar FHRR branchless');
    plr.addEvidence('Hasil tes fisik menunjukkan resonansi L2 konstan');

    const state = plr.evaluateProof();

    assert.equal(state.premises.length, 1);
    assert.equal(state.evidence.length, 1);
    assert.equal(state.goal?.content, 'Sistem RRM terbukti konsisten');
    assert.ok(state.status === 'UNRESOLVED' || state.status === 'SUPPORTED' || state.status === 'DERIVED');
  });

  it('performs derivation and validates explicitly declared dependencies', () => {
    const plr = new PLRKernel();
    plr.setGoal('Engine V76 siap produksi');
    const p1 = plr.addPremise('Pengujian V8 zero-allocation lulus');
    const e1 = plr.addEvidence('Coverage tes mencapai kriteria ketat');

    const deriv = plr.derive([p1.id, e1.id], 'MODUS_PONENS', 'Stabilitas engine terverifikasi');

    assert.ok(deriv !== null);
    assert.equal(deriv?.content, 'Stabilitas engine terverifikasi');

    const summary = plr.compileAnswerSummary();
    assert.ok(summary.includes('=== PROOF STATE REASONING (PLR / FHRR) ==='));
    assert.ok(summary.includes('MODUS_PONENS'));
  });

  it('runs RRMNodeAdapter.runProofState properly with text context', () => {
    const context = "RRM Engine menggunakan VSA FHRR.\n" +
                    "Setiap vektor berdimensi 8192 Float32Array.\n" +
                    "Sistem berjalan tanpa alokasi dinamis di loop utama.";

    const result = RRMNodeAdapter.runProofState(context, 'Verifikasi Stabilitas RRM Engine');

    assert.ok(result.includes('STATUS:'));
    assert.ok(result.includes('PREMISES'));
  });
});
