#!/usr/bin/env python3
"""Phase 0: dedupe question bank — exact + near-duplicate.

Passes (plan R5: keep best, quarantine losers, never delete rows):
  1. Normalized stem exact (punct/stopwords/item-N stripped)
  2. Normalized stem + options exact
  3. Same options (4) + high stem token Jaccard
  4. Near stem (Jaccard ≥ threshold) within prefix buckets

Losers: usable=false, exclude_reason=duplicate_of:<winner_id>
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data" / "questions.js"
REPORT = ROOT / "data" / "generated" / "phase_truth" / "DEDUPE_REPORT.json"

SOURCE_RANK = {
    "always": 100,
    "saud_delta": 95,
    "stream_july2026": 90,
    "stream_july2026_inferred": 88,
    "gdoc": 85,
    "premium_operative": 80,
    "premium_endo": 80,
    "premium_perio": 80,
    "premium_fixed_rpd": 80,
    "premium_ortho_pedo": 80,
    "premium_ethics": 80,
    "abtal_mar_june_2026": 70,
    "abtal_dec_feb_2026": 68,
    "abtal": 60,
}

STOP = {
    "the", "a", "an", "of", "to", "in", "on", "for", "is", "are", "was", "were",
    "with", "and", "or", "which", "following", "most", "likely", "best",
    "patient", "pt", "year", "old", "yo", "yrs", "years", "about", "from",
    "that", "this", "what", "when", "who", "how", "does", "do", "did", "has",
    "have", "had", "his", "her", "their", "them", "they", "he", "she", "it",
    "as", "by", "at", "be", "been", "being", "not", "no", "yes", "item",
}

# Boost packs that stamp "(item N)" on near-identical stems
ITEM_N = re.compile(r"\bitem\s*\d+\b", re.I)


def load_bank() -> list:
    text = QUESTIONS.read_text(encoding="utf-8")
    m = re.search(r"w\.QUESTION_BANK\s*=\s*(\[.*\])\s*;", text, re.S)
    if not m:
        raise SystemExit("Could not parse QUESTION_BANK")
    return json.loads(m.group(1))


def write_bank(bank: list) -> None:
    header = "/** SDLE question bank — deduped phase_truth 2026-07-20 */\n(function (w) {\n  w.QUESTION_BANK = "
    footer = ";\n})(typeof window !== 'undefined' ? window : globalThis);\n"
    body = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
    QUESTIONS.write_text(header + body + footer, encoding="utf-8")


def norm_stem(s: str) -> str:
    s = (s or "").lower()
    s = ITEM_N.sub(" ", s)
    s = re.sub(r"[^\w\u0600-\u06ff]+", " ", s, flags=re.UNICODE)
    toks = [t for t in s.split() if t and t not in STOP and len(t) > 1]
    return " ".join(toks)


def tokens(s: str) -> set[str]:
    n = norm_stem(s)
    return set(n.split()) if n else set()


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    uni = len(a | b)
    return inter / uni if uni else 0.0


def opt_key(q: dict) -> str:
    opts = q.get("options") or []
    parts = sorted(norm_stem(str(o)) for o in opts if str(o).strip())
    return "|".join(parts)


def hinge_score(q: dict) -> int:
    exp = str(q.get("explanation") or "")
    score = min(len(exp), 500)
    if q.get("truth_pass"):
        score += 200
    if re.search(
        r"Community bank|Extracted from|placeholder|verify if no textbook|Write the hinge",
        exp,
        re.I,
    ):
        score -= 150
    if len(exp) < 40:
        score -= 100
    opts = q.get("options") or []
    if len(opts) == 4 and all(str(o).strip() for o in opts):
        score += 50
    ans = q.get("answer")
    if isinstance(ans, int) and 0 <= ans <= 3:
        score += 20
    src = str(q.get("source") or "")
    score += SOURCE_RANK.get(src, 40 if src.startswith("rafi_") else 30)
    if q.get("usable") is False:
        score -= 1000
    return score


def demote(bank: list, winner_i: int, loser_i: int, demoted: list, pass_name: str) -> None:
    q = bank[loser_i]
    if q.get("usable") is False and str(q.get("exclude_reason") or "").startswith("duplicate_of:"):
        return
    winner_id = bank[winner_i].get("id")
    old_reason = q.get("exclude_reason")
    q["usable"] = False
    q["exclude_reason"] = f"duplicate_of:{winner_id}"
    q["duplicate_of"] = winner_id
    demoted.append(
        {
            "id": q.get("id"),
            "winner": winner_id,
            "source": q.get("source"),
            "winner_source": bank[winner_i].get("source"),
            "stem": norm_stem(q.get("q") or "")[:100],
            "prev_exclude": old_reason,
            "pass": pass_name,
        }
    )


def pick_winner(bank: list, idxs: list[int]) -> int:
    return sorted(idxs, key=lambda i: hinge_score(bank[i]), reverse=True)[0]


def main() -> int:
    dry = "--dry-run" in sys.argv
    # Jaccard for near stems; slightly strict to avoid collapsing different distance questions
    near_j = 0.82
    same_opt_j = 0.55  # same 4 options + moderate stem overlap = paraphrase clone

    bank = load_bank()
    demoted: list = []
    by_pass: dict[str, int] = defaultdict(int)

    def count_pass(name: str, before: int) -> None:
        by_pass[name] = len(demoted) - before

    # --- Pass 1: normalized stem exact ---
    b0 = len(demoted)
    groups: dict[str, list[int]] = defaultdict(list)
    for i, q in enumerate(bank):
        if q.get("usable") is False:
            continue
        key = norm_stem(q.get("q") or "")
        if not key or len(key) < 10:
            continue
        groups[key].append(i)
    for key, idxs in groups.items():
        if len(idxs) < 2:
            continue
        w = pick_winner(bank, idxs)
        for j in idxs:
            if j != w:
                demote(bank, w, j, demoted, "norm_stem")
    count_pass("norm_stem", b0)

    # --- Pass 2: stem + options exact ---
    b0 = len(demoted)
    opt_groups: dict[str, list[int]] = defaultdict(list)
    for i, q in enumerate(bank):
        if q.get("usable") is False:
            continue
        opts = opt_key(q)
        key = norm_stem(q.get("q") or "") + "||" + opts
        if len(key) < 20:
            continue
        opt_groups[key].append(i)
    for key, idxs in opt_groups.items():
        if len(idxs) < 2:
            continue
        w = pick_winner(bank, idxs)
        for j in idxs:
            if j != w:
                demote(bank, w, j, demoted, "stem_opts")
    count_pass("stem_opts", b0)

    # --- Pass 3: identical option set (4 opts) + stem Jaccard ---
    b0 = len(demoted)
    by_opts: dict[str, list[int]] = defaultdict(list)
    for i, q in enumerate(bank):
        if q.get("usable") is False:
            continue
        ok = opt_key(q)
        n_opts = len([o for o in (q.get("options") or []) if str(o).strip()])
        if n_opts < 4 or not ok:
            continue
        # Skip ultra-generic option sets (pure numbers only) unless stem also very close
        by_opts[ok].append(i)

    for ok, idxs in by_opts.items():
        if len(idxs) < 2:
            continue
        # Generic mm-only options: require higher stem similarity
        pure_num = all(re.fullmatch(r"[\d\s\.]+|mm|cm", p) or re.fullmatch(r"\d+(\s*\d+)*\s*mm?", p)
                       for p in ok.split("|") if p)
        thr = 0.75 if pure_num else same_opt_j
        # Union-find style: repeatedly demote losers against best in remaining
        active = list(idxs)
        while len(active) > 1:
            # find any pair over threshold
            found = False
            for ai in range(len(active)):
                for bi in range(ai + 1, len(active)):
                    i, j = active[ai], active[bi]
                    sim = jaccard(tokens(bank[i].get("q") or ""), tokens(bank[j].get("q") or ""))
                    if sim >= thr:
                        w = pick_winner(bank, [i, j])
                        loser = j if w == i else i
                        demote(bank, w, loser, demoted, "same_opts_near")
                        active = [x for x in active if x != loser and bank[x].get("usable") is not False]
                        found = True
                        break
                if found:
                    break
            if not found:
                break
    count_pass("same_opts_near", b0)

    # --- Pass 4: near stem Jaccard in prefix buckets ---
    b0 = len(demoted)
    buckets: dict[str, list[int]] = defaultdict(list)
    tok_cache: dict[int, set[str]] = {}
    for i, q in enumerate(bank):
        if q.get("usable") is False:
            continue
        t = tokens(q.get("q") or "")
        if len(t) < 6:
            continue
        tok_cache[i] = t
        n = norm_stem(q.get("q") or "")
        buckets[n[:16]].append(i)

    for idxs in buckets.values():
        if len(idxs) < 2 or len(idxs) > 120:
            continue
        active = [i for i in idxs if bank[i].get("usable") is not False]
        changed = True
        while changed and len(active) > 1:
            changed = False
            for ai in range(len(active)):
                for bi in range(ai + 1, len(active)):
                    i, j = active[ai], active[bi]
                    sim = jaccard(tok_cache.get(i) or tokens(bank[i].get("q") or ""),
                                  tok_cache.get(j) or tokens(bank[j].get("q") or ""))
                    if sim >= near_j:
                        w = pick_winner(bank, [i, j])
                        loser = j if w == i else i
                        demote(bank, w, loser, demoted, "near_jaccard")
                        active = [x for x in active if x != loser and bank[x].get("usable") is not False]
                        changed = True
                        break
                if changed:
                    break
    count_pass("near_jaccard", b0)

    usable = sum(1 for q in bank if q.get("usable") is not False)
    # gate recompute
    usable_stems = [
        norm_stem(q.get("q") or "")
        for q in bank
        if q.get("usable") is not False and len(norm_stem(q.get("q") or "")) >= 10
    ]
    from collections import Counter
    c = Counter(usable_stems)
    extras = sum(v - 1 for v in c.values() if v > 1)

    report = {
        "bank_total": len(bank),
        "usable_after": usable,
        "demoted_this_run": len(demoted),
        "demoted_by_pass": dict(by_pass),
        "gate_norm_stem_extras_among_usable": extras,
        "thresholds": {"near_jaccard": near_j, "same_opts_jaccard": same_opt_j},
        "demoted_sample": demoted[:80],
        "dry_run": dry,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in (
        "bank_total", "usable_after", "demoted_this_run", "demoted_by_pass",
        "gate_norm_stem_extras_among_usable", "dry_run",
    )}, indent=2))
    if not dry:
        write_bank(bank)
        print("wrote", QUESTIONS)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
