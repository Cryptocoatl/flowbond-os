#!/usr/bin/env bash
# ── FlowStudio · AI Video Edit — setup & verify (macOS-first) ─────────────────
# Installs deps, writes apps/flowstudio/.env.local, then PINGS providers so you
# confirm from the terminal — no browser testing. v1 only needs FAL_KEY.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="$ROOT/apps/flowstudio/.env.local"
cd "$ROOT"

echo "→ Installing JS deps (pnpm)"
pnpm install

echo "→ System tools (ffmpeg + python beat libs)"
if command -v brew >/dev/null 2>&1; then
  brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
else
  echo "  (no Homebrew — install ffmpeg manually: https://ffmpeg.org/download.html)"
fi
python3 -m pip install -q librosa numpy soundfile fal 2>/dev/null || \
  echo "  (pip install skipped/failed — run: python3 -m pip install librosa numpy soundfile fal)"

# Seed .env.local from the example on first run.
if [ ! -f "$ENV" ]; then
  cp "$ROOT/apps/flowstudio/.env.local.example" "$ENV"
  echo "→ Created $ENV from example"
fi

read -rp "Paste FAL_KEY (blank to keep existing / use 'fal auth' creds): " FAL || true
if [ -n "${FAL:-}" ]; then
  if grep -q '^FAL_KEY=' "$ENV"; then
    # portable in-place edit (macOS sed needs the '' arg)
    sed -i '' "s|^FAL_KEY=.*|FAL_KEY=$FAL|" "$ENV"
  else
    echo "FAL_KEY=$FAL" >> "$ENV"
  fi
fi

# Verify from the terminal (no browser).
echo "→ Verifying ffmpeg"; ffmpeg -version >/dev/null 2>&1 && echo "  ffmpeg OK" || echo "  ffmpeg MISSING"
echo "→ Verifying python beat libs"; python3 -c "import librosa" >/dev/null 2>&1 && echo "  librosa OK" || echo "  librosa MISSING"

KEY="${FAL:-$(grep '^FAL_KEY=' "$ENV" 2>/dev/null | cut -d= -f2-)}"
if [ -n "${KEY:-}" ]; then
  echo "→ Verifying fal.ai key"
  code=$(curl -s -o /dev/null -w "%{http_code}" https://rest.alpha.fal.ai/tokens/ -H "Authorization: Key $KEY" || echo "000")
  case "$code" in
    200|401|403) echo "  fal reachable (HTTP $code; 200=ok, 401/403=bad key)";;
    *) echo "  fal check returned HTTP $code — confirm key/credits at https://fal.ai/dashboard/keys";;
  esac
else
  echo "  (no FAL_KEY yet — set it in $ENV before running a job)"
fi

echo "→ Done. Run a job:  pnpm --filter @flowbond/flowstudio edit:run -- src/modules/edit/jobs/este-mundial.json"
