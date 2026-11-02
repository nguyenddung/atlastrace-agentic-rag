"""Pre-compute the result the page shows before the reader asks anything.

The Next.js page is static and cannot run Python at build time, so the first
sample question of each locale is answered here and saved to
lib/initial-results.json. Re-run after changing the pipeline or lib/samples.json.

Usage:
    python scripts/build_initial_results.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from atlastrace.graph import run_research  # noqa: E402

samples = json.loads((ROOT / "lib" / "samples.json").read_text(encoding="utf-8"))
results = {locale: run_research(questions[0], locale, "demo").model_dump(by_alias=True, exclude_none=True) for locale, questions in samples.items()}
target = ROOT / "lib" / "initial-results.json"
target.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {target.relative_to(ROOT)}")
