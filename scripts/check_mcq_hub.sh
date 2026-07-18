#!/usr/bin/env bash
# Gates for MCQs hub: full bank, sources present, no thin paths in hub start.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
ok() { echo "  OK  $*"; }
fail() { echo " FAIL $*"; FAIL=1; }

echo ""
echo "=== MCQs hub gates ==="

# Tab present
if grep -q 'data-view="mcqs"' index.html; then
  ok "MCQs tab in index.html"
else
  fail "missing data-view=mcqs"
fi

if grep -q '"mcqs"' js/app.js && grep -q 'renderMcqs' js/app.js; then
  ok "renderMcqs + TAB_VIEWS mcqs"
else
  fail "app.js missing mcqs wiring"
fi

if grep -q 'mode === "test"' js/app.js && grep -q 'btn-show-ans' js/app.js; then
  ok "test mode + Show answer"
else
  fail "test mode incomplete"
fi

# No artificial full-test cap on MCQ hub start
if grep -n 'startMcqTest\|data-mcq-start' js/app.js | grep -E 'slice\(0,\s*50\)|Math\.min\([^,]+,\s*50\)' >/dev/null 2>&1; then
  fail "possible artificial cap near MCQ start"
else
  ok "no obvious 50-cap on full MCQ start path"
fi

# Bank sources
node --input-type=module -e '
import fs from "fs";
const g = { window: {} };
const src = fs.readFileSync("data/questions.js","utf8");
const fn = new Function("window", src + "\n;return window.QUESTION_BANK;");
const bank = fn(g.window);
const usable = bank.filter(q => q && q.usable !== false);
const bySrc = {};
const byTopic = {};
for (const q of usable) {
  bySrc[q.source||"?"] = (bySrc[q.source||"?"]||0)+1;
  byTopic[q.topic||"?"] = (byTopic[q.topic||"?"]||0)+1;
}
const need = ["always","abtal","saud_delta","premium_operative"];
let bad = false;
for (const s of need) {
  if (!bySrc[s]) { console.error("missing source", s); bad = true; }
}
if (usable.length < 2000) { console.error("usable too small", usable.length); bad = true; }
if (!byTopic.perio || byTopic.perio < 50) { console.error("perio thin", byTopic.perio); bad = true; }
if (bad) process.exit(1);
console.log(JSON.stringify({ usable: usable.length, byTopic, saud: bySrc.saud_delta, always: bySrc.always, abtal: bySrc.abtal }, null, 0));
' && ok "bank sources + size" || fail "bank source/size check"

bash scripts/check_spa_invariants.sh || fail "spa invariants"

if [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo "=== MCQs hub gates PASSED ==="
  exit 0
else
  echo ""
  echo "=== MCQs hub gates FAILED ==="
  exit 1
fi
