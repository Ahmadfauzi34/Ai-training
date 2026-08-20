"""
Cross-Domain Bridge — HoTT Kernel 4.0
Schema Version: 4.0.0-memory

Jembatan antara Codebase Intelligence dan Memory Domain.

Fungsi:
1. Selective auto-store (filter findings → episodic memory)
2. Cross-domain steering (codebase + memory unified signal)
3. Consolidation trigger (threshold + autonomous)
4. Memory-augmented analysis context

Prinsip Selective Filtering:
- HIGH severity findings → store
- Cross-analyzer correlations → store
- Critical impact events → store
- LOW/INFO findings → skip (transient)
"""

import os
import json
import datetime
from typing import Any, Dict, List, Optional, Tuple

SCHEMA_VERSION = "4.0.0-memory"

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Threshold untuk consolidation trigger
CONSOLIDATION_EPISODIC_THRESHOLD = 15   # Max episodic sebelum signal
CONSOLIDATION_BETA0_THRESHOLD = 5       # Max β₀ sebelum signal
CRITICAL_IMPACT_FAN_IN_THRESHOLD = 3    # fan_in minimum untuk critical


# ============================================================
# 1. SELECTIVE FILTER — Tentukan apa yang layak disimpan
# ============================================================

def filter_findings_for_memory(
    analyzer_results: Dict[str, Any],
    correlations: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Filter findings berdasarkan severity dan relevansi.

    Rules:
    - HIGH severity → store
    - MEDIUM severity dengan entrypoint impact → store
    - Correlations → store (semua)
    - LOW/INFO → skip
    """
    storeable: List[Dict[str, Any]] = []

    # Filter findings dari analyzers
    for analyzer_name, result in analyzer_results.items():
        for finding in result.get("findings", []):
            severity = finding.get("severity", "info")

            if severity == "high":
                storeable.append({
                    "source_analyzer": analyzer_name,
                    "finding_type": finding.get("type", "unknown"),
                    "severity": severity,
                    "file": finding.get("file", ""),
                    "content": finding.get("observation", ""),
                    "category": "high_severity_finding",
                })
            elif severity == "medium":
                # Medium hanya disimpan jika terkait entrypoint atau circular
                ftype = finding.get("type", "")
                if ftype in ("circular_dependency", "entrypoint_high_risk", "change_risk"):
                    storeable.append({
                        "source_analyzer": analyzer_name,
                        "finding_type": ftype,
                        "severity": severity,
                        "file": finding.get("file", ""),
                        "content": finding.get("observation", ""),
                        "category": "critical_medium_finding",
                    })

    # Semua correlations disimpan (mereka sudah ter-filter di synthesizer)
    for corr in correlations:
        storeable.append({
            "source_analyzer": "cross_analyzer",
            "finding_type": corr.get("type", "unknown"),
            "severity": corr.get("severity", "medium"),
            "file": corr.get("file", ""),
            "content": corr.get("observation", ""),
            "category": "cross_analyzer_correlation",
        })

    return storeable


# ============================================================
# 2. AUTO-STORE — Simpan filtered findings sebagai episodic
# ============================================================

def auto_store_findings(
    storeable_findings: List[Dict[str, Any]],
    scan_root: str = "src",
) -> Dict[str, Any]:
    """
    Simpan filtered findings sebagai episodic memories.
    Membuat asosiasi temporal antar findings yang disimpan bersamaan.
    """
    try:
        from memory_store import store_memory, store_association, load_store
    except ImportError:
        return {"error": "memory_store not available", "stored_count": 0}

    stored_ids: List[str] = []
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"

    for i, finding in enumerate(storeable_findings):
        # Build content untuk episodic memory
        content = (
            f"[{finding['category']}] "
            f"{finding['finding_type']} di {finding['file'] or scan_root}: "
            f"{finding['content']}"
        )

        # Build tags
        tags = [
            finding["category"],
            finding["source_analyzer"],
            finding["severity"],
        ]
        if finding["file"]:
            # Tambah tag directory-level
            file_dir = os.path.dirname(finding["file"])
            if file_dir:
                tags.append(file_dir.replace("/", "."))

        # Build context
        context = {
            "scan_root": scan_root,
            "source_analyzer": finding["source_analyzer"],
            "finding_type": finding["finding_type"],
            "severity": finding["severity"],
            "file": finding["file"],
            "batch_timestamp": timestamp,
        }

        # Store sebagai episodic
        memory = store_memory(
            memory_type="episodic",
            content=content,
            source=f"hott_kernel xanalyze {scan_root}",
            importance=0.9 if finding["severity"] == "high" else 0.7,
            tags=tags,
            context=context,
        )
        stored_ids.append(memory["id"])

    # Buat asosiasi temporal antar findings dalam batch yang sama
    for i in range(len(stored_ids) - 1):
        try:
            store_association(
                from_id=stored_ids[i],
                to_id=stored_ids[i + 1],
                assoc_type="temporal",
                strength=0.5,
                metadata={
                    "reason": "same_analysis_batch",
                    "batch_timestamp": timestamp,
                },
            )
        except Exception:
            pass  # Skip jika asosiasi gagal

    return {
        "stored_count": len(stored_ids),
        "stored_ids": stored_ids,
        "associations_created": max(0, len(stored_ids) - 1),
        "batch_timestamp": timestamp,
    }


# ============================================================
# 3. CONSOLIDATION TRIGGER — Cek apakah perlu konsolidasi
# ============================================================

def check_consolidation_trigger() -> Dict[str, Any]:
    """
    Cek apakah kondisi memory memenuhi threshold untuk konsolidasi.

    Triggers:
    - Episodic count > CONSOLIDATION_EPISODIC_THRESHOLD
    - β₀ > CONSOLIDATION_BETA0_THRESHOLD (fragmentasi tinggi)
    - Banyak isolated episodic memories
    """
    try:
        from memory_store import load_store
        from memory_graph import build_memory_graph
        from memory_analyzers import analyze_fragmentation
    except ImportError:
        return {"trigger": False, "reason": "memory modules not available"}

    store = load_store()
    memories = store.get("memories", [])

    # Hitung episodic memories
    episodic_memories = [m for m in memories if m.get("type") == "episodic"]
    episodic_count = len(episodic_memories)

    # Hitung episodic yang belum di-consolidate
    unconsolidated = [
        m for m in episodic_memories
        if m.get("consolidated_into") is None
    ]
    unconsolidated_count = len(unconsolidated)

    # Build graph dan cek β₀
    memory_graph = build_memory_graph()
    frag_result = analyze_fragmentation(memory_graph)
    beta_0 = frag_result["summary"].get("beta_0", 0)

    # Cek isolated episodic memories
    isolated_episodic = [
        m for m in unconsolidated
        if memory_graph.get("node_metadata", {}).get(m["id"], {}).get("fan_in", 0) == 0
        and memory_graph.get("node_metadata", {}).get(m["id"], {}).get("fan_out", 0) == 0
    ]

    # Tentukan trigger
    triggers: List[str] = []

    if unconsolidated_count >= CONSOLIDATION_EPISODIC_THRESHOLD:
        triggers.append(
            f"episodic_count_exceeded: {unconsolidated_count} >= {CONSOLIDATION_EPISODIC_THRESHOLD}"
        )

    if beta_0 > CONSOLIDATION_BETA0_THRESHOLD:
        triggers.append(
            f"fragmentation_exceeded: beta_0={beta_0} > {CONSOLIDATION_BETA0_THRESHOLD}"
        )

    if len(isolated_episodic) >= 5:
        triggers.append(
            f"isolated_episodic_exceeded: {len(isolated_episodic)} isolated"
        )

    should_consolidate = len(triggers) > 0

    return {
        "trigger": should_consolidate,
        "reasons": triggers,
        "metrics": {
            "total_episodic": episodic_count,
            "unconsolidated_episodic": unconsolidated_count,
            "isolated_episodic": len(isolated_episodic),
            "beta_0": beta_0,
            "thresholds": {
                "episodic_threshold": CONSOLIDATION_EPISODIC_THRESHOLD,
                "beta0_threshold": CONSOLIDATION_BETA0_THRESHOLD,
            },
        },
        "candidate_ids": [m["id"] for m in unconsolidated[:20]],  # Max 20 candidates
    }


# ============================================================
# 4. CROSS-DOMAIN STEERING — Unified signal
# ============================================================

def cross_domain_steer(scan_root: str = "src") -> Dict[str, Any]:
    """
    Gabungkan codebase steering + memory steering menjadi unified signal.
    """
    result = {
        "schema_version": SCHEMA_VERSION,
        "mode": "xsteer",
        "scan_root": scan_root,
    }

    # === Codebase Steering ===
    try:
        from decoder_steering import steer_decoder
        from shared_graph import build_shared_graph
        from analyzer_registry import run_analyzers
    except ImportError:
        result["codebase_steering"] = {"error": "codebase modules not available"}
        return result

    codebase_res = steer_decoder(scan_root)
    if not codebase_res.get("available", True) and "error" in codebase_res:
        result["codebase_steering"] = {"error": codebase_res.get("error", "codebase steering failed")}
        return result

    codebase_signals = codebase_res.get("steering_signals", {})
    codebase_drift = codebase_res.get("drift_analysis") or {}
    codebase_fingerprint = codebase_res.get("current_fingerprint") or codebase_res.get("fingerprint", {})

    # Compute codebase health score from analyzers
    try:
        cg = build_shared_graph(scan_root)
        c_output = run_analyzers(cg, None)
        c_total_files = cg.get("summary", {}).get("total_files", 0)
        c_weights = {"high": 3, "medium": 2, "low": 1, "info": 0}
        c_wsum = sum(
            c_weights.get(f.get("severity", "info"), 0)
            for r in c_output.get("results", {}).values()
            for f in r.get("findings", [])
        )
        c_pressure = c_wsum / max(1, c_total_files)
        codebase_health = round(1.0 / (1.0 + c_pressure), 3)
    except Exception:
        codebase_health = 1.0

    result["codebase_steering"] = {
        "archetype": codebase_fingerprint.get("structural_archetype", "unknown"),
        "health_score": codebase_health,
        "strategy": codebase_signals.get("reasoning_strategy", "unknown"),
        "budget": codebase_signals.get("reasoning_budget", "medium"),
        "drift": codebase_drift.get("interpretation", "no_baseline") if codebase_drift else "no_baseline",
    }

    # === Memory Steering ===
    try:
        from memory_graph import build_memory_graph
        from memory_analyzers import analyze_manifold, run_memory_analyzers
        from memory_synthesizer import (
            compute_memory_fingerprint, load_memory_baseline,
            detect_memory_drift, generate_memory_steering_signals,
        )
    except ImportError:
        result["memory_steering"] = {"error": "memory modules not available"}
        return result

    memory_graph = build_memory_graph()
    manifold_result = analyze_manifold(memory_graph)
    manifold_data = manifold_result.get("manifold", {})

    # Memory health score
    mem_analyzer_output = run_memory_analyzers(memory_graph)
    sev_counts = {"high": 0, "medium": 0, "low": 0}
    for r in mem_analyzer_output.get("results", {}).values():
        for f in r.get("findings", []):
            sev = f.get("severity", "low")
            if sev in sev_counts:
                sev_counts[sev] += 1

    total_mems = memory_graph["summary"]["total_memories"]
    w_sum = sev_counts["high"] * 3 + sev_counts["medium"] * 2 + sev_counts["low"] * 1
    pressure = w_sum / max(1, total_mems)
    mem_health = round(1.0 / (1.0 + pressure), 3)

    mem_fingerprint = compute_memory_fingerprint(manifold_data, memory_graph["summary"])
    mem_baseline = load_memory_baseline()
    mem_drift = detect_memory_drift(mem_fingerprint, mem_baseline)
    memory_signals = generate_memory_steering_signals(mem_fingerprint, mem_drift, mem_health)

    result["memory_steering"] = {
        "archetype": mem_fingerprint.get("memory_archetype", "unknown"),
        "health_score": mem_health,
        "strategy": memory_signals["reasoning_strategy"],
        "budget": memory_signals["reasoning_budget"],
        "drift": mem_drift.get("interpretation", "no_baseline"),
        "attention": memory_signals.get("attention_priorities", []),
    }

    # === Consolidation Trigger Check ===
    consolidation_check = check_consolidation_trigger()
    result["consolidation_signal"] = {
        "consolidation_candidate": consolidation_check["trigger"],
        "reasons": consolidation_check.get("reasons", []),
    }

    # === Unified Steering Prompt Block ===
    prompt_lines = [
        "[CROSS-DOMAIN STEERING SIGNAL]",
        f"codebase_archetype={result['codebase_steering']['archetype']}",
        f"codebase_health={result['codebase_steering']['health_score']}",
        f"codebase_strategy={result['codebase_steering']['strategy']}",
        f"memory_archetype={result['memory_steering']['archetype']}",
        f"memory_health={result['memory_steering']['health_score']}",
        f"memory_strategy={result['memory_steering']['strategy']}",
        f"consolidation_candidate={'true' if consolidation_check['trigger'] else 'false'}",
        "[UNIFIED CONTEXT]",
        f"Codebase: {codebase_signals.get('strategy_description', '')}",
        f"Memory: {memory_signals.get('strategy_description', '')}",
    ]

    if consolidation_check["trigger"]:
        prompt_lines.append(
            f"[ATTENTION] Consolidation recommended: {'; '.join(consolidation_check['reasons'])}"
        )

    result["steering_prompt_block"] = "\n".join(prompt_lines)

    return result


# ============================================================
# 5. MEMORY-AUGMENTED CONTEXT — Recall relevant memories
# ============================================================

def get_memory_context_for_file(file_path: str) -> Dict[str, Any]:
    """
    Recall memori yang relevan untuk file tertentu.
    Digunakan untuk memperkaya analisis codebase dengan konteks historis.
    """
    try:
        from memory_store import recall_memories
    except ImportError:
        return {"error": "memory_store not available", "memories": []}

    # Recall berdasarkan file path
    file_memories = recall_memories(query=file_path, limit=10)

    # Recall berdasarkan directory
    file_dir = os.path.dirname(file_path)
    dir_memories = recall_memories(query=file_dir, limit=5) if file_dir else []

    # Recall berdasarkan tags
    tag_memories = recall_memories(tags=[file_path.replace("/", ".")], limit=5)

    # Deduplicate
    seen_ids = set()
    all_memories = []
    for m in file_memories + dir_memories + tag_memories:
        if m["id"] not in seen_ids:
            seen_ids.add(m["id"])
            all_memories.append(m)

    return {
        "schema_version": SCHEMA_VERSION,
        "mode": "xcontext",
        "file": file_path,
        "relevant_memories": all_memories[:15],
        "count": len(all_memories),
    }
