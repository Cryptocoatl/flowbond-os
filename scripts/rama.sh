#!/usr/bin/env bash
# Crea una rama de trabajo SIEMPRE desde origin/main, nunca desde donde estabas.
# Uso:  ./scripts/rama.sh voces precios-por-pais
set -euo pipefail
[ $# -ge 2 ] || { echo "uso: $0 <producto> <qué-hace>   ej: $0 voces precios-por-pais"; exit 1; }
prod=$1; shift
slug=$(echo "$*" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')
git fetch origin --quiet
git switch -c "$prod/$slug" origin/main
echo "✓ estás en $prod/$slug, nacida de origin/main"
echo "  recuerda: sólo commits de apps/$prod, y con rutas explícitas (nada de 'git add -A')"
