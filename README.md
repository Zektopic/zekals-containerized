# zekALS - Assistive Communication System

A modern, open-source assistive communication system for individuals with ALS, inspired by Stephen Hawking's ACAT system. This system leverages eye-tracking technology to enable users to type messages and receive intelligent, context-aware sentence completions.

## 🎯 Features

- **Eye-Tracking Control**: Uses MediaPipe for real-time eye detection and cursor control
- **Virtual Keyboard**: Large, high-contrast virtual keyboard with dwell-to-click selection
- **AI-Powered Suggestions**: Context-aware sentence completions using Google's Gemini API
- **Multi-Language Support**: Supports English and Greek keyboards with easy expansion
- **Real-Time Information**: Integrates current weather and news headlines
- **Containerized Deployment**: Complete Docker-based deployment for easy setup
- **Kiosk Mode**: Full-screen browser mode for distraction-free use

## 🚀 Quick Start

### Windows Setup

1.  **Clone the repository**:
    ```powershell
    git clone <repository-url>
    cd zekALS-containers
    ```

2.  **Run the setup script**:
    Open PowerShell as Administrator and run:
    ```powershell
    .\setup-windows.ps1
    ```
    This will help you install required tools like Chocolatey, Python, Node.js, and Docker Desktop.

3.  **Configure your API keys**:
    ```powershell
    notepad .env
    # Add your GEMINI_API_KEY and other settings
    ```

4.  **Start the system in development mode**:
    ```batch
    .\run-dev.bat
    ```

### Ubuntu/Linux Setup (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd zekALS-containers
   ```

2. **Run the setup script**:
   ```bash
   ./setup-ubuntu.sh
   ```
   This will install all dependencies, set up Docker, and create the environment file.

3. **Configure your API keys**:
   ```bash
   nano .env
   # Add your GEMINI_API_KEY and other settings
   ```

4. **Start the system**:
   ```bash
   ./run-ubuntu.sh
   ```

5. **Open in kiosk mode** (recommended for actual use):
   ```bash
   ./run-kiosk.sh
   ```

### Manual Docker Setup

If you prefer manual setup:

1. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

2. **Build and run**:
   ```bash
   docker-compose build
   docker-compose up
   ```

3. **Access the application**:
   - Open your browser to `http://localhost:8080`

## 📋 Available Scripts

| Script | OS | Purpose |
|---|---|---|
| `setup-windows.ps1` | Windows | Guides through dependency installation. |
| `run-dev.bat` | Windows | Runs the application in development mode. |
| `system-check.ps1`| Windows | Checks system requirements. |
| `./setup-ubuntu.sh` | Linux | Complete system setup and dependency installation |
| `./run-ubuntu.sh` | Linux | Start the complete system using Docker |
| `./run-kiosk.sh` | Linux | Launch browser in full-screen kiosk mode |
| `./run-dev.sh` | Linux | Run in development mode (without Docker) |
| `./system-check.sh` | Linux | Check system requirements and diagnose issues |

## 🔧 System Requirements

### Minimum Requirements
- Ubuntu 20.04+ (or compatible Linux distribution)
- 4GB RAM
- USB webcam or built-in camera
- Internet connection (for AI features)

### Recommended Requirements
- Ubuntu 22.04+
- 8GB RAM
- High-quality webcam (1080p)
- GPU with CUDA support (for faster processing)

## 🏗️ Architecture

The system consists of two main services:

### Vision Backend (Python)
- Eye tracking using MediaPipe
- Mouse cursor control via pyautogui
- WebSocket server for coordinate broadcasting
- Supports both CPU and GPU processing

### UI Frontend (Node.js)
- Express web server
- Virtual keyboard interface
- WebSocket client for cursor data
- Gemini AI integration for suggestions
- Multi-language support

## 🌐 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here
LOCATION=Athens, Greece

# Hardware Configuration
HARDWARE_MODE=CPU  # or GPU for CUDA acceleration

# Port Configuration
WEBSOCKET_PORT=8765
FRONTEND_PORT=8080

# Application Settings
LANGUAGE=en  # en for English, el for Greek
DWELL_TIME=2000  # milliseconds
```

### Language Support

The system supports multiple languages through JSON configuration files:

- `languages/en.json` - English keyboard layout
- `languages/el.json` - Greek keyboard layout

To add a new language:
1. Create a new JSON file in the `za-frontend/languages/` directory
2. Define the keyboard layout and UI strings
3. Update the language selector in the frontend

## 🔍 Troubleshooting

### Common Issues

1. **Webcam not detected**:
   ```bash
   ls -la /dev/video*
   # Should show webcam devices
   ```

2. **Docker permission denied**:
   ```bash
   sudo usermod -aG docker $USER
   # Then log out and back in
   ```

3. **Eye tracking not working**:
   - Ensure good lighting conditions
   - Position webcam at eye level
   - Check that no other applications are using the webcam

4. **Mouse control not working**:
   - Verify X11 permissions: `xhost +local:docker`
   - Check display variable: `echo $DISPLAY`

### System Diagnostics

Run the system check script for comprehensive diagnostics:
```bash
./system-check.sh
```

## 📖 Usage Guide

### Initial Setup
1. Position yourself comfortably in front of the webcam
2. Ensure good lighting on your face
3. Launch the application in kiosk mode
4. The system will automatically track your eye movements

### Typing
1. Look at the desired key on the virtual keyboard
2. Keep your gaze steady on the key for 2 seconds
3. A ring timer will fill up around the key
4. When complete, the character will be added to the text area

### AI Suggestions
- Suggestions appear above the keyboard as you type
- Look at a suggestion and dwell to select it
- Suggestions include:
  - Common phrases and completions
  - Time-appropriate greetings
  - Current weather information
  - Recent news headlines

### Language Switching
- Use the language toggle button to switch between English and Greek
- The keyboard layout will update immediately

## 🧪 Development

### Development Mode

For development and debugging, use the development script:
```bash
./run-dev.sh
```

This runs the services directly without Docker, making it easier to see logs and make changes.

### File Structure

```
zekALS-containers/
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment template
├── setup-ubuntu.sh           # Ubuntu setup script
├── run-ubuntu.sh              # Production launcher
├── run-kiosk.sh              # Kiosk mode launcher
├── run-dev.sh                # Development mode
├── system-check.sh           # System diagnostics
├── za-backend/               # Python backend
│   ├── Dockerfile
│   ├── eye_tracker.py        # Main eye tracking service
│   ├── requirements.txt      # Python dependencies
│   └── test_websocket.py     # WebSocket test client
└── za-frontend/              # Node.js frontend
    ├── Dockerfile
    ├── server.js             # Express web server
    ├── package.json          # Node.js dependencies
    ├── public/               # Static web files
    │   ├── index.html        # Main UI
    │   ├── style.css         # Styling
    │   └── script.js         # Frontend logic
    └── languages/            # Keyboard layouts
        ├── en.json           # English
        └── el.json           # Greek
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open-source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by Stephen Hawking's ACAT system
- Built with MediaPipe by Google
- Uses Google's Gemini AI for intelligent suggestions
- Greek language support for accessibility

## 🆘 Support

If you encounter issues:

1. Run `./system-check.sh` for diagnostics
2. Check the troubleshooting section above
3. Review the logs: `docker-compose logs -f`
4. Open an issue on GitHub with detailed information

---

**zekALS** - Empowering communication through technology