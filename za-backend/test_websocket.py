#!/usr/bin/env python3
"""
Simple WebSocket client to test the eye tracker's coordinate broadcasting.
"""

import asyncio
import websockets
import json

async def test_websocket_connection():
    """Test connection to the eye tracker WebSocket server."""
    try:
        print("Connecting to WebSocket server...")
        async with websockets.connect("ws://localhost:8765") as websocket:
            print("Connected! Receiving coordinates...")
            
            # Receive and print coordinates for 10 seconds
            count = 0
            while count < 100:  # Receive ~100 messages
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"Cursor position: x={data['x']}, y={data['y']}")
                    count += 1
                except asyncio.TimeoutError:
                    print("No message received in 1 second")
                except json.JSONDecodeError as e:
                    print(f"Invalid JSON received: {e}")
                    
    except ConnectionRefusedError:
        print("Connection refused. Make sure the eye tracker is running.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket_connection())