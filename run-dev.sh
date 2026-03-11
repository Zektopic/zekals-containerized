#!/bin/bash

# zekALS - Development Mode Script
# This script runs the system in development mode without Docker for easier debugging

set -e

echo "🔧 zekALS - Development Mode"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    print_warning "GEMINI_API_KEY is not set in .env file. AI suggestions will not work."
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r za-backend/requirements.txt

print_status "Installing Node.js dependencies..."
cd za-frontend
npm install
cd ..

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up processes..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
print_status "Starting Python backend..."
cd za-backend
python eye_tracker.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start"
    exit 1
fi

print_success "Backend started with PID: $BACKEND_PID"

# Start frontend
print_status "Starting Node.js frontend..."
cd za-frontend
node server.js &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "Frontend started with PID: $FRONTEND_PID"

print_success "Development mode started successfully!"
echo ""
print_status "Services are running:"
echo "  • Backend (Eye Tracker): WebSocket on port 8765 (PID: $BACKEND_PID)"
echo "  • Frontend (UI): Web server on http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
print_status "Access the application at: http://localhost:3000"
echo ""
print_warning "Press Ctrl+C to stop all services"

# Wait for processes
wait