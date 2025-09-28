#!/bin/bash
set -e

# This script is called by the GitHub Actions workflow to create deployment artifacts.
# It expects the version number as the first argument.

VERSION=$1
REGISTRY=$2
IMAGE_NAME_BACKEND=$3
IMAGE_NAME_FRONTEND=$4

if [ -z "$VERSION" ] || [ -z "$REGISTRY" ] || [ -z "$IMAGE_NAME_BACKEND" ] || [ -z "$IMAGE_NAME_FRONTEND" ]; then
  echo "Error: Missing required arguments. Usage: $0 <version> <registry> <backend_image> <frontend_image>"
  exit 1
fi

echo "📦 Creating deployment artifacts for version: $VERSION"

# Create a directory for the release artifacts
mkdir -p release-artifacts

# Copy essential files for deployment
cp docker-compose.yml release-artifacts/
cp .env.example release-artifacts/
cp README.md release-artifacts/
cp setup-ubuntu.sh release-artifacts/
cp run-ubuntu.sh release-artifacts/
cp run-kiosk.sh release-artifacts/
cp system-check.sh release-artifacts/

# Create a production docker-compose.yml that uses the published images
cat > release-artifacts/docker-compose.prod.yml <<EOF
version: '3.8'
services:
  pf-backend:
    image: ${REGISTRY}/${IMAGE_NAME_BACKEND}:${VERSION}
    container_name: pfone-backend
    environment:
      - HARDWARE_MODE=\${HARDWARE_MODE:-CPU}
      - DISPLAY=\${DISPLAY}
    devices:
      - /dev/video0:/dev/video0
    volumes:
      - /tmp/.X11-unix:/tmp/.X11-unix:rw
      - /dev/shm:/dev/shm
    network_mode: host
    restart: unless-stopped
    privileged: true
  pf-frontend:
    image: ${REGISTRY}/${IMAGE_NAME_FRONTEND}:${VERSION}
    container_name: pfone-frontend
    ports:
      - "8080:3000"
    environment:
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
      - LOCATION=\${LOCATION:-Unknown}
      - WEBSOCKET_URL=ws://localhost:8765
    depends_on:
      - pf-backend
    restart: unless-stopped
networks:
  default:
    driver: bridge
EOF

# Create installation script for production deployment
cat > release-artifacts/install-production.sh <<'EOF'
#!/bin/bash
set -e
echo "🚀 Installing Project F.O.N.E (Production)"
echo "=========================================="
# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created .env file. Please edit it with your API keys and settings:"
    echo "   nano .env"
    echo ""
fi
# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull
# Set up X11 permissions
echo "🔧 Setting up X11 permissions..."
xhost +local:docker
echo "✅ Installation complete!"
echo ""
echo "To start the system:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "To stop the system:"
echo "  docker-compose -f docker-compose.prod.yml down"
EOF

# Make the installation script executable
chmod +x release-artifacts/install-production.sh

# Create the final deployment archive
echo "📦 Creating deployment archive..."
tar -czf project-fone-${VERSION}-deployment.tar.gz -C release-artifacts .

echo "✅ Deployment artifacts created successfully."