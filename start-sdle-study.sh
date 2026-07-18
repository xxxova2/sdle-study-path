#!/usr/bin/env bash
# One-click launcher for SDLE Study Path (local)
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8765
URL="http://localhost:${PORT}"

# Already running?
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "$URL" 2>/dev/null | grep -qE '200|301|302|304'; then
  :
else
  # Start server in background (no terminal window needed)
  cd "$DIR"
  nohup python3 -m http.server "$PORT" >/tmp/sdle-prep-server.log 2>&1 &
  # Wait until it answers
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -s -o /dev/null --connect-timeout 1 "$URL" 2>/dev/null; then
      break
    fi
    sleep 0.3
  done
fi

# Open default browser
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v gio >/dev/null 2>&1; then
  gio open "$URL" >/dev/null 2>&1 &
else
  # fallback: print URL
  echo "Open in browser: $URL"
fi
