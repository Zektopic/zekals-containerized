#!/usr/bin/env python3
"""Load project settings as data, never as executable shell commands."""
import asyncio
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def load_environment(file):
    if not file.exists():
        return
    for line in file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            raise ValueError("Invalid .env assignment")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


if __name__ == "__main__":
    os.chdir(ROOT)
    load_environment(ROOT / ".env")
    sys.path.insert(0, str(ROOT / "za-backend"))
    from eye_tracker import main
    asyncio.run(main())
