# Troubleshooting

| Symptom | Check and resolution |
| --- | --- |
| UI does not start | Check Node 22+, run `npm ci --prefix za-frontend`, check whether port 3000 is already in use. |
| HTTP 403 / WebSocket rejected | Put the exact browser origin (scheme, host, port) in `ALLOWED_ORIGINS`. Preserve Host through reverse proxies. |
| Camera unavailable | Basic controls still work. Start the tracker, set `TRACKER_URL`, check model checksum, camera permissions and another app holding the camera. |
| Model fails to import | Use Python 3.12+, the correct CPU architecture and one OpenCV distribution. Check Linux GL/glib dependencies. |
| Pi installation fails | Use ARM64, a compatible Python, and verify vendor wheel availability. 32-bit Pi OS is not a validated camera target. |
| GPU/NPU falls back | Inspect the selected provider and vendor runtime/driver compatibility. A mode flag alone cannot enable hardware support. |
| Calibration rejected | Improve lighting, reposition comfortably and look at all five targets. Do not force an inaccurate calibration through. |
| Gaze paused after resizing | Recalibrate for the new viewport. Use touch/keyboard/switch controls in the meantime. |
| Repeated dwell actions | Leave the chosen button before re-entry. Increase dwell time. Report a reproduction if a stationary target repeats. |
| No spoken audio | Check mute/volume, choose a local voice for the active language, and activate audio with a touch/click. Some browsers lack offline voices. |
| Neural speech unavailable | Check Piper is running, `PIPER_URL` points to its `/synthesize` endpoint, and `PIPER_VOICES` includes the selected language/model. Restart the UI after configuration changes. |
| Sinhala has no voice | The shipped catalog has no Piper Sinhala model. Install a Sinhala-capable device engine or add a compatible provider. Text remains usable. |
| Speech 429 | One synthesis is already running. Stop/wait, then retry; the service intentionally avoids a queue of outdated messages. |
| Speech times out | Try a shorter message, lighter model or device voice. Measure resource use; the proxy bounds generation to 20 seconds. |
| Chinese characters are missing | Use the device's full IME; the virtual board is a limited common-character/phrase board. |
| Settings do not persist | Browser storage may be disabled/private. Controls still work for the current session. |

Run `./system-check.sh` or `system-check.ps1` for non-mutating diagnostics. Include
OS/architecture, browser/runtime versions, chosen profile and a synthetic
reproduction in reports. Remove private text and credentials from logs.
