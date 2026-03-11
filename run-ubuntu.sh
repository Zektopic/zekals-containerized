#!/bin/bash

# zekALS - Ubuntu Runtime Script
# This script runs the complete assistive communication system on Ubuntu

set -e  # Exit on any error

echo "🎯 zekALS - Starting System"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to script directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please run ./setup-ubuntu.sh first or create .env from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check if required environment variables are set
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-gemini-api-key-here" ]; then
    print_error "GEMINI_API_KEY is not set in .env file. Please add your Gemini API key."
    exit 1
fi

# Check Docker access
if ! docker info > /dev/null 2>&1; then
    print_error "Cannot access Docker. Please ensure:"
    echo "  1. Docker is running"
    echo "  2. Your user is in the docker group"
    echo "  3. You have logged out and back in after running setup"
    echo ""
    echo "Try running: newgrp docker"
    exit 1
fi

# Check webcam access
if [ ! -e /dev/video0 ]; then
    print_warning "No webcam found at /dev/video0. Eye tracking may not work."
fi

# Set up X11 permissions for GUI access from Docker
print_status "Setting up X11 permissions..."
xhost +local:docker

# Check if containers are already running
if docker-compose ps | grep -q "Up"; then
    print_warning "Some containers are already running. Stopping them first..."
    docker-compose down
fi

print_status "Building Docker containers (this may take a few minutes on first run)..."
docker-compose build

print_status "Starting the zekALS system..."
docker-compose up -d

# Wait for services to start
print_status "Waiting for services to start..."
sleep 5

# Check if services are running
print_status "Checking service status..."
if docker-compose ps | grep -q "za-backend.*Up"; then
    print_success "Backend service is running"
else
    print_error "Backend service failed to start"
    docker-compose logs za-backend
    exit 1
fi

if docker-compose ps | grep -q "za-frontend.*Up"; then
    print_success "Frontend service is running"
else
    print_error "Frontend service failed to start"
    docker-compose logs za-frontend
    exit 1
fi

print_success "System started successfully!"
echo ""
print_status "Services are running:"
echo "  • Backend (Eye Tracker): WebSocket on port 8765"
echo "  • Frontend (UI): Web server on http://localhost:8080"
echo ""
print_status "Access the application:"
echo "  • Open your browser to: http://localhost:8080"
echo "  • Or run './run-kiosk.sh' for full-screen kiosk mode"
echo ""
print_status "Useful commands:"
echo "  • View logs: docker-compose logs -f"
echo "  • Stop system: docker-compose down"
echo "  • Restart system: docker-compose restart"
echo ""
print_warning "Make sure your webcam is connected and working!"

# Optional: Open browser automatically
read -p "Would you like to open the browser automatically? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Opening browser..."
    if command -v chromium-browser &> /dev/null; then
        chromium-browser http://localhost:8080 &
    elif command -v google-chrome &> /dev/null; then
        google-chrome http://localhost:8080 &
    elif command -v firefox &> /dev/null; then
        firefox http://localhost:8080 &
    else
        print_warning "No supported browser found. Please open http://localhost:8080 manually."
    fi
fi