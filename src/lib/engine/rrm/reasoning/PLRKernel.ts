// src/lib/engine/rrm/reasoning/PLRKernel.ts

import { GLOBAL_DIMENSION } from '../core/config.ts';
import { FHRR } from '../core/fhrr.ts';

/**
 * Interface untuk Proof State sesuai spesifikasi PLR (Agents.md)
 */
export interface ProofProposition {
  id: string;
  type: 'GOAL' | 'PREMISE' | 'EVIDENCE' | 'ASSUMPTION' | 'DERIVATION';
  content: string;
  vector: Float32Array;
  status: 'ASSERTED' | 'EVIDENCE' | 'ASSUMED' | 'DERIVED' | 'CONTRADICTED' | 'UNRESOLVED';
  dependencies?: string[];
  rule?: string;
}

export interface DerivationRule {
  fromIds: string[];
  ruleName: string;
  yieldsContent: string;
}

export interface ProofState {
  goal: ProofProposition | null;
  premises: ProofProposition[];
  evidence: ProofProposition[];
  assumptions: ProofProposition[];
  derivations: ProofProposition[];
  obligations: string[];
  challenges: string[];
  contradictions: string[];
  status: 'UNRESOLVED' | 'SUPPORTED' | 'DERIVED' | 'CONTRADICTED' | 'INVALIDATED';
  confidence: number;
}

/**
 * PLRKernel: Proof Logic Reasoning Kernel
 * Menggabungkan aturan logika bukti terstruktur (Agents.md) dengan
 * Aljabar Vektor Simbolik VSA / FHRR (8192-dim branchless vector space).
 */
export class PLRKernel {
  private state: ProofState;
  private propositionMap: Map<string, ProofProposition>;

  constructor() {
    this.state = {
      goal: null,
      premises: [],
      evidence: [],
      assumptions: [],
      derivations: [],
      obligations: [],
      challenges: [],
      contradictions: [],
      status: 'UNRESOLVED',
      confidence: 0.0
    };
    this.propositionMap = new Map();
  }

  private hashString(text: string): number {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) + 1;
  }

  private createVectorForText(text: string): Float32Array {
    const seed = this.hashString(text);
    return FHRR.create(seed);
  }

  public setGoal(goalText: string): ProofProposition {
    const vec = this.createVectorForText(goalText);
    const prop: ProofProposition = {
      id: `GOAL_${this.hashString(goalText)}`,
      type: 'GOAL',
      content: goalText,
      vector: vec,
      status: 'UNRESOLVED'
    };
    this.state.goal = prop;
    this.propositionMap.set(prop.id, prop);
    return prop;
  }

  public addPremise(content: string): ProofProposition {
    const vec = this.createVectorForText(content);
    const prop: ProofProposition = {
      id: `PREM_${this.propositionMap.size + 1}`,
      type: 'PREMISE',
      content: content,
      vector: vec,
      status: 'ASSERTED'
    };
    this.state.premises.push(prop);
    this.propositionMap.set(prop.id, prop);
    return prop;
  }

  public addEvidence(content: string): ProofProposition {
    const vec = this.createVectorForText(content);
    const prop: ProofProposition = {
      id: `EVID_${this.propositionMap.size + 1}`,
      type: 'EVIDENCE',
      content: content,
      vector: vec,
      status: 'EVIDENCE'
    };
    this.state.evidence.push(prop);
    this.propositionMap.set(prop.id, prop);
    return prop;
  }

  public addAssumption(content: string): ProofProposition {
    const vec = this.createVectorForText(content);
    const prop: ProofProposition = {
      id: `ASSUM_${this.propositionMap.size + 1}`,
      type: 'ASSUMPTION',
      content: content,
      vector: vec,
      status: 'ASSUMED'
    };
    this.state.assumptions.push(prop);
    this.propositionMap.set(prop.id, prop);
    return prop;
  }

  public derive(fromIds: string[], ruleName: string, yieldsContent: string): ProofProposition | null {
    const sourceProps: ProofProposition[] = [];
    for (const id of fromIds) {
      const p = this.propositionMap.get(id);
      if (!p) {
        this.state.obligations.push(`MISSING_DEPENDENCY_${id}`);
        return null;
      }
      sourceProps.push(p);
    }

    if (sourceProps.length === 0) return null;

    let boundVector = sourceProps[0]!.vector;
    for (let i = 1; i < sourceProps.length; i++) {
      boundVector = FHRR.bind(boundVector, sourceProps[i]!.vector);
    }

    const yieldVec = this.createVectorForText(yieldsContent);
    const derivedVector = FHRR.bind(boundVector, yieldVec);

    const prop: ProofProposition = {
      id: `DERIV_${this.state.derivations.length + 1}`,
      type: 'DERIVATION',
      content: yieldsContent,
      vector: derivedVector,
      status: 'DERIVED',
      dependencies: fromIds,
      rule: ruleName
    };

    this.state.derivations.push(prop);
    this.propositionMap.set(prop.id, prop);
    return prop;
  }

  public checkContradictions(): string[] {
    const allProps = [
      ...this.state.premises,
      ...this.state.evidence,
      ...this.state.derivations
    ];

    this.state.contradictions = [];

    for (let i = 0; i < allProps.length; i++) {
      for (let j = i + 1; j < allProps.length; j++) {
        const left = allProps[i]!;
        const right = allProps[j]!;
        const sim = FHRR.similarity(left.vector, right.vector);
        if (sim < -0.6) {
          const msg = `CONTRADICTION: [${left.id}] "${left.content}" vs [${right.id}] "${right.content}" (similarity: ${sim.toFixed(3)})`;
          this.state.contradictions.push(msg);
          left.status = 'CONTRADICTED';
          right.status = 'CONTRADICTED';
        }
      }
    }

    if (this.state.contradictions.length > 0) {
      this.state.status = 'CONTRADICTED';
    }

    return this.state.contradictions;
  }

  public evaluateProof(): ProofState {
    this.checkContradictions();

    if (this.state.status === 'CONTRADICTED') {
      this.state.confidence = 0.0;
      return this.getProofState();
    }

    const vectorsToBundle: Float32Array[] = [];
    for (const p of this.state.premises) vectorsToBundle.push(p.vector);
    for (const e of this.state.evidence) vectorsToBundle.push(e.vector);
    for (const d of this.state.derivations) vectorsToBundle.push(d.vector);

    if (vectorsToBundle.length === 0 || !this.state.goal) {
      this.state.confidence = 0.0;
      this.state.status = 'UNRESOLVED';
      return this.getProofState();
    }

    const bundled = FHRR.bundle(vectorsToBundle);
    const confidence = FHRR.similarity(bundled, this.state.goal.vector);

    this.state.confidence = confidence;

    if (confidence >= 0.4) {
      this.state.status = 'SUPPORTED';
    } else if (confidence >= 0.15) {
      this.state.status = 'DERIVED';
    } else {
      this.state.status = 'UNRESOLVED';
    }

    return this.getProofState();
  }

  public getProofState(): ProofState {
    return { ...this.state };
  }

  public compileAnswerSummary(): string {
    const state = this.evaluateProof();

    const lines: string[] = [];
    lines.push(`=== PROOF STATE REASONING (PLR / FHRR) ===`);
    lines.push(`STATUS: ${state.status}`);
    lines.push(`CONFIDENCE (Resonansi VSA): ${(state.confidence * 100).toFixed(1)}%`);
    if (state.goal) {
      lines.push(`GOAL: ${state.goal.content}`);
    }

    lines.push(`\nPREMISES (${state.premises.length}):`);
    for (const p of state.premises) {
      lines.push(`  • [${p.id}] ${p.content}`);
    }

    if (state.evidence.length > 0) {
      lines.push(`\nEVIDENCE (${state.evidence.length}):`);
      for (const e of state.evidence) {
        lines.push(`  • [${e.id}] ${e.content}`);
      }
    }

    if (state.derivations.length > 0) {
      lines.push(`\nDERIVATIONS (${state.derivations.length}):`);
      for (const d of state.derivations) {
        lines.push(`  • [${d.id}] ${d.content} (using ${d.rule || 'RULE'} from: ${d.dependencies?.join(', ')})`);
      }
    }

    if (state.contradictions.length > 0) {
      lines.push(`\n⚠️ CONTRADICTIONS DETECTED (${state.contradictions.length}):`);
      for (const c of state.contradictions) {
        lines.push(`  ❌ ${c}`);
      }
    }

    if (state.obligations.length > 0) {
      lines.push(`\nOBLIGATIONS:`);
      for (const o of state.obligations) {
        lines.push(`  📌 ${o}`);
      }
    }

    return lines.join('\n');
  }
}
