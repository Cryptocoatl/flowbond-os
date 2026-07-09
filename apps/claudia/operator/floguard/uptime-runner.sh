#!/usr/bin/env bash
# FloGuard · Uptime sentinel runner (launchd entrypoint)
# Runs the sweep, records last status, and raises a macOS notification on any FAIL.
set -uo pipefail

DIR="$HOME/Projects/flowbond-os/apps/claudia/operator/floguard"
STATUS="$DIR/uptime-status.json"
FAILLOG="$DIR/uptime-failures.log"
STAMP="$(date '+%Y-%m-%d %H:%M:%S')"

OUT="$(bash "$DIR/uptime-sentinel.sh" --json 2>/dev/null)"; RC=$?
printf '%s\n' "$OUT" > "$STATUS"

FAILED="$(printf '%s' "$OUT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('failed',-1))" 2>/dev/null || echo -1)"

if [[ "$RC" -ne 0 || "${FAILED:-0}" != "0" ]]; then
  BAD="$(printf '%s' "$OUT" | python3 -c "import sys,json;d=json.load(sys.stdin);print(', '.join(r['domain']+'('+r['verdict']+')' for r in d['rows'] if r['verdict']!='ok'))" 2>/dev/null || echo 'sentinel error')"
  echo "$STAMP · FAIL ($FAILED) · $BAD" >> "$FAILLOG"
  osascript -e "display notification \"$BAD\" with title \"⚠️ FloGuard: front door down\" sound name \"Basso\"" >/dev/null 2>&1 || true
else
  echo "$STAMP · ok" >> "$FAILLOG"
  # keep the ok-log from growing unbounded: retain last 200 lines
  tail -n 200 "$FAILLOG" > "$FAILLOG.tmp" 2>/dev/null && mv "$FAILLOG.tmp" "$FAILLOG"
fi
exit 0
