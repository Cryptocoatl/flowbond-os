#!/usr/bin/env python3
"""Revisa la sintaxis del <script> inline de cada .html de Voces.

Estas páginas son un solo bloque de 70-140k caracteres: un template literal mal
cerrado tumba la página entera y el navegador no dice dónde. Esto lo caza antes
de desplegar.

Uso:  python3 tools/checkjs.py [archivo.html ...]     (sin args = todos)
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S | re.I)


def check(path: Path) -> bool:
    html = path.read_text(encoding="utf-8")
    blocks = SCRIPT_RE.findall(html)
    if not blocks:
        print(f"·  {path.name}: sin script inline")
        return True
    ok = True
    for i, code in enumerate(blocks, 1):
        # los <script type="module"> y los inline normales se validan igual
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
            f.write(code)
            tmp = f.name
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
        if r.returncode != 0:
            ok = False
            print(f"❌ {path.name} (bloque {i}):\n{r.stderr.strip()}")
    if ok:
        print(f"✓  {path.name} ({len(blocks)} bloque(s))")
    return ok


def main() -> int:
    args = sys.argv[1:]
    files = [Path(a) for a in args] if args else sorted(HERE.glob("*.html"))
    return 0 if all(check(f) for f in files) else 1


if __name__ == "__main__":
    sys.exit(main())
