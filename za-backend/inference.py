"""Inference adapters. Models and runtime availability determine accelerator support."""
import hashlib
import logging
import math
from pathlib import Path

LOG = logging.getLogger(__name__)


def verify_model(path, checksum):
    if not checksum or len(checksum) != 64:
        raise ValueError("Set MODEL_SHA256 to the reviewed model's SHA-256 digest")
    if hashlib.sha256(Path(path).read_bytes()).hexdigest() != checksum.lower():
        raise ValueError("Model checksum mismatch")


def iris_ratio(landmarks):
    """Use iris location relative to both eye corners, not face position as gaze."""
    if len(landmarks) < 478:
        return None
    values = []
    for iris, left, right, top, bottom in [(468, 33, 133, 159, 145), (473, 362, 263, 386, 374)]:
        width = abs(landmarks[right].x - landmarks[left].x)
        height = abs(landmarks[bottom].y - landmarks[top].y)
        if width < 1e-6 or height / width < 0.10:
            return None  # Closed eyes must cancel dwell.
        x = (landmarks[iris].x - min(landmarks[left].x, landmarks[right].x)) / width
        y = (landmarks[iris].y - min(landmarks[top].y, landmarks[bottom].y)) / height
        values.append((x, y))
    x, y = (sum(pair[i] for pair in values) / 2 for i in (0, 1))
    return (x, y) if all(math.isfinite(v) and 0 <= v <= 1 for v in (x, y)) else None


class MediaPipeInference:
    def __init__(self, model, mode="cpu"):
        import mediapipe as mp
        self.mp = mp
        self.active_provider = "CPU"
        self.last_timestamp = -1
        delegate = mp.tasks.BaseOptions.Delegate
        delegates = [delegate.GPU, delegate.CPU] if mode in ("auto", "gpu") else [delegate.CPU]
        self.model = None
        for selected in delegates:
            try:
                self.model = mp.tasks.vision.FaceLandmarker.create_from_options(
                    mp.tasks.vision.FaceLandmarkerOptions(
                        base_options=mp.tasks.BaseOptions(model_asset_path=model, delegate=selected),
                        running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=1,
                        min_face_detection_confidence=0.7, min_face_presence_confidence=0.7,
                        min_tracking_confidence=0.7))
                self.active_provider = selected.name
                break
            except (RuntimeError, ValueError):
                LOG.warning("MediaPipe %s unavailable; trying CPU", selected.name)
        if self.model is None:
            raise RuntimeError("MediaPipe could not initialize the reviewed model")
        if mode == "npu":
            LOG.warning("MediaPipe Python has no NPU delegate; using CPU. Use ONNX for a compatible NPU model.")

    def predict(self, rgb, timestamp_ms):
        self.last_timestamp = max(int(timestamp_ms), self.last_timestamp + 1)
        result = self.model.detect_for_video(self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=rgb), self.last_timestamp)
        return iris_ratio(result.face_landmarks[0]) if result.face_landmarks else None

    def close(self):
        self.model.close()


def select_providers(available, mode, device="CPU"):
    """CPU remains last; provider presence alone does not prove accelerated execution."""
    candidates = []
    if mode == "npu":
        if device == "NPU":
            candidates.append(("OpenVINOExecutionProvider", {"device_type": "NPU"}))
        # QNN needs a vendor backend path and a compatible quantized model: see docs/hardware.md.
    elif mode in ("gpu", "auto"):
        candidates += [("CUDAExecutionProvider", {}), ("DmlExecutionProvider", {})]
        if device == "GPU":
            candidates.append(("OpenVINOExecutionProvider", {"device_type": "GPU"}))
    return [(name, config) for name, config in candidates if name in available] + [("CPUExecutionProvider", {})]


class OnnxInference:
    """Optional custom-model contract: RGB NCHW float32 [0,1] -> [x,y,confidence]."""
    def __init__(self, model, mode="cpu", device="CPU", runtime=None):
        if runtime is None:
            import onnxruntime as runtime
        self.runtime, self.path = runtime, model
        options = runtime.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.options = options
        try:
            self.session = runtime.InferenceSession(model, sess_options=options,
                providers=select_providers(runtime.get_available_providers(), mode, device))
        except Exception:
            LOG.warning("Accelerator initialization failed; using ONNX CPU")
            self.session = runtime.InferenceSession(model, sess_options=options, providers=["CPUExecutionProvider"])
        inputs, outputs = self.session.get_inputs(), self.session.get_outputs()
        if (len(inputs) != 1 or inputs[0].type != "tensor(float)" or len(inputs[0].shape) != 4
            or inputs[0].shape[:2] != [1, 3] or not all(isinstance(n, int) and 16 <= n <= 1024 for n in inputs[0].shape[2:])
            or len(outputs) != 1 or outputs[0].shape != [1, 3]):
            raise ValueError("ONNX contract requires [1,3,H,W] float input and [1,3] output")
        self.input = inputs[0]
        self.active_provider = ",".join(self.session.get_providers())

    def predict(self, rgb, timestamp_ms):
        import cv2
        import numpy as np
        height, width = self.input.shape[2:]
        tensor = np.ascontiguousarray(cv2.resize(rgb, (width, height)).transpose(2, 0, 1)[None], dtype=np.float32) / 255
        try:
            output = self.session.run(None, {self.input.name: tensor})[0]
        except Exception:
            if self.session.get_providers() == ["CPUExecutionProvider"]:
                raise
            LOG.warning("Accelerator execution failed; retrying on CPU")
            self.session = self.runtime.InferenceSession(self.path, sess_options=self.options, providers=["CPUExecutionProvider"])
            self.active_provider = "CPUExecutionProvider"
            output = self.session.run(None, {self.input.name: tensor})[0]
        x, y, confidence = (float(v) for v in output[0])
        return (x, y) if confidence >= 0.7 and all(math.isfinite(v) and 0 <= v <= 1 for v in (x, y, confidence)) else None

    def close(self):
        self.session = None
