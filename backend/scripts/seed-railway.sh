#!/usr/bin/env bash
# Seed the Railway Postgres database for Aarogya360 demo data.
#
# Prerequisites:
#   - railway CLI logged in
#   - project linked (from backend/: railway link)
#   - Postgres service named "Postgres" (default Railway name)
#
# Usage:
#   cd backend
#   chmod +x scripts/seed-railway.sh
#   ./scripts/seed-railway.sh
#   SEED_RESET=true ./scripts/seed-railway.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install: npm i -g @railway/cli"
  exit 1
fi

echo "→ Resolving Railway Postgres public URL…"

# Prefer explicit DATABASE_PUBLIC_URL from the Postgres plugin service
PUBLIC_URL="$(railway variables --service Postgres --kv 2>/dev/null | sed -n 's/^DATABASE_PUBLIC_URL=//p' | head -1 || true)"

if [[ -z "${PUBLIC_URL}" ]]; then
  # Fallback: some projects expose only DATABASE_URL on Postgres (already public proxy)
  PUBLIC_URL="$(railway variables --service Postgres --kv 2>/dev/null | sed -n 's/^DATABASE_URL=//p' | head -1 || true)"
fi

if [[ -z "${PUBLIC_URL}" ]]; then
  echo "Could not read DATABASE_PUBLIC_URL from service Postgres."
  echo "Open Railway → Postgres → Variables and copy DATABASE_PUBLIC_URL, then run:"
  echo "  DATABASE_URL='postgresql://…' SEED_RESET=true npm run seed"
  exit 1
fi

if [[ "${PUBLIC_URL}" == *"railway.internal"* ]]; then
  echo "Got an internal Railway URL; seeding from your laptop requires DATABASE_PUBLIC_URL."
  exit 1
fi

export DATABASE_URL="${PUBLIC_URL}"
export SEED_RESET="${SEED_RESET:-false}"

HOST="$(node -e "try{console.log(new URL(process.env.DATABASE_URL).host)}catch{console.log('unknown')}")"
echo "→ Using host: ${HOST}"
echo "→ SEED_RESET=${SEED_RESET}"

# Use local project Prisma (avoid npx pulling Prisma 7)
if [[ ! -x "./node_modules/.bin/prisma" ]]; then
  echo "→ Installing npm dependencies…"
  npm ci
fi

./node_modules/.bin/prisma generate >/dev/null
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma db seed
