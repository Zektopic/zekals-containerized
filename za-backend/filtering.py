"""Optional Rust C ABI. The portable implementation uses the same numerical contract."""
import ctypes
import math
import os
from pathlib import Path
import sys


class State(ctypes.Structure):
    _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double),
                ("timestamp_ms", ctypes.c_double), ("valid", ctypes.c_uint32)]


class GazeFilter:
    def __init__(self, native=True, tau_ms=70.0):
        self.state = State()
        self.tau_ms = tau_ms
        self.library = None
        if native:
            name = "zekals_gaze.dll" if sys.platform == "win32" else (
                "libzekals_gaze.dylib" if sys.platform == "darwin" else "libzekals_gaze.so")
            default = Path(__file__).resolve().parent.parent / "target" / "release" / name
            try:
                self.library = ctypes.CDLL(os.environ.get("GAZE_LIBRARY", str(default)))
                self.library.zekals_filter_step.argtypes = [State, ctypes.c_double, ctypes.c_double,
                                                          ctypes.c_double, ctypes.c_double, ctypes.c_uint32]
                self.library.zekals_filter_step.restype = State
            except (OSError, AttributeError):
                self.library = None

    def step(self, x, y, timestamp_ms, valid=True):
        if self.library:
            self.state = self.library.zekals_filter_step(self.state, x, y, timestamp_ms, self.tau_ms, valid)
        elif (not valid or not all(math.isfinite(v) for v in (x, y, timestamp_ms, self.tau_ms))
              or self.tau_ms <= 0 or not 0 <= x <= 1 or not 0 <= y <= 1):
            self.state = State()
        else:
            elapsed = timestamp_ms - self.state.timestamp_ms
            alpha = elapsed / (self.tau_ms + elapsed) if self.state.valid and all(math.isfinite(v) for v in (self.state.x, self.state.y, self.state.timestamp_ms)) and 0 < elapsed <= 500 else 1
            self.state = State(x, y, timestamp_ms, 1) if alpha == 1 else State(
                self.state.x + alpha * (x - self.state.x),
                self.state.y + alpha * (y - self.state.y), timestamp_ms, 1)
        return (self.state.x, self.state.y) if self.state.valid else None
