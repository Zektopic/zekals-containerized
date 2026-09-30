# Third-party software and models

Application code uses the repository's MIT license. This does not relicense any
third-party package or model. Verify the exact artifacts used for distribution.

- Node.js and `ws`: respective upstream license notices, retained by package managers.
- MediaPipe: Apache-2.0 code. The separately downloaded face-landmarker model has
  its own distribution terms; see the upstream model documentation. Its source URL
  and exact SHA-256 are in `scripts/download_model.py`.
- OpenCV, NumPy and ONNX Runtime: upstream notices and bundled dependency licenses
  remain applicable. Vendor accelerator runtimes can impose additional terms.
- Piper's maintained `OHF-Voice/piper1-gpl` engine: GPL-3.0. It is an optional,
  separately installed local process; do not describe it as MIT-licensed. Review
  your distribution obligations before bundling it.
- Piper voices: licenses and attribution vary by voice/dataset. Obtain the model
  card with each downloaded voice; check it before redistribution. The repository
  does not commit voice weights or claim rights to voices.
- Playwright and axe: development-only tooling with their upstream license notices.

No model or voice is downloaded in the normal UI startup path. Record checksums,
source, license, consent/attribution requirements and installed runtime versions
for every shipped model. Do not infer a model's license from its file extension or
from the inference engine's license.
