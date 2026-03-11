#!/bin/bash

# zekALS - Ubuntu Setup Script
# This script sets up the complete assistive communication system on Ubuntu

set -e  # Exit on any error

echo "🚀 zekALS - Ubuntu Setup Script"
echo "======================================="
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as your regular user."
    exit 1
fi

print_status "Starting Ubuntu setup for zekALS..."

# Update package list
print_status "Updating package list..."
sudo apt update

# Install system dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    docker.io \
    docker-compose \
    chromium-browser \
    v4l-utils \
    x11-apps \
    xvfb \
    git \
    curl \
    wget

# Add user to docker group
print_status "Adding user to docker group..."
sudo usermod -aG docker $USER

# Install Docker Compose (latest version)
print_status "Installing latest Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start and enable Docker service
print_status "Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Create Python virtual environment
print_status "Creating Python virtual environment..."
cd "$(dirname "$0")"
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r za-backend/requirements.txt

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd za-frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file template..."
    cp .env.example .env
    print_warning "Please edit the .env file with your API keys and settings:"
    print_warning "  - Add your GEMINI_API_KEY"
    print_warning "  - Set your LOCATION"
    print_warning "  - Configure HARDWARE_MODE (CPU/GPU)"
    echo ""
fi

# Check webcam access
print_status "Checking webcam access..."
if [ -e /dev/video0 ]; then
    print_success "Webcam found at /dev/video0"
else
    print_warning "No webcam found at /dev/video0. Please ensure your webcam is connected."
fi

# Test Docker installation
print_status "Testing Docker installation..."
if docker --version > /dev/null 2>&1; then
    print_success "Docker is installed: $(docker --version)"
else
    print_error "Docker installation failed"
    exit 1
fi

# Test Docker Compose installation
if docker-compose --version > /dev/null 2>&1; then
    print_success "Docker Compose is installed: $(docker-compose --version)"
else
    print_error "Docker Compose installation failed"
    exit 1
fi

# Set permissions for X11 (needed for GUI access from Docker)
print_status "Setting up X11 permissions for Docker..."
xhost +local:docker

print_success "Setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Edit the .env file with your API keys and settings"
echo "2. Log out and log back in (or run 'newgrp docker') to apply docker group membership"
echo "3. Run './run-ubuntu.sh' to start the system"
echo "4. Run './run-kiosk.sh' to start the browser in kiosk mode"
echo ""
print_warning "Note: You may need to restart your system for all changes to take effect."