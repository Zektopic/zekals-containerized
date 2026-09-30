# Development and releases

Use Node 22+, Python 3.12+ for tracking, and stable Rust for the optional native
filter. Native camera and speech dependencies are separate so basic UI development
and CI do not load computer-vision stacks unnecessarily.

```bash
npm ci --prefix za-frontend
npm test --prefix za-frontend
node za-frontend/language-packs.js
(cd za-frontend && npx playwright install chromium && npx playwright test)
cargo fmt --check
cargo clippy -- -D warnings
cargo test
cargo build --release
python3 -m venv .venv
.venv/bin/pip install -r za-backend/requirements.txt
.venv/bin/python -m unittest discover -s za-backend/tests -v
```

Node tests exercise the production HTTP server, origin/path handling, WebSockets,
speech limits and pack validation. Browser tests exercise real controls, languages,
dwell locking, switch pause and axe rules. Python tests cover stream behavior,
staleness, provider selection and native/reference parity. Rust tests exercise
filter reset, bounds and time behavior. Add tests for meaningful behavior changes;
avoid test copies of application logic.

## Manual acceptance

Check device IME composition (Chinese/Sinhala), local voices, denied audio playback,
all input modes, a real switch, camera disconnect, page hide, failed calibration,
browser zoom, mobile rotation, scrolling and long messages. Request native-speaker
review and user/caregiver feedback. Record actual hardware measurements using the
hardware guide, including model checksums. Never promote a provider-selection test
into a claim that a GPU or NPU was tested.

## Dependencies and review

Use `npm ci` with the committed lockfile. Python direct dependencies are pinned;
transitive runtime resolution is currently recorded by the installer, not a
cross-platform hash lock. For releases, preserve the resolved package list/SBOM
and run audits in the exact target environment. Optional accelerator packages
need vendor-specific constraints; do not mix mutually exclusive runtime wheels.
Model downloads are not part of ordinary tests.

Changes are organized as a PR stack: security, tracking, interface, language/speech,
setup and documentation. Merge in order, retargeting each next PR to `main` after
its prerequisite merges, then rerun CI. This keeps each review focused. The new
Android repository has a separate stack and should be validated independently.

## Release artifacts

`./scripts/create_deployment_artifacts.sh v2.0.0-review` exports committed source
into `dist/` with a checksum, excluding untracked secrets and models. It does not
publish or deploy automatically. Build images from reviewed commits and pin image
digests in deployment infrastructure. The CI Docker build verifies the default UI;
physical camera access and accelerator builds require their own target validation.
