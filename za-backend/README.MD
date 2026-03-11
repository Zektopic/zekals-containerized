# ALS Communication System - Vision Backend

The Vision Backend is a Python-based service that uses MediaPipe for eye-tracking and controls the system mouse cursor. It also broadcasts cursor coordinates via WebSocket for the frontend to use.

## Features

- **Eye Tracking**: Uses MediaPipe Face Mesh for real-time eye detection
- **Mouse Control**: Controls the system mouse cursor based on gaze direction
- **WebSocket Server**: Broadcasts cursor coordinates to connected clients
- **Hardware Flexibility**: Supports both CPU and GPU processing modes
- **Smoothing**: Implements moving average to reduce cursor jitter

## Requirements

- Python 3.10+
- Webcam (USB or built-in)
- X11 display server (for mouse control)
- Optional: CUDA-compatible GPU for acceleration

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export HARDWARE_MODE=CPU  # or GPU for CUDA acceleration
export DISPLAY=:0         # X11 display server
```

## Usage

Run the eye tracker:
```bash
python eye_tracker.py
```

Test WebSocket connection:
```bash
python test_websocket.py
```

## Configuration

### Environment Variables

- `HARDWARE_MODE`: Processing mode (`CPU` or `GPU`)
- `DISPLAY`: X11 display server (usually `:0`)

### Calibration

The system uses a simple mapping from eye position to screen coordinates. For better accuracy, a proper calibration system should be implemented in the future.

## WebSocket API

The service provides a WebSocket server on port 8765 that broadcasts cursor coordinates:

```json
{
  "x": 1024,
  "y": 768,
  "timestamp": 1640995200.123
}
```

## Docker

Build the Docker image:
```bash
docker build -t als-vision-backend .
```

Run with Docker:
```bash
docker run --privileged \
  --device /dev/video0:/dev/video0 \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -e DISPLAY=:0 \
  -e HARDWARE_MODE=CPU \
  -p 8765:8765 \
  als-vision-backend
```

## Troubleshooting

### Camera Access Issues
- Ensure `/dev/video0` exists and is accessible
- Check camera permissions
- Try different camera indices if multiple cameras are present

### X11 Permission Issues
- Run `xhost +local:docker` to allow Docker containers to access X11
- Ensure `DISPLAY` environment variable is set correctly

### Performance Issues
- Use GPU mode if available: `HARDWARE_MODE=GPU`
- Reduce camera resolution for better performance
- Adjust the FPS limit in the code if needed