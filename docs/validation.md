# Validation record

Modernization review, October 2026. These results distinguish tests on the
available Linux x86_64 development host from hardware or user testing.

| Check | Result |
| --- | --- |
| Production Node server and logic tests | 11 passing: HTTP, origin/path restrictions, WebSockets, dwell, Unicode, calibration, speech and language validation |
| Chromium interaction/accessibility tests | 11 passing, including calibration/loss cancellation, Sinhala key labels and IME composition/undo |
| Python tracker tests | 7 passing, including the real WebSocket stream and corrupted-state recovery |
| Rust | 4 unit tests passing; formatting and Clippy clean; release library built |
| Real camera model | Pinned MediaPipe model initialized on CPU; blank image produced no gaze |
| Real neural synthesis | Piper English voice generated a 22,050 Hz WAV (115,244 bytes, 2.61 seconds) |
| JavaScript dependency audit | No known vulnerabilities reported for the resolved dependency tree |
| Python camera/speech dependency audit | No known vulnerabilities reported for the resolved requirements |
| Shell/Compose | Bash syntax checks and default Compose validation pass |
| UI container | Production Docker image built; restricted container served health, UI, modules and languages |
| Filter measurement | Python ~1.36 µs/sample; Rust via ctypes ~1.45 µs/sample on this run; no speedup claim |

Commands and benchmark data are in the development/hardware guides. Dependency
audits are point-in-time observations. Additional regression tests may be added
in follow-up PRs; CI output is authoritative for each branch's exact commit.

Not verified here: real eye-tracking accuracy, any physical Raspberry Pi,
GPU/NPU execution, thermal/power behavior, a real external switch, screen-reader
usability, native-speaker approval of translations, or Android hardware behavior.
The Android repository records its own build/native tests. No medical efficacy,
complete WCAG conformance, universal device compatibility or release readiness is
implied. A caregiver/user acceptance trial and target-device measurements are
required before relying on a particular installation.
