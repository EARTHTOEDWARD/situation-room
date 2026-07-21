#!/usr/bin/env python3
"""Build a self-contained The Burr HTML file from the static source files."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
BURR = ROOT / "the-burr"

html = (BURR / "index.html").read_text(encoding="utf-8")
css = (BURR / "styles.css").read_text(encoding="utf-8")
engine = (BURR / "engine.js").read_text(encoding="utf-8")
app = (BURR / "app.js").read_text(encoding="utf-8")

html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
html = html.replace('<script src="engine.js"></script>', f"<script>\n{engine}\n</script>")
html = html.replace('<script src="app.js"></script>', f"<script>\n{app}\n</script>")
html = html.replace('href="../index.html"', 'href="index.html"')

output = ROOT / "situation-room-the-burr.html"
output.write_text(html, encoding="utf-8")
print(output)
