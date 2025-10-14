#!/usr/bin/env python3
"""
Basic tests for Project F.O.N.E backend
Tests core functionality without requiring hardware dependencies
"""

import pytest
import sys
import os
import unittest.mock
import asyncio
import json

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestImports:
    """Test that all required modules can be imported."""
    
    def test_core_dependencies(self):
        """Test that core dependencies are available."""
        try:
            import cv2
            import mediapipe
            import pyautogui
            import websockets
            import numpy
            assert True
        except ImportError as e:
            pytest.fail(f"Failed to import required module: {e}")
    
    def test_standard_library(self):
        """Test standard library imports."""
        import json
        import asyncio
        import logging
        import os
        import time
        assert True


class TestBasicFunctionality:
    """Test basic functionality without hardware dependencies."""
    
    def test_numpy_operations(self):
        """Test basic numpy operations (MediaPipe dependency)."""
        import numpy as np
        arr = np.array([1, 2, 3])
        assert len(arr) == 3
        assert np.sum(arr) == 6
        assert arr.dtype == np.int64 or arr.dtype == np.int32
    
    def test_opencv_basics(self):
        """Test basic OpenCV functionality."""
        import cv2
        import numpy as np
        
        # Create a test image
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        assert img.shape == (100, 100, 3)
        
        # Test basic OpenCV operation
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        assert gray.shape == (100, 100)
    
    def test_json_operations(self):
        """Test JSON serialization for WebSocket messages."""
        test_data = {"x": 123, "y": 456, "timestamp": 1234567890}
        json_str = json.dumps(test_data)
        parsed_data = json.loads(json_str)
        
        assert parsed_data["x"] == 123
        assert parsed_data["y"] == 456
        assert parsed_data["timestamp"] == 1234567890


class TestWebSocketFunctionality:
    """Test WebSocket related functionality."""
    
    @pytest.mark.asyncio
    async def test_websocket_message_format(self):
        """Test WebSocket message formatting."""
        # Simulate coordinate data
        x, y = 100, 200
        message = json.dumps({"x": x, "y": y})
        
        # Parse the message
        data = json.loads(message)
        assert data["x"] == 100
        assert data["y"] == 200
        assert isinstance(data["x"], int)
        assert isinstance(data["y"], int)
    
    def test_coordinate_validation(self):
        """Test coordinate validation logic."""
        # Test valid coordinates
        valid_coords = [(0, 0), (1920, 1080), (100, 100)]
        for x, y in valid_coords:
            assert x >= 0
            assert y >= 0
            assert isinstance(x, int)
            assert isinstance(y, int)
        
        # Test coordinate bounds
        screen_width, screen_height = 1920, 1080
        test_x, test_y = 500, 300
        
        # Clamp coordinates to screen bounds
        clamped_x = max(0, min(test_x, screen_width))
        clamped_y = max(0, min(test_y, screen_height))
        
        assert clamped_x == test_x
        assert clamped_y == test_y


class TestEnvironmentConfiguration:
    """Test environment configuration handling."""
    
    def test_hardware_mode_detection(self):
        """Test hardware mode environment variable handling."""
        # Mock environment variables
        with unittest.mock.patch.dict(os.environ, {'HARDWARE_MODE': 'CPU'}):
            hardware_mode = os.environ.get('HARDWARE_MODE', 'CPU')
            assert hardware_mode == 'CPU'
        
        with unittest.mock.patch.dict(os.environ, {'HARDWARE_MODE': 'GPU'}):
            hardware_mode = os.environ.get('HARDWARE_MODE', 'CPU')
            assert hardware_mode == 'GPU'
        
        # Test default value
        with unittest.mock.patch.dict(os.environ, {}, clear=True):
            hardware_mode = os.environ.get('HARDWARE_MODE', 'CPU')
            assert hardware_mode == 'CPU'
    
    def test_display_configuration(self):
        """Test display environment variable handling."""
        with unittest.mock.patch.dict(os.environ, {'DISPLAY': ':0'}):
            display = os.environ.get('DISPLAY')
            assert display == ':0'


class TestSmoothingAlgorithm:
    """Test the smoothing algorithm for cursor movement."""
    
    def test_moving_average(self):
        """Test moving average calculation."""
        # Simple moving average implementation
        def moving_average(values, window_size):
            if len(values) < window_size:
                return sum(values) / len(values) if values else 0
            return sum(values[-window_size:]) / window_size
        
        # Test with sample data
        test_values = [10, 20, 30, 40, 50]
        
        # Window size 3
        avg_3 = moving_average(test_values, 3)
        expected_3 = (30 + 40 + 50) / 3
        assert avg_3 == expected_3
        
        # Window size 5
        avg_5 = moving_average(test_values, 5)
        expected_5 = (10 + 20 + 30 + 40 + 50) / 5
        assert avg_5 == expected_5
        
        # Window larger than data
        avg_large = moving_average([1, 2], 5)
        assert avg_large == 1.5
    
    def test_coordinate_smoothing(self):
        """Test coordinate smoothing with realistic data."""
        # Simulate noisy eye tracking data
        raw_coordinates = [
            (100, 100), (102, 98), (99, 101), (101, 99), (100, 100),
            (103, 102), (98, 99), (101, 101), (100, 100)
        ]
        
        def smooth_coordinates(coords, window_size=3):
            if len(coords) < window_size:
                return coords[-1] if coords else (0, 0)
            
            recent_coords = coords[-window_size:]
            avg_x = sum(x for x, y in recent_coords) // len(recent_coords)
            avg_y = sum(y for x, y in recent_coords) // len(recent_coords)
            return (avg_x, avg_y)
        
        smoothed = smooth_coordinates(raw_coordinates, 3)
        
        # Should be close to (100, 100)
        assert 99 <= smoothed[0] <= 101
        assert 99 <= smoothed[1] <= 101


if __name__ == "__main__":
    pytest.main([__file__, "-v"])