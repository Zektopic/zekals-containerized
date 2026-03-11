#!/bin/bash

# zekALS - Kiosk Mode Script
# This script launches Chromium in full-screen kiosk mode for the assistive communication system

echo "🖥️ zekALS - Kiosk Mode"
echo "==============================="
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

# Check if the frontend service is running
if ! curl -s http://localhost:8080 > /dev/null; then
    print_error "Frontend service is not running on http://localhost:8080"
    print_status "Please run './run-ubuntu.sh' first to start the system"
    exit 1
fi

print_success "Frontend service is accessible"

# Kill any existing Chromium processes (optional safety measure)
print_status "Closing any existing browser windows..."
pkill -f chromium-browser 2>/dev/null || true
pkill -f google-chrome 2>/dev/null || true

# Wait a moment
sleep 2

# Launch browser in kiosk mode
print_status "Launching browser in kiosk mode..."
print_warning "Press Alt+F4 or Ctrl+Alt+T to exit kiosk mode"
echo ""

# Try different browsers in order of preference
if command -v chromium-browser &> /dev/null; then
    print_status "Using Chromium browser..."
    chromium-browser \
        --kiosk \
        --no-first-run \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-translate \
        --disable-features=TranslateUI \
        --disable-ipc-flooding-protection \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-field-trial-config \
        --autoplay-policy=no-user-gesture-required \
        --allow-running-insecure-content \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --force-device-scale-factor=1 \
        --start-fullscreen \
        http://localhost:8080
elif command -v google-chrome &> /dev/null; then
    print_status "Using Google Chrome..."
    google-chrome \
        --kiosk \
        --no-first-run \
        --disable-infobars \
        --disable-session-crashed-bubble \
        --disable-translate \
        --disable-features=TranslateUI \
        --disable-ipc-flooding-protection \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-field-trial-config \
        --autoplay-policy=no-user-gesture-required \
        --allow-running-insecure-content \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --force-device-scale-factor=1 \
        --start-fullscreen \
        http://localhost:8080
elif command -v firefox &> /dev/null; then
    print_status "Using Firefox (limited kiosk support)..."
    firefox --kiosk http://localhost:8080
else
    print_error "No supported browser found!"
    print_status "Please install one of the following browsers:"
    echo "  • chromium-browser (recommended)"
    echo "  • google-chrome"
    echo "  • firefox"
    echo ""
    print_status "You can install Chromium with:"
    echo "  sudo apt install chromium-browser"
    exit 1
fi

print_status "Kiosk mode exited."