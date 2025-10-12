#!/usr/bin/env python3
"""
Eye-Tracking Mouse Controller for ALS Communication System
Inspired by Stephen Hawking's ACAT system

This script uses MediaPipe to track eye movements from a webcam,
controls the host's mouse cursor accordingly, and broadcasts the cursor's
screen coordinates over WebSocket.
"""

import cv2
import mediapipe as mp
import numpy as np
import asyncio
import websockets
import json
import os
import time
from collections import deque
import logging

# Try to import pyautogui, but make it optional
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
    logger_temp = logging.getLogger(__name__)
    logger_temp.info("PyAutoGUI loaded successfully - mouse control enabled")
except Exception as e:
    PYAUTOGUI_AVAILABLE = False
    logger_temp = logging.getLogger(__name__)
    logger_temp.warning(f"PyAutoGUI not available: {e}. Mouse control will be disabled, but WebSocket streaming will work.")
    pyautogui = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EyeTracker:
    def __init__(self, hardware_mode="CPU"):
        """Initialize the eye tracker with specified hardware mode."""
        self.hardware_mode = hardware_mode.upper()
        
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Configure Face Mesh based on hardware mode
        if self.hardware_mode == "GPU":
            logger.info("Initializing MediaPipe with GPU acceleration")
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
        else:
            logger.info("Initializing MediaPipe with CPU processing")
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
                static_image_mode=False
            )
        
        # Initialize webcam
        self.cap = cv2.VideoCapture(0)
        self.webcam_available = self.cap.isOpened()
        
        if not self.webcam_available:
            logger.warning("Could not open webcam - running in simulation mode")
            logger.warning("WebSocket server will still run for testing purposes")
            if self.cap is not None:
                self.cap.release()
            self.cap = None
        else:
            logger.info("Webcam initialized successfully")
            # Set webcam resolution for better performance
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        # Get screen dimensions
        if PYAUTOGUI_AVAILABLE:
            self.screen_width, self.screen_height = pyautogui.size()
            logger.info(f"Screen resolution: {self.screen_width}x{self.screen_height}")
        else:
            # Default to common resolution if pyautogui is not available
            self.screen_width, self.screen_height = 1920, 1080
            logger.info(f"Using default screen resolution: {self.screen_width}x{self.screen_height}")
        
        # Smoothing buffer for gaze coordinates
        self.gaze_buffer = deque(maxlen=5)  # Moving average of last 5 positions
        
        # WebSocket clients
        self.websocket_clients = set()
        
        # Eye landmark indices for MediaPipe Face Mesh
        # These correspond to the corners of the eyes
        self.LEFT_EYE_LANDMARKS = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        self.RIGHT_EYE_LANDMARKS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
        # Center points of eyes
        self.LEFT_EYE_CENTER = 468
        self.RIGHT_EYE_CENTER = 473
        
        # Calibration parameters (simple mapping)
        self.calibration_offset_x = 0
        self.calibration_offset_y = 0
        self.sensitivity_x = 1.0
        self.sensitivity_y = 1.0
        
    def get_gaze_point(self, landmarks, frame_width, frame_height):
        """Calculate gaze point from facial landmarks."""
        try:
            # Get eye landmarks
            left_eye_points = []
            right_eye_points = []
            
            for idx in self.LEFT_EYE_LANDMARKS:
                if idx < len(landmarks.landmark):
                    point = landmarks.landmark[idx]
                    left_eye_points.append([point.x * frame_width, point.y * frame_height])
            
            for idx in self.RIGHT_EYE_LANDMARKS:
                if idx < len(landmarks.landmark):
                    point = landmarks.landmark[idx]
                    right_eye_points.append([point.x * frame_width, point.y * frame_height])
            
            if not left_eye_points or not right_eye_points:
                return None
                
            # Calculate center of each eye
            left_eye_center = np.mean(left_eye_points, axis=0)
            right_eye_center = np.mean(right_eye_points, axis=0)
            
            # Calculate average eye center
            eye_center = (left_eye_center + right_eye_center) / 2
            
            # Simple mapping to screen coordinates
            # This is a basic implementation - a proper system would need calibration
            normalized_x = (eye_center[0] / frame_width)
            normalized_y = (eye_center[1] / frame_height)
            
            # Apply sensitivity and offset
            screen_x = int((normalized_x * self.sensitivity_x + self.calibration_offset_x) * self.screen_width)
            screen_y = int((normalized_y * self.sensitivity_y + self.calibration_offset_y) * self.screen_height)
            
            # Clamp to screen bounds
            screen_x = max(0, min(self.screen_width - 1, screen_x))
            screen_y = max(0, min(self.screen_height - 1, screen_y))
            
            return screen_x, screen_y
            
        except Exception as e:
            logger.error(f"Error calculating gaze point: {e}")
            return None
    
    def smooth_gaze_point(self, gaze_point):
        """Apply smoothing to reduce jitter."""
        if gaze_point is None:
            return None
            
        self.gaze_buffer.append(gaze_point)
        
        if len(self.gaze_buffer) == 0:
            return None
            
        # Calculate moving average
        avg_x = sum(point[0] for point in self.gaze_buffer) / len(self.gaze_buffer)
        avg_y = sum(point[1] for point in self.gaze_buffer) / len(self.gaze_buffer)
        
        return int(avg_x), int(avg_y)
    
    async def register_websocket_client(self, websocket, path):
        """Register a new WebSocket client."""
        self.websocket_clients.add(websocket)
        logger.info(f"WebSocket client connected from {websocket.remote_address}")
        try:
            await websocket.wait_closed()
        finally:
            self.websocket_clients.remove(websocket)
            logger.info(f"WebSocket client disconnected from {websocket.remote_address}")
    
    async def broadcast_coordinates(self, x, y):
        """Broadcast cursor coordinates to all connected WebSocket clients."""
        if self.websocket_clients:
            message = json.dumps({"x": x, "y": y, "timestamp": time.time()})
            
            # Remove disconnected clients
            disconnected_clients = set()
            for client in self.websocket_clients:
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected_clients.add(client)
            
            # Clean up disconnected clients
            self.websocket_clients -= disconnected_clients
    
    async def run_simulation_mode(self):
        """Run in simulation mode when no webcam is available."""
        logger.info("Simulation mode: Broadcasting center screen coordinates")
        
        # Broadcast center screen coordinates periodically
        center_x = self.screen_width // 2
        center_y = self.screen_height // 2
        
        while True:
            # Simulate slight movement around center
            offset_x = int(50 * np.sin(time.time()))
            offset_y = int(50 * np.cos(time.time()))
            
            x = center_x + offset_x
            y = center_y + offset_y
            
            # Broadcast coordinates via WebSocket
            await self.broadcast_coordinates(x, y)
            
            # Small delay to prevent overwhelming the system
            await asyncio.sleep(0.033)  # ~30 FPS
    
    async def run_eye_tracking(self):
        """Main eye tracking loop."""
        logger.info("Starting eye tracking loop...")
        
        # If no webcam, run in simulation mode
        if not self.webcam_available:
            logger.info("Running in simulation mode - generating simulated coordinates")
            await self.run_simulation_mode()
            return
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                logger.error("Failed to read from webcam")
                continue
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            frame_height, frame_width = frame.shape[:2]
            
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process the frame
            results = self.face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                for face_landmarks in results.multi_face_landmarks:
                    # Calculate gaze point
                    gaze_point = self.get_gaze_point(face_landmarks, frame_width, frame_height)
                    
                    if gaze_point:
                        # Apply smoothing
                        smoothed_point = self.smooth_gaze_point(gaze_point)
                        
                        if smoothed_point:
                            x, y = smoothed_point
                            
                            # Move system mouse cursor (only if pyautogui is available)
                            if PYAUTOGUI_AVAILABLE:
                                try:
                                    pyautogui.moveTo(x, y, duration=0)
                                except pyautogui.FailSafeException:
                                    logger.warning("PyAutoGUI fail-safe triggered")
                                except Exception as e:
                                    logger.error(f"Error moving mouse: {e}")
                            
                            # Broadcast coordinates via WebSocket
                            await self.broadcast_coordinates(x, y)
            
            # Small delay to prevent overwhelming the system
            await asyncio.sleep(0.033)  # ~30 FPS
    
    async def start_websocket_server(self):
        """Start the WebSocket server."""
        logger.info("Starting WebSocket server on port 8765...")
        server = await websockets.serve(self.register_websocket_client, "0.0.0.0", 8765)
        logger.info("WebSocket server started successfully")
        return server
    
    async def run(self):
        """Run the complete eye tracking system."""
        try:
            # Disable pyautogui fail-safe for smoother operation (if available)
            if PYAUTOGUI_AVAILABLE:
                pyautogui.FAILSAFE = False
            
            # Start WebSocket server
            websocket_server = await self.start_websocket_server()
            
            # Start eye tracking
            await self.run_eye_tracking()
            
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
        finally:
            # Cleanup
            if hasattr(self, 'cap') and self.cap is not None:
                self.cap.release()
            cv2.destroyAllWindows()

async def main():
    """Main entry point."""
    # Read hardware mode from environment variable
    hardware_mode = os.getenv("HARDWARE_MODE", "CPU")
    
    logger.info(f"Starting ALS Communication System - Vision Backend")
    logger.info(f"Hardware mode: {hardware_mode}")
    
    try:
        tracker = EyeTracker(hardware_mode=hardware_mode)
        await tracker.run()
    except Exception as e:
        logger.error(f"Failed to start eye tracker: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(asyncio.run(main()))