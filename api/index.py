"""Vercel Python function entrypoint. All /api/* requests are rewritten here (see vercel.json)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from atlastrace.api import app  # noqa: E402,F401
