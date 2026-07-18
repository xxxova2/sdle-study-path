#!/usr/bin/env bash
# SPA chrome + load-order + bank floor gates for sdle-prep.
# Usage: bash scripts/check_spa_invariants.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0

ok() { echo "  OK  $*"; }
fail() { echo " FAIL $*"; FAIL=1; }
warn() { echo " WARN $*"; }

echo ""
echo "=== sdle-prep SPA invariants ==="
echo "Root: $ROOT"
echo ""

# --- 1. Chrome: never hide plan tabs ---
echo "[1] Nav hide techniques"
if command -v rg >/dev/null 2>&1; then
  RG=rg
elif command -v grep >/dev/null 2>&1; then
  RG=grep
else
  RG=""
fi

if [[ -n "$RG" ]]; then
  # focus-mode must not target simple-nav / main-nav / topbar with hide rules
  if $RG -n 'focus-mode[^{]*\{[^}]*(simple-nav|main-nav|topbar)' css/app.css 2>/dev/null | head -5 | grep -q .; then
    fail "focus-mode CSS may target nav/topbar"
    $RG -n 'focus-mode[^{]*\{[^}]*(simple-nav|main-nav|topbar)' css/app.css || true
  else
    ok "no focus-mode → nav/topbar coupling found"
  fi
  # direct hide on .simple-nav / #main-nav
  HIDE_HITS=$($RG -n '(\.simple-nav|#main-nav)\s*\{[^}]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|pointer-events\s*:\s*none|height\s*:\s*0|max-height\s*:\s*0)' css/app.css 2>/dev/null || true)
  if [[ -n "${HIDE_HITS// }" ]]; then
    fail "simple-nav/main-nav hide technique detected"
    echo "$HIDE_HITS"
  else
    ok "no direct hide rules on .simple-nav / #main-nav"
  fi
else
  warn "rg/grep missing — skip CSS hide scan"
fi

if grep -q 'id="main-nav"' index.html && grep -q 'data-view="today"' index.html; then
  TAB_N=$(grep -o 'data-view="' index.html | wc -l)
  if [[ "$TAB_N" -eq 8 ]]; then
    ok "index.html has 8 data-view tabs (incl. feedback)"
  else
    fail "index.html data-view count = $TAB_N (want 8)"
  fi
else
  fail "index.html missing #main-nav or today tab"
fi

# --- 2. Script load order ---
echo "[2] Script load order"
ORDER=$(grep -n 'script src=' index.html | sed 's/.*src="//;s/".*//')
HY=$(echo "$ORDER" | grep -n 'data/highyield.js' | head -1 | cut -d: -f1)
SC=$(echo "$ORDER" | grep -n 'data/scfhs_refs.js' | head -1 | cut -d: -f1)
PT=$(echo "$ORDER" | grep -n 'data/plan_tracks.js' | head -1 | cut -d: -f1)
VL=$(echo "$ORDER" | grep -n 'data/video_links.js' | head -1 | cut -d: -f1)
BI=$(echo "$ORDER" | grep -n 'data/book_index.js' | head -1 | cut -d: -f1)
LE=$(echo "$ORDER" | grep -n 'data/lessons.js' | head -1 | cut -d: -f1)
QU=$(echo "$ORDER" | grep -n 'data/questions.js' | head -1 | cut -d: -f1)
AP=$(echo "$ORDER" | grep -n 'js/app.js' | head -1 | cut -d: -f1)
if [[ -n "$HY" && -n "$SC" && -n "$PT" && -n "$VL" && -n "$BI" && -n "$LE" && -n "$QU" && -n "$AP" ]] \
  && [[ "$HY" -lt "$SC" && "$SC" -lt "$PT" && "$PT" -lt "$VL" && "$VL" -lt "$BI" && "$BI" -lt "$LE" && "$LE" -lt "$QU" && "$QU" -lt "$AP" ]]; then
  ok "load order highyield → scfhs → tracks → video_links → book_index → lessons → questions → app"
else
  fail "script order wrong (hy=$HY sc=$SC pt=$PT vl=$VL bi=$BI le=$LE qu=$QU ap=$AP)"
  echo "$ORDER"
fi

# --- 3. Bank usable floor (node) ---
echo "[3] Bank floor"
if command -v node >/dev/null 2>&1; then
  node --input-type=module -e '
import fs from "fs";
const src = fs.readFileSync("data/questions.js","utf8");
// Evaluate in sandbox-ish: strip to assign global
const g = { window: {} };
const code = src.replace(/window\./g, "g.window.");
// questions.js typically: window.QUESTION_BANK = [...]
try {
  // crude extract length via regex if full eval is huge
  const m = src.match(/window\.QUESTION_BANK\s*=\s*(\[)/);
  if (!m) { console.error("NO_BANK"); process.exit(2); }
} catch (e) {}
' 2>/dev/null || true
  # Count usable via node eval of questions.js
  USABLE=$(node -e '
const fs = require("fs");
const vm = require("vm");
const ctx = { window: {}, console };
vm.createContext(ctx);
try {
  vm.runInContext(fs.readFileSync("data/questions.js","utf8"), ctx, { timeout: 30000 });
} catch (e) {
  console.error("EVAL_ERR", e.message);
  process.exit(2);
}
const bank = ctx.window.QUESTION_BANK || [];
const usable = bank.filter(q => q && q.usable !== false).length;
console.log(usable + " " + bank.length);
' 2>/dev/null || echo "0 0")
  U=$(echo "$USABLE" | awk '{print $1}')
  T=$(echo "$USABLE" | awk '{print $2}')
  if [[ "${U:-0}" -ge 2000 ]]; then
    ok "usable MCQs $U / total $T (≥2000 floor)"
  else
    fail "usable MCQs $U / total $T (need ≥2000)"
  fi
else
  warn "node missing — skip bank floor"
fi

# --- 4. Optional playwright smoke ---
echo "[4] Playwright (optional)"
BASE="${SDLE_BASE:-http://127.0.0.1:8765}"
if command -v node >/dev/null 2>&1 && curl -sf "$BASE/index.html" >/dev/null 2>&1; then
  if node -e "import('playwright').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
    ok "server up + playwright available — run full review separately: node scripts/playwright_app_review.mjs"
  else
    warn "playwright package not importable — skip UI smoke"
  fi
else
  warn "server not on $BASE or node missing — skip UI smoke"
fi

echo ""
if [[ "$FAIL" -ne 0 ]]; then
  echo "=== FAILED ==="
  exit 1
fi
echo "=== ALL SPA INVARIANTS PASSED ==="
exit 0
