#!/bin/bash
set -e

# Create the tests directory if it doesn't exist
mkdir -p za-backend/tests

# Create the test file
cat > za-backend/tests/test_basic.py << 'EOF'
import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test that all required modules can be imported."""
    try:
        import cv2
        import mediapipe
        import pyautogui
        import websockets
        import numpy
        assert True
    except ImportError as e:
        pytest.fail(f"Failed to import required module: {e}")

def test_basic_functionality():
    """Test basic functionality without hardware dependencies."""
    import numpy as np
    # Test basic numpy operations (MediaPipe dependency)
    arr = np.array([1, 2, 3])
    assert len(arr) == 3
    assert np.sum(arr) == 6
EOF