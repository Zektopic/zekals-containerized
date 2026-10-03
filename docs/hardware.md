# Hardware and performance

The interface works independently of camera inference. Start with the `low`
profile; increase resolution and frame rate only when measurements justify it.

| Profile | Requested capture size | Inference ceiling | Intended starting point |
| --- | --- | --- | --- |
| low | 320 × 240 | 10 FPS | older CPUs, Raspberry Pi 4/5 |
| balanced | 640 × 480 | 20 FPS | recent laptops |
| high | 960 × 720 | 30 FPS | measured high-performance devices |

Camera drivers can ignore requested settings. There is one latest frame and one
latest result, never an unbounded inference queue. Capture and inference run off
the WebSocket event loop. Results expire after 500 ms. A missing camera retries at
two-second intervals. Images stay in memory; only normalized coordinates are sent.
The application does not move or click the operating system's mouse.

## Support versus verification

| Hardware | Available implementation | Verification |
| --- | --- | --- |
| x86_64 CPU | MediaPipe face landmarks, Rust or Python filter | Real model initialization and no-face inference tested on development host |
| ARM64 Linux / Raspberry Pi | browser UI, portable filter, optional Rust; camera if runtime wheel is available | Physical device testing required; verify wheels before deployment |
| Linux GPU | MediaPipe GPU delegate with CPU initialization fallback | Driver/EGL and compatible runtime required; hardware untested |
| NVIDIA GPU | optional ONNX CUDA provider | Requires CUDA/cuDNN and a compatible custom model; hardware untested |
| Windows GPU | optional ONNX DirectML provider | Vendor runtime installation and custom model required; hardware untested |
| Intel GPU / NPU | optional ONNX OpenVINO provider, explicit `OPENVINO_DEVICE=GPU` or `NPU` | Compatible model, runtime and drivers required; hardware untested |
| Qualcomm / Apple / Rockchip NPU | no bundled provider implementation | Future vendor-specific adapter; CPU remains usable |
| Android ARM64 / x86_64 | separate native application | See companion repository's validation matrix |

`HARDWARE_MODE=cpu` is the default. With MediaPipe, `gpu` or `auto` tries the
actual GPU delegate and falls back to CPU during initialization. `npu` logs that
MediaPipe Python cannot use an NPU. A GPU failure during streaming invalidates
tracking; restart in CPU mode. It never silently emits fabricated gaze.

## Optional ONNX models

Set `INFERENCE_ENGINE=onnx`, `GAZE_MODEL` to a reviewed ONNX file, and
`MODEL_SHA256` to its digest. Install `requirements-onnx.txt` for CPU, or replace
`onnxruntime` with the vendor's compatible runtime package. Do not install
multiple ONNX Runtime variants in the same environment. Supported adapter input:
RGB (mirrored camera), float32 `[1,3,H,W]`, normalized to `[0,1]`; output:
float coordinates and confidence `[1,3]`, each in `[0,1]`. Confidence below 0.7
invalidates input. This is an extension contract, **not a bundled trained gaze
model**; arbitrary face or iris models are not interchangeable with it.

Provider initialization and execution failures fall back to ONNX CPU. The reported
provider list indicates session configuration, not proof that every operator ran
on an accelerator. Inspect vendor profiling and validate accuracy before claiming
NPU/GPU speedups. Quantization can change gaze accuracy.

## Rust and measurements

`cargo build --release` builds an allocation-free C ABI filter; Python loads it
when available, otherwise it uses a numerically equivalent implementation. It
requires no Rust crate dependencies. `GAZE_LIBRARY` can specify a trusted absolute
library path. Cross-build for a target with the appropriate Rust target and linker;
never copy an x86 shared library to an ARM machine.

Run `python scripts/benchmark_filter.py` after building. The recorded host result
in [filter-benchmark.json](filter-benchmark.json) measures 100,000 actual Python
calls, including FFI. For this tiny operation the Rust FFI was slightly slower on
the development host. The Rust implementation provides a portable native boundary;
there is **no claimed end-to-end speedup** from this microbenchmark. Capture,
inference resolution, dropped stale frames and avoiding work when idle matter more.

For device acceptance, record OS/runtime/model checksum, input resolution, frame
rate, median/p95 capture-to-result latency, peak RSS, CPU utilization and ten-minute
thermal behavior. Test tracking loss, USB disconnect, slow clients, screen resize,
user fatigue, and calibration error before and after acceleration. No camera FPS,
energy or accuracy result is implied by the filter benchmark.

References: [MediaPipe Python Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/python),
[ONNX CUDA](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html),
[ONNX OpenVINO](https://onnxruntime.ai/docs/execution-providers/OpenVINO-ExecutionProvider.html).
