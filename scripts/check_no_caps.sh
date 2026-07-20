#!/usr/bin/env bash
# Gate: no silent artificial caps on exam pack MCQ lists / UI totals.
# Does NOT fail on harmless string slices like q[:70] for logging.
# Usage: bash scripts/check_no_caps.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

ok() { echo "  OK  $*"; }
fail() { echo " FAIL $*"; FAIL=1; }

echo ""
echo "=== no silent caps (exam packs / extract) ==="
echo "Root: $ROOT"
echo ""

echo "[1] Dangerous pack/list caps (items.slice(0,N), max_items=N, items[:N])"
# Only match CAPS on item arrays / max_items — not arbitrary string [:70]
HITS=$(rg -n --glob '!node_modules/**' \
  -e 'items\.slice\(\s*0\s*,\s*[0-9]+\s*\)' \
  -e '\.items\s*=\s*.*\.slice\(\s*0\s*,' \
  -e 'max_items\s*=\s*[0-9]{2,}' \
  -e 'items\[:[0-9]+\]' \
  -e 'pack\.items\.slice' \
  js/app.js data/exam_packs.js scripts 2>/dev/null || true)
# Allow documented SAMPLE / preview helpers
HITS=$(echo "$HITS" | grep -vE 'CAP_OK|SAMPLE_ONLY|preview only|check_no_caps' || true)
if [[ -n "${HITS// }" ]]; then
  fail "possible silent pack caps"
  echo "$HITS"
else
  ok "no items.slice / max_items pack caps"
fi

echo "[2] False-total UI language (sample of 70 / first 70 stems)"
PHRASE=$(rg -n -i --glob '!node_modules/**' \
  -e 'sample of 70' \
  -e 'first 70 (items|stems|questions)' \
  -e 'showing only [0-9]+ stems' \
  js/app.js data/exam_packs.js 2>/dev/null || true)
if [[ -n "${PHRASE// }" ]]; then
  fail "false-total language"
  echo "$PHRASE"
else
  ok "no sample-70 false-total phrases in app/packs"
fi

echo "[3] EXAM_PACKS meta itemCountExtracted == items.length"
if [[ ! -f data/exam_packs.js ]]; then
  fail "missing data/exam_packs.js"
else
  set +e
  node -e '
const fs=require("fs"); const vm=require("vm");
const g={console}; g.window=g; vm.createContext(g);
vm.runInContext(fs.readFileSync("data/exam_packs.js","utf8"), g);
const packs=(g.EXAM_PACKS&&g.EXAM_PACKS.packs)||[];
if(!packs.length){ console.error("no packs"); process.exit(2); }
let bad=0;
for (const p of packs) {
  const n=(p.items||[]).length;
  const meta=p.itemCountExtracted;
  if (meta==null || Number(meta)!==n) {
    console.error(" FAIL", p.id, "meta", meta, "items", n);
    bad++;
  } else console.log("  OK ", p.id, "items", n);
  if (p.noteCount!=null) {
    const w=(p.items||[]).filter(it=>(it.notes||[]).length>0).length;
    if (Number(p.noteCount)!==w) {
      console.error(" FAIL", p.id, "noteCount", p.noteCount, "withNotes", w);
      bad++;
    }
  }
}
process.exit(bad?1:0);
'
  RC=$?
  set -e
  if [[ $RC -ne 0 ]]; then fail "exam_packs meta mismatch"; else ok "all packs counts consistent"; fi
fi

echo ""
if [[ $FAIL -ne 0 ]]; then
  echo "=== check_no_caps: FAILED ==="
  exit 1
fi
echo "=== check_no_caps: PASS ==="
exit 0
