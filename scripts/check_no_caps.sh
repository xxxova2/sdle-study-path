#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
fail(){ echo "FAIL $*"; FAIL=1; }
ok(){ echo "OK $*"; }
# Dangerous silent caps in app
if rg -n 'items\.slice\(0,\s*70\)|max_items\s*=\s*70|stems shown' js/app.js data/exam_packs.js 2>/dev/null; then
  fail "possible silent cap patterns in app/packs"
else
  ok "no classic 70-cap patterns in app/packs"
fi
# exam_packs meta matches items length
node -e '
const fs=require("fs"); const vm=require("vm"); const g={}; vm.createContext(g);
vm.runInContext(fs.readFileSync("data/exam_packs.js","utf8"), g);
const packs=(g.EXAM_PACKS&&g.EXAM_PACKS.packs)||[];
let bad=0;
for (const p of packs) {
  const n=(p.items||[]).length;
  const meta=p.itemCountExtracted;
  if (meta!=null && meta!==n) { console.error("MISMATCH", p.id, "meta", meta, "items", n); bad++; }
  console.log(p.id, "items", n, "meta", meta, "notes", p.noteCount);
}
if (bad) process.exit(1);
'
ok "exam_packs counts consistent"
exit $FAIL
