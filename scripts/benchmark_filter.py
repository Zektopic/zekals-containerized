#!/usr/bin/env python3
"""Measure the actual Python/FFI path; this is not a camera FPS benchmark."""
import json
from pathlib import Path
import platform
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "za-backend"))
from filtering import GazeFilter

results = {"platform": platform.platform(), "python": platform.python_version(), "iterations": 100000}
for enabled in (False, True):
    filter_ = GazeFilter(native=enabled)
    started = time.perf_counter()
    for i in range(results["iterations"]):
        filter_.step((i % 100) / 100, 0.5, i * 20)
    name = "rust_ffi" if filter_.library else "python"
    results[name + "_microseconds_per_sample"] = (time.perf_counter() - started) * 1e6 / results["iterations"]
print(json.dumps(results, indent=2))
