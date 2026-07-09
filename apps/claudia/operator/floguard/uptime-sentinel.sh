#!/usr/bin/env bash
# FloGuard · Uptime / Deploy-Integrity Sentinel
# ---------------------------------------------------------------------------
# Catches the class of outage where a production domain resolves through Vercel
# but serves the PLATFORM-LEVEL 404 (NOT_FOUND) — i.e. the domain is attached to
# a project that has no working production deployment (orphaned / duplicate /
# broken-build). This is exactly what took down flowbond.life on 2026-06-28
# (domain was on stale `flow-bond-layer0` instead of healthy `flowbond-live`).
#
# It auto-discovers every custom (non *.vercel.app) domain across all projects in
# the flowbond team, so new apps are covered the moment their domain is attached —
# no hand-maintained URL list to drift.
#
# Auth-gated apps (401/403/login-302) are NOT flagged: those are app responses,
# distinct from Vercel's platform NOT_FOUND page. Only genuine orphans/5xx alarm.
#
# Usage:  ./uptime-sentinel.sh            # human-readable report, exit 1 if any FAIL
#         ./uptime-sentinel.sh --json     # machine-readable (for ClaudIA/cron)
#
# Token: read from the Vercel CLI auth store; override with VERCEL_TOKEN env.
set -euo pipefail

TEAM="team_qyOCVOtlgqRZGGgmo5D1fl2j"
AUTH_FILE="$HOME/Library/Application Support/com.vercel.cli/auth.json"
TOKEN="${VERCEL_TOKEN:-$(python3 -c "import json;print(json.load(open('$AUTH_FILE'))['token'])" 2>/dev/null || true)}"
JSON=false; [[ "${1:-}" == "--json" ]] && JSON=true

if [[ -z "$TOKEN" ]]; then echo "FATAL: no Vercel token (set VERCEL_TOKEN or run 'vercel login')" >&2; exit 2; fi

api() { curl -sS "https://api.vercel.com$1&teamId=$TEAM" -H "Authorization: Bearer $TOKEN"; }

# 1) enumerate projects -> their custom domains  (bash 3.2 compatible: no mapfile)
ROWS=()  # name|domain|http|verdict
fail=0; checked=0

while IFS=' ' read -r pid pname; do
  [[ -z "$pid" ]] && continue
  # custom (non vercel.app), verified domains only — those are the public front doors
  while IFS= read -r dom; do
    [[ -z "$dom" ]] && continue
    checked=$((checked+1))
    # follow redirects (apex->www etc.); capture final status + body marker
    body="$(curl -sS -L --max-time 20 "https://$dom" 2>/dev/null || true)"
    code="$(curl -sS -L -o /dev/null --max-time 20 -w '%{http_code}' "https://$dom" 2>/dev/null || echo 000)"
    verdict="ok"
    # platform-level orphan: Vercel's generic NOT_FOUND page (no deployment matched)
    if grep -qE 'NOT_FOUND|DEPLOYMENT_NOT_FOUND|The page could not be found' <<<"$body" && [[ "$code" == "404" ]]; then
      verdict="ORPHAN-404"; fail=$((fail+1))
    elif [[ "$code" == "000" ]]; then
      verdict="UNREACHABLE"; fail=$((fail+1))
    elif [[ "$code" =~ ^5 ]]; then
      verdict="SERVER-$code"; fail=$((fail+1))
    elif [[ "$code" == "404" ]]; then
      verdict="APP-404"; fail=$((fail+1))   # app's own 404 on its front door is still wrong
    fi
    ROWS+=("$pname|$dom|$code|$verdict")
  done < <(api "/v9/projects/$pid/domains?limit=100" \
    | python3 -c "import sys,json;[print(d['name']) for d in json.load(sys.stdin).get('domains',[]) if d.get('verified') and not d['name'].endswith('.vercel.app')]" 2>/dev/null || true)
done < <(api "/v9/projects?limit=100" \
    | python3 -c "import sys,json;[print(p['id'],p['name']) for p in json.load(sys.stdin)['projects']]")

if $JSON; then
  printf '{"checked":%s,"failed":%s,"rows":[' "$checked" "$fail"
  first=true
  for r in "${ROWS[@]}"; do IFS='|' read -r n d c v <<<"$r"
    $first || printf ','; first=false
    printf '{"project":"%s","domain":"%s","http":"%s","verdict":"%s"}' "$n" "$d" "$c" "$v"
  done
  printf ']}\n'
else
  echo "FloGuard Uptime Sentinel — $checked custom domains checked, $fail failing"
  echo "------------------------------------------------------------------"
  printf '%-22s %-34s %-5s %s\n' "PROJECT" "DOMAIN" "HTTP" "VERDICT"
  for r in "${ROWS[@]}"; do IFS='|' read -r n d c v <<<"$r"
    [[ "$v" == "ok" ]] && continue
    printf '%-22s %-34s %-5s ⚠️  %s\n' "$n" "$d" "$c" "$v"
  done
  [[ $fail -eq 0 ]] && echo "✅ all front doors healthy"
fi

exit $(( fail > 0 ? 1 : 0 ))
