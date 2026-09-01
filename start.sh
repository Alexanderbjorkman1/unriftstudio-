#!/usr/bin/env bash
# Starts DetailFlow on this computer. Everything stays local — the database and
# job photos are plain files in the ./data folder.
set -e
cd "$(dirname "$0")"

printf '\n  DetailFlow\n  ----------\n\n'

if ! command -v node >/dev/null 2>&1; then
  printf '  Node.js is not installed.\n\n'
  printf '  Install it from https://nodejs.org (pick the "LTS" button),\n'
  printf '  then run this file again.\n\n'
  read -r -p '  Press Enter to close. ' _
  exit 1
fi

MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$MAJOR" -lt 20 ]; then
  printf '  Node.js %s is too old — this needs version 20 or newer.\n' "$(node -v)"
  printf '  Update it from https://nodejs.org, then run this file again.\n\n'
  read -r -p '  Press Enter to close. ' _
  exit 1
fi

if [ ! -d node_modules ]; then
  printf '  First run — installing (a minute or two, only happens once)...\n\n'
  npm install
fi

# Open the browser once the server is actually answering.
(
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null http://localhost:3000/; then
      if command -v open >/dev/null 2>&1; then open http://localhost:3000
      elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:3000
      fi
      break
    fi
    sleep 1
  done
) >/dev/null 2>&1 &

printf '\n  Starting… your browser will open at http://localhost:3000\n'
printf '  Keep this window open while you use the app. Press Ctrl+C to stop.\n\n'

npm run dev
