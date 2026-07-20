#!/usr/bin/env bash
# Download رفيع parts 1-20 via gdown (NOT yt-dlp — yt-dlp Drive extractor is video-only).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
OUT="${1:-/data/prometric/rafi}"
mkdir -p "$OUT"
# IDs from data/generated/phase_a/rafi_parts_strict.json
python3 - <<'PY'
import json, subprocess
from pathlib import Path
import os
out = Path(os.environ.get('OUT','/data/prometric/rafi'))
data = json.loads(Path('/data/prometric/sdle-prep/data/generated/phase_a/rafi_parts_strict.json').read_text())
for p in data['rafi_parts_strict']:
    dest = out / f"rafi_part_{p['part']:02d}.pdf"
    if dest.exists() and dest.stat().st_size > 50_000 and dest.read_bytes()[:5]==b'%PDF-':
        print('skip', dest.name); continue
    fid = p['file_id']
    print('get', p['part'], fid)
    subprocess.run(['gdown', f'https://drive.google.com/uc?id={fid}', '-O', str(dest)], check=False)
PY
