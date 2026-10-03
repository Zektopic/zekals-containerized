# Installation and operation

## Basic communication interface

Node.js 22+ is sufficient. Run `npm ci --prefix za-frontend`, then
`npm start --prefix za-frontend`. Open http://localhost:3000. `npm start` reads the
optional root `.env` as data. No environment file is required. Supported starting
points are modern desktop browsers and recent Android browsers; see validation
for the browser version actually tested.

On Linux, `./setup-ubuntu.sh` installs project dependencies and creates `.env` if
missing; `./run-dev.sh` launches the UI. It does not install system packages,
change groups, disable browser sandboxing or modify X11 permissions. Install
Node through your usual trusted package manager first.

On Windows, install Node 22+, run `powershell -File setup-windows.ps1`, then
`run-dev.bat`. No administrator privileges are needed for project setup. PowerShell
execution policy remains under the machine owner's control. Python camera setup
is optional and uses the same requirements as Linux; virtualenv executables are
in `.venv\Scripts\` rather than `.venv/bin/`.

## Containers

Install Docker Engine/Desktop with Compose v2. Run `docker compose up --build -d`
and open http://localhost:8080. Stop with `docker compose down`; inspect status with
`docker compose ps` and logs with `docker compose logs --tail=100 ui`.
The default service runs as a non-root user with a read-only filesystem and no
capabilities. Port 8080 binds only to loopback. No camera or speech service is
required. Do not run the obsolete `docker-compose` v1 command.

## Optional camera tracking on the host

Use Python 3.12+ and ensure the operating system grants the current user camera
access. On minimal Linux installations, OpenCV may need `libgl1` and `libglib2.0-0`.
The camera dependency set uses one OpenCV distribution, `opencv-contrib-python`;
do not install headless and GUI variants together in the same environment.

```bash
python3 -m venv .venv
.venv/bin/pip install -r za-backend/requirements-camera.txt
.venv/bin/python scripts/download_model.py
cp .env.example .env  # only if you do not already have a configuration
```

Set `TRACKER_URL=ws://127.0.0.1:8765` in `.env`. The example contains the pinned
model checksum. In one terminal, run `.venv/bin/python scripts/run_tracker.py`;
in another, run `npm start --prefix za-frontend`. Choose Eye tracking in Settings
and calibrate. Frames never go through the browser or leave the camera service.

Optional native filter: install a Rust toolchain and run `cargo build --release`.
The tracker detects the built library at startup. Without it, the portable filter
works normally. This does not change the inference provider or imply a speedup.

The model downloader checks a pinned SHA-256 before replacing the local file.
For a different reviewed model, set both `GAZE_MODEL` and `MODEL_SHA256` and verify
the adapter contract. See [hardware](hardware.md) for optional accelerator setup.

## Linux camera container

Prepare the model as above. Generate a token with
`python3 -c 'import secrets; print(secrets.token_hex(32))'` and store it as
`TRACKER_TOKEN` in `.env`. Set `VIDEO_GID` to the numeric group owning the webcam
(`stat -c %g /dev/video0`). Then:

```bash
docker compose -f docker-compose.yml -f docker-compose.camera.yml up --build -d
```

The tracker is reachable only inside the Compose network and requires the token.
Only `/dev/video0` is passed through; use `CAMERA_DEVICE` to select another camera.
No privileged mode, host networking, X11 socket or operating-system mouse control
is needed. The supplied camera container selects CPU inference. Native host
execution is the supported route for experimenting with GPU delegates.
Docker Desktop does not automatically pass a Windows/macOS webcam into Linux
containers; use a host tracker or manually configure a supported device bridge.

## Raspberry Pi and small computers

Use a 64-bit OS, Python 3.12+ for the pinned camera packages, and a browser with
Web Speech/Intl.Segmenter support. A stock older OS with Python 3.11 needs a newer
Python installation or a separately validated dependency set. Start with the UI
only, then the low camera profile. ARM64 wheels exist for the pinned MediaPipe,
Piper and OpenCV packages, but that does not prove camera or thermal performance
on a particular Pi. Hardware trials remain outstanding. A Pi has no general NPU
by default; add-on accelerators require a compatible runtime and model adapter.

## Network and speech configuration

For local neural speech, follow [speech and languages](speech-and-languages.md).
To serve a caregiver's remote browser, deploy behind HTTPS with authentication,
set the exact public URL in `ALLOWED_ORIGINS`, and bind the UI intentionally.
The supplied application is designed for a trusted local user and does not provide
multi-user accounts. Never expose the tracker or Piper ports publicly. For reverse
proxies, preserve the original Host and WebSocket upgrade headers.
