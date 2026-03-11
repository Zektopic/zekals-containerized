#!/bin/bash

# zekALS - System Check and Troubleshooting Script
# This script checks system requirements and helps diagnose issues

echo "🔍 zekALS - System Check"
echo "================================="
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
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_check() {
    echo -n -e "${BLUE}[CHECK]${NC} $1 ... "
}

# Change to script directory
cd "$(dirname "$0")"

echo "System Requirements Check:"
echo "=========================="

# Check Python
print_check "Python 3 installation"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    print_success "Found Python $PYTHON_VERSION"
else
    print_error "Python 3 not found"
fi

# Check Node.js
print_check "Node.js installation"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Found Node.js $NODE_VERSION"
else
    print_error "Node.js not found"
fi

# Check npm
print_check "npm installation"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "Found npm $NPM_VERSION"
else
    print_error "npm not found"
fi

# Check Docker
print_check "Docker installation"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>&1 | awk '{print $3}' | sed 's/,//')
    print_success "Found Docker $DOCKER_VERSION"
    
    # Check Docker permissions
    print_check "Docker permissions"
    if docker info &> /dev/null; then
        print_success "Docker accessible without sudo"
    else
        print_error "Docker requires sudo - user not in docker group"
    fi
else
    print_error "Docker not found"
fi

# Check Docker Compose
print_check "Docker Compose installation"
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version 2>&1 | awk '{print $3}' | sed 's/,//')
    print_success "Found Docker Compose $COMPOSE_VERSION"
else
    print_error "Docker Compose not found"
fi

# Check webcam
print_check "Webcam availability"
if [ -e /dev/video0 ]; then
    print_success "Webcam found at /dev/video0"
    
    # Check webcam permissions
    if [ -r /dev/video0 ] && [ -w /dev/video0 ]; then
        print_success "Webcam is accessible"
    else
        print_warning "Webcam permissions may be restricted"
    fi
else
    print_error "No webcam found at /dev/video0"
fi

# Check display
print_check "X11 display"
if [ -n "$DISPLAY" ]; then
    print_success "Display available: $DISPLAY"
else
    print_warning "No display found - GUI applications may not work"
fi

echo ""
echo "Project Files Check:"
echo "===================="

# Check project structure
print_check "Project structure"
MISSING_FILES=()

if [ ! -f "docker-compose.yml" ]; then
    MISSING_FILES+=("docker-compose.yml")
fi

if [ ! -f "za-backend/Dockerfile" ]; then
    MISSING_FILES+=("za-backend/Dockerfile")
fi

if [ ! -f "za-backend/eye_tracker.py" ]; then
    MISSING_FILES+=("za-backend/eye_tracker.py")
fi

if [ ! -f "za-backend/requirements.txt" ]; then
    MISSING_FILES+=("za-backend/requirements.txt")
fi

if [ ! -f "za-frontend/Dockerfile" ]; then
    MISSING_FILES+=("za-frontend/Dockerfile")
fi

if [ ! -f "za-frontend/server.js" ]; then
    MISSING_FILES+=("za-frontend/server.js")
fi

if [ ! -f "za-frontend/package.json" ]; then
    MISSING_FILES+=("za-frontend/package.json")
fi

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    print_success "All required files present"
else
    print_error "Missing files: ${MISSING_FILES[*]}"
fi

# Check .env file
print_check ".env configuration"
if [ -f ".env" ]; then
    source .env
    print_success ".env file exists"
    
    if [ -n "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your-gemini-api-key-here" ]; then
        print_success "Gemini API key is configured"
    else
        print_warning "Gemini API key not configured - AI suggestions won't work"
    fi
    
    if [ -n "$LOCATION" ]; then
        print_success "Location is set to: $LOCATION"
    else
        print_warning "Location not configured - weather suggestions may not work"
    fi
    
    if [ -n "$HARDWARE_MODE" ]; then
        print_success "Hardware mode set to: $HARDWARE_MODE"
    else
        print_warning "Hardware mode not set - defaulting to CPU"
    fi
else
    print_error ".env file not found"
fi

echo ""
echo "Service Status Check:"
echo "===================="

# Check if services are running
print_check "Backend service (Docker)"
if docker-compose ps 2>/dev/null | grep -q "za-backend.*Up"; then
    print_success "Backend service is running"
else
    print_warning "Backend service is not running"
fi

print_check "Frontend service (Docker)"
if docker-compose ps 2>/dev/null | grep -q "za-frontend.*Up"; then
    print_success "Frontend service is running"
else
    print_warning "Frontend service is not running"
fi

print_check "Frontend web server accessibility"
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    print_success "Frontend is accessible at http://localhost:8080"
elif curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is accessible at http://localhost:3000 (dev mode)"
else
    print_warning "Frontend is not accessible"
fi

print_check "Backend WebSocket connectivity"
if command -v nc &> /dev/null; then
    if nc -z localhost 8765 2>/dev/null; then
        print_success "Backend WebSocket is listening on port 8765"
    else
        print_warning "Backend WebSocket is not accessible on port 8765"
    fi
else
    print_warning "netcat not available - cannot test WebSocket"
fi

echo ""
echo "Troubleshooting Suggestions:"
echo "==========================="

# Provide specific troubleshooting advice
if ! command -v docker &> /dev/null; then
    echo "• Install Docker: sudo apt install docker.io"
fi

if ! docker info &> /dev/null 2>&1; then
    echo "• Add user to docker group: sudo usermod -aG docker \$USER"
    echo "• Then log out and back in, or run: newgrp docker"
fi

if [ ! -e /dev/video0 ]; then
    echo "• Connect a webcam or check if it's being used by another application"
    echo "• List video devices: ls -la /dev/video*"
fi

if [ ! -f ".env" ]; then
    echo "• Copy .env.example to .env: cp .env.example .env"
    echo "• Edit .env with your API keys and settings"
fi

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "• Run the setup script again: ./setup-ubuntu.sh"
    echo "• Check if all project files were created correctly"
fi

echo ""
echo "Useful Commands:"
echo "================"
echo "• Full setup: ./setup-ubuntu.sh"
echo "• Start system: ./run-ubuntu.sh"
echo "• Start in kiosk mode: ./run-kiosk.sh"
echo "• Development mode: ./run-dev.sh"
echo "• View logs: docker-compose logs -f"
echo "• Stop system: docker-compose down"
echo "• Test webcam: ffplay /dev/video0"