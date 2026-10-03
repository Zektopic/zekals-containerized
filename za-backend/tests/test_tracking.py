import asyncio
import math
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eye_tracker import Pipeline, Sample, serve_pipeline
from filtering import GazeFilter, State
from inference import select_providers, verify_model


class TrackingTests(unittest.TestCase):
    def test_loss_and_staleness(self):
        pipeline = Pipeline()
        pipeline.sample = Sample((0.2, 0.8), 10, "tracking")
        self.assertTrue(pipeline.message(10.1)["valid"])
        self.assertFalse(pipeline.message(10.6)["valid"])
        pipeline.sample = Sample(reason="face_lost")
        self.assertFalse(pipeline.message(10.1)["valid"])

    def test_cpu_fallback_and_explicit_accelerators(self):
        self.assertEqual(select_providers(["CPUExecutionProvider"], "gpu"), [("CPUExecutionProvider", {})])
        self.assertEqual(select_providers(["OpenVINOExecutionProvider"], "npu", "NPU")[0],
                         ("OpenVINOExecutionProvider", {"device_type": "NPU"}))
        self.assertEqual(select_providers(["CUDAExecutionProvider"], "cpu"), [("CPUExecutionProvider", {})])

    def test_corrupted_filter_state_recovers(self):
        for enabled in (False, True):
            filter_ = GazeFilter(native=enabled)
            filter_.state = State(float("nan"), float("inf"), float("nan"), 1)
            self.assertEqual(filter_.step(0.2, 0.8, 10), (0.2, 0.8))

    def test_checksum_required(self):
        with self.assertRaises(ValueError):
            verify_model("missing", "")

    def test_filter_parity_and_invalid_samples(self):
        portable, native = GazeFilter(native=False), GazeFilter()
        for i in range(1000):
            x, y = (math.sin(i) + 1) / 2, (math.cos(i) + 1) / 2
            a, b = portable.step(x, y, i * 20), native.step(x, y, i * 20)
            for first, second in zip(a, b):
                self.assertAlmostEqual(first, second)
        for filter_ in (portable, native):
            self.assertIsNone(filter_.step(float("nan"), 0, 1))
            self.assertEqual(filter_.step(0.9, 0.1, 50), (0.9, 0.1))


class StreamTests(unittest.IsolatedAsyncioTestCase):
    async def test_remote_binding_requires_secret(self):
        with self.assertRaises(ValueError):
            await serve_pipeline(Pipeline(), host="0.0.0.0")

    async def test_missing_camera_sends_invalid_gaze_over_real_socket(self):
        from websockets.asyncio.client import connect
        import socket
        import json
        # Reserve a local port for this integration test.
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        stopped = asyncio.Event()
        task = asyncio.create_task(serve_pipeline(Pipeline(), port=port, token="secret", stop_event=stopped))
        try:
            for attempt in range(100):
                try:
                    ws = await connect(f"ws://127.0.0.1:{port}", additional_headers={"Authorization": "Bearer secret"})
                    break
                except OSError:
                    await asyncio.sleep(0.01)
            else:
                self.fail("Tracker failed to start")
            async with ws:
                value = json.loads(await asyncio.wait_for(ws.recv(), 1))
                self.assertFalse(value["valid"])
                self.assertIsNone(value["x"])
        finally:
            stopped.set()
            await task


if __name__ == "__main__":
    unittest.main()
