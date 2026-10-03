#!/usr/bin/env python3
"""Bounded local gaze stream. Camera capture and inference never block asyncio."""
import asyncio
from dataclasses import dataclass
import hmac
import json
import logging
import os
import signal
import threading
import time
from http import HTTPStatus

from filtering import GazeFilter
from inference import MediaPipeInference, OnnxInference, verify_model

LOG = logging.getLogger("zekals.tracker")
PROFILES = {"low": (320, 240, 10), "balanced": (640, 480, 20), "high": (960, 720, 30)}


@dataclass
class Sample:
    point: tuple | None = None
    captured: float = 0.0
    reason: str = "starting"


class Pipeline:
    def __init__(self, profile="low", camera=0, model="", checksum="", engine="mediapipe", mode="cpu", device="CPU"):
        self.width, self.height, self.fps = PROFILES[profile]
        self.camera, self.model, self.checksum = camera, model, checksum
        self.engine, self.mode, self.device = engine, mode, device
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.frame = None
        self.sample = Sample()
        self.active_provider = "unavailable"
        self.threads = []

    def start(self):
        for target in (self.capture, self.infer):
            thread = threading.Thread(target=target, daemon=True)
            self.threads.append(thread)
            thread.start()

    def capture(self):
        import cv2
        cap = None
        try:
            while not self.stop.is_set():
                if cap is None:
                    cap = cv2.VideoCapture(self.camera)
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                    cap.set(cv2.CAP_PROP_FPS, self.fps)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                ok, frame = cap.read()
                if not ok:
                    with self.lock:
                        self.frame = None
                        self.sample = Sample(reason="camera_unavailable")
                    cap.release()
                    cap = None
                    self.stop.wait(2)  # Avoid a missing-camera busy loop.
                    continue
                with self.lock:
                    self.frame = (frame, time.monotonic())  # Replace, never queue frames.
        except Exception:
            LOG.exception("Camera capture failed")
        finally:
            if cap is not None:
                cap.release()

    def infer(self):
        model = None
        try:
            import cv2
            verify_model(self.model, self.checksum)
            model = (OnnxInference(self.model, self.mode, self.device) if self.engine == "onnx"
                     else MediaPipeInference(self.model, self.mode))
            self.active_provider = model.active_provider
            smoother = GazeFilter()
            LOG.info("Provider=%s filter=%s", self.active_provider, "rust" if smoother.library else "python")
            last = 0.0
            while not self.stop.is_set():
                started = time.monotonic()
                with self.lock:
                    frame = self.frame
                if frame is None or frame[1] == last or started - frame[1] > 0.5:
                    self.stop.wait(0.02)
                    continue
                image, last = frame
                rgb = cv2.cvtColor(cv2.flip(image, 1), cv2.COLOR_BGR2RGB)
                point = model.predict(rgb, last * 1000)
                smooth = smoother.step(*(point or (0, 0)), last * 1000, valid=point is not None)
                with self.lock:
                    self.sample = Sample(smooth, last, "tracking" if smooth else "face_lost")
                self.active_provider = model.active_provider
                self.stop.wait(max(0, 1 / self.fps - (time.monotonic() - started)))
        except Exception:
            LOG.exception("Tracking unavailable; pointer, touch and switch access remain available")
            with self.lock:
                self.sample = Sample(reason="model_unavailable")
        finally:
            if model is not None:
                model.close()

    def message(self, now=None):
        with self.lock:
            sample = self.sample
        now = time.monotonic() if now is None else now
        valid = sample.point is not None and 0 <= now - sample.captured <= 0.5
        return {"type": "gaze", "valid": valid, "x": sample.point[0] if valid else None,
                "y": sample.point[1] if valid else None,
                "reason": sample.reason if not sample.point or valid else "stale",
                "provider": self.active_provider}

    def close(self):
        self.stop.set()
        for thread in self.threads:
            thread.join(timeout=2)


async def serve_pipeline(pipeline, host="127.0.0.1", port=8765, token="", stop_event=None):
    from websockets.asyncio.server import serve
    if host not in ("127.0.0.1", "::1", "localhost") and len(token) < 32:
        raise ValueError("A remote tracker requires a TRACKER_TOKEN of at least 32 characters")

    def authorize(connection, request):
        if token and not hmac.compare_digest(request.headers.get("Authorization", ""), f"Bearer {token}"):
            return connection.respond(HTTPStatus.UNAUTHORIZED, "Unauthorized\n")
        return None

    clients = set()

    async def client(websocket):
        if len(clients) >= 4:
            await websocket.close(1013, "Too many connections")
            return
        clients.add(websocket)
        try:
            while True:
                # One slow reader can only delay its own stream, not capture or other clients.
                async with asyncio.timeout(1):
                    await websocket.send(json.dumps(pipeline.message(), allow_nan=False))
                await asyncio.sleep(1 / pipeline.fps)
        except Exception as error:
            LOG.debug("Tracker client closed: %s", type(error).__name__)
        finally:
            clients.discard(websocket)

    async with serve(client, host, port, origins=[None], process_request=authorize,
                     max_size=1024, max_queue=1, write_limit=4096, compression=None,
                     ping_interval=20, ping_timeout=10) as server:
        LOG.info("Tracker listening on %s:%s", host, server.sockets[0].getsockname()[1])
        await (stop_event or asyncio.Event()).wait()


async def main():
    logging.basicConfig(level=logging.INFO)
    pipeline = Pipeline(profile=os.getenv("PERFORMANCE_PROFILE", "low"), camera=int(os.getenv("CAMERA_INDEX", "0")),
                        model=os.getenv("GAZE_MODEL", "models/face_landmarker.task"), checksum=os.getenv("MODEL_SHA256", ""),
                        engine=os.getenv("INFERENCE_ENGINE", "mediapipe"), mode=os.getenv("HARDWARE_MODE", "cpu").lower(),
                        device=os.getenv("OPENVINO_DEVICE", "CPU"))
    stopped = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stopped.set)
        except NotImplementedError:  # Windows asyncio loop
            pass
    pipeline.start()
    try:
        await serve_pipeline(pipeline, os.getenv("TRACKER_HOST", "127.0.0.1"), int(os.getenv("WEBSOCKET_PORT", "8765")),
                             os.getenv("TRACKER_TOKEN", ""), stopped)
    finally:
        pipeline.close()


if __name__ == "__main__":
    asyncio.run(main())
