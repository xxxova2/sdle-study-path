#!/usr/bin/env bash
# Build a static deploy folder identical to the localhost SPA (no PDFs, no videos, no raw).
# Usage: bash scripts/pack_deploy.sh
# Then:  cd dist && python3 -m http.server 8766
# Or drag dist/ to Cloudflare Pages / Netlify / GitHub Pages.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT}/dist"
STAMP="$(date -u +%Y-%m-%dT%H:%MZ)"

rm -rf "$OUT"
mkdir -p "$OUT/css" "$OUT/js" "$OUT/data"

cp -a "$ROOT/index.html" "$OUT/index.html"
cp -a "$ROOT/css/app.css" "$OUT/css/app.css"
cp -a "$ROOT/js/app.js" "$OUT/js/app.js"

# Runtime data only (same scripts as index.html)
for f in \
  highyield.js \
  scfhs_refs.js \
  plan_tracks.js \
  video_links.js \
  book_index.js \
  lessons.js \
  questions.js
do
  if [[ ! -f "$ROOT/data/$f" ]]; then
    echo "ERROR: missing data/$f" >&2
    exit 1
  fi
  cp -a "$ROOT/data/$f" "$OUT/data/$f"
done

# Private-by-default: discourage search indexing of study bank
cat >"$OUT/robots.txt" <<'EOF'
User-agent: *
Disallow: /
EOF

cat >"$OUT/README-DEPLOY.txt" <<EOF
SDLE Study Path — deploy package
Built: ${STAMP}

This folder is the same app as local:
  cd sdle-prep && python3 -m http.server 8765

Includes:
  - All 7 tabs (Today, Days, Pass, Always, Extra, MCQs, Progress)
  - Full in-app readings (lessons.js)
  - Full MCQ bank + quizzes/mocks (questions.js)
  - Google Drive video links (no video files)

Does NOT include:
  - data/raw PDFs (~470MB) — archive only; content already in lessons/questions
  - Local video files — use Open on Drive
  - node_modules, scripts, print tooling

Serve:
  cd dist && python3 -m http.server 8766
  Open http://localhost:8766

Host (examples):
  - Cloudflare Pages / Netlify: upload this dist/ folder
  - Prefer private / password / Access if bank materials are restricted

Progress is stored in the browser (localStorage), same as localhost.
EOF

# Sanity: every script tag target exists
missing=0
while read -r src; do
  [[ -z "$src" ]] && continue
  if [[ ! -f "$OUT/$src" ]]; then
    echo "ERROR: index references missing $src" >&2
    missing=1
  fi
done < <(grep -oE '(href|src)="[^"]+"' "$OUT/index.html" | sed -E 's/^(href|src)="//;s/"$//' | grep -vE '^(https?:|//)')

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "=== deploy package ready: $OUT ==="
du -sh "$OUT" "$OUT"/* "$OUT"/data/* 2>/dev/null | sort -hr
echo
echo "Preview:  cd dist && python3 -m http.server 8766"
echo "Then open http://localhost:8766  (same app as :8765)"
