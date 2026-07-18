#!/usr/bin/env bash
# One-shot: rebuild video catalog, import stream MCQs, run all source gates.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== build_video_catalog =="
python3 scripts/build_video_catalog.py

echo "== import_stream_mcqs --merge =="
python3 scripts/import_stream_mcqs.py --merge

echo "== audit_sources =="
python3 scripts/audit_sources.py

echo "== audit_videos =="
python3 scripts/audit_videos.py

echo "== audit_lesson_depth =="
python3 scripts/audit_lesson_depth.py

echo "== bank load check =="
node -e 'global.window={};eval(require("fs").readFileSync("data/questions.js","utf8"));eval(require("fs").readFileSync("data/lessons.js","utf8"));console.log("BANK",window.QUESTION_BANK.length,"DAYS",window.LESSONS.length);'

echo "ALL GATES PASSED"
