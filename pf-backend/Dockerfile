# Use Python 3.10 slim image
FROM python:3.10-slim

# Install system dependencies for OpenCV and webcam access
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgtk-3-0 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgstreamer1.0-0 \
    python3-tk \
    python3-dev \
    libx11-dev \
    libxss1 \
    libgconf-2-4 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DISPLAY=:0

# Expose WebSocket port
EXPOSE 8765

# Run the eye tracker
CMD ["python", "eye_tracker.py"]