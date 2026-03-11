/**
 * ALS Communication System - Frontend JavaScript
 * Handles UI interactions, WebSocket communication, and dwell-to-click functionality
 */

class ALSCommunicationApp {
    constructor() {
        this.currentLanguage = 'en';
        this.languages = {};
        this.websocket = null;
        this.dwellTimeout = null;
        this.dwellDuration = 2000; // 2 seconds
        this.currentHoverElement = null;
        this.cursorPosition = { x: 0, y: 0 };
        
        // DOM elements
        this.elements = {
            textArea: document.getElementById('text-area'),
            suggestionsContainer: document.getElementById('suggestions-container'),
            virtualKeyboard: document.getElementById('virtual-keyboard'),
            cursorIndicator: document.getElementById('cursor-indicator'),
            dwellProgress: document.getElementById('dwell-progress'),
            loadingOverlay: document.getElementById('loading-overlay'),
            languageToggle: document.getElementById('language-toggle'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            speakButton: document.getElementById('speak-button'),
            clearAllButton: document.getElementById('clear-all-button')
        };

        this.init();
    }

    async init() {
        try {
            // Load languages
            await this.loadLanguages();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load default language
            await this.switchLanguage(this.currentLanguage);
            
            // Connect to WebSocket
            this.connectWebSocket();
            
            console.log('ALS Communication App initialized');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application');
        }
    }

    async loadLanguages() {
        try {
            const languages = ['en', 'el'];
            
            for (const lang of languages) {
                const response = await fetch(`/languages/${lang}.json`);
                if (response.ok) {
                    this.languages[lang] = await response.json();
                } else {
                    console.warn(`Failed to load language: ${lang}`);
                }
            }
            
            console.log('Languages loaded:', Object.keys(this.languages));
        } catch (error) {
            console.error('Error loading languages:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Language toggle
        this.elements.languageToggle.addEventListener('click', () => {
            this.toggleLanguage();
        });

        // Clear all button
        this.elements.clearAllButton.addEventListener('click', () => {
            this.clearText();
        });

        // Speak button (if speech synthesis is available)
        if ('speechSynthesis' in window) {
            this.elements.speakButton.addEventListener('click', () => {
                this.speakText();
            });
        } else {
            this.elements.speakButton.style.display = 'none';
        }

        // Mouse movement for testing (remove in production)
        document.addEventListener('mousemove', (e) => {
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                this.updateCursorPosition(e.clientX, e.clientY);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'l':
                        e.preventDefault();
                        this.toggleLanguage();
                        break;
                    case 'Backspace':
                        e.preventDefault();
                        this.deleteLastCharacter();
                        break;
                }
            }
        });
    }

    async switchLanguage(languageCode) {
        if (!this.languages[languageCode]) {
            console.error(`Language ${languageCode} not found`);
            return;
        }

        this.currentLanguage = languageCode;
        const language = this.languages[languageCode];

        // Update UI text
        document.getElementById('app-title').textContent = language.ui.title;
        this.elements.textArea.placeholder = language.ui.textPlaceholder;
        document.getElementById('suggestions-title').textContent = language.ui.suggestionsTitle;
        this.elements.languageToggle.textContent = languageCode.toUpperCase();

        // Generate keyboard
        this.generateKeyboard(language.keyboard);

        console.log(`Switched to language: ${language.name}`);
    }

    toggleLanguage() {
        const currentIndex = Object.keys(this.languages).indexOf(this.currentLanguage);
        const nextIndex = (currentIndex + 1) % Object.keys(this.languages).length;
        const nextLanguage = Object.keys(this.languages)[nextIndex];
        this.switchLanguage(nextLanguage);
    }

    generateKeyboard(keyboardLayout) {
        this.elements.virtualKeyboard.innerHTML = '';

        keyboardLayout.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'keyboard-row';

            row.forEach(key => {
                const button = document.createElement('button');
                button.className = 'key-button';

                if (typeof key === 'string') {
                    // Simple character key
                    button.textContent = key;
                    button.dataset.value = key;
                    button.dataset.action = 'char';
                } else {
                    // Special key with properties
                    button.textContent = key.display;
                    button.dataset.value = key.value;
                    button.dataset.action = key.action;
                    
                    if (key.width) {
                        button.classList.add(key.width);
                    }
                    
                    if (key.special) {
                        button.classList.add('special');
                    }
                }

                // Add event listeners for dwell-to-click
                button.addEventListener('mouseenter', () => {
                    this.startDwellTimer(button);
                });

                button.addEventListener('mouseleave', () => {
                    this.cancelDwellTimer();
                });

                rowElement.appendChild(button);
            });

            this.elements.virtualKeyboard.appendChild(rowElement);
        });
    }

    connectWebSocket() {
        try {
            // Connect to the Node.js server's WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.hostname}:8080`;
            
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                console.log('Connected to server WebSocket');
                this.updateConnectionStatus(true);
                this.hideLoading();
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.websocket.onclose = () => {
                console.log('WebSocket connection closed, attempting to reconnect...');
                this.updateConnectionStatus(false);
                this.showLoading('Reconnecting...');
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.showError('Failed to connect to server');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'cursor_position':
                this.updateCursorPosition(data.x, data.y);
                break;
            
            case 'suggestions':
                this.updateSuggestions(data.suggestions);
                break;
            
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    updateCursorPosition(x, y) {
        this.cursorPosition = { x, y };
        
        // Update visual cursor indicator
        this.elements.cursorIndicator.style.left = `${x}px`;
        this.elements.cursorIndicator.style.top = `${y}px`;
        this.elements.cursorIndicator.classList.add('visible');

        // Check for hover on interactive elements
        const element = document.elementFromPoint(x, y);
        this.handleHover(element);
    }

    handleHover(element) {
        // Check if hovering over a clickable element
        const clickableElement = element?.closest('.key-button, .suggestion-button');
        
        if (clickableElement !== this.currentHoverElement) {
            this.cancelDwellTimer();
            
            if (clickableElement) {
                this.startDwellTimer(clickableElement);
            }
        }
    }

    startDwellTimer(element) {
        this.cancelDwellTimer();
        
        this.currentHoverElement = element;
        
        // Position dwell progress indicator
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        this.elements.dwellProgress.style.left = `${centerX}px`;
        this.elements.dwellProgress.style.top = `${centerY}px`;
        this.elements.dwellProgress.classList.remove('hidden');
        
        // Start progress animation
        const progressCircle = this.elements.dwellProgress.querySelector('.dwell-ring-progress');
        progressCircle.style.strokeDashoffset = '157';
        
        // Animate progress
        let startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.dwellDuration, 1);
            const offset = 157 - (progress * 157);
            
            progressCircle.style.strokeDashoffset = offset;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
        
        // Set timer for activation
        this.dwellTimeout = setTimeout(() => {
            this.activateElement(element);
        }, this.dwellDuration);
    }

    cancelDwellTimer() {
        if (this.dwellTimeout) {
            clearTimeout(this.dwellTimeout);
            this.dwellTimeout = null;
        }
        
        this.elements.dwellProgress.classList.add('hidden');
        this.currentHoverElement = null;
    }

    activateElement(element) {
        this.cancelDwellTimer();
        
        if (element.classList.contains('key-button')) {
            this.handleKeyPress(element);
        } else if (element.classList.contains('suggestion-button')) {
            this.handleSuggestionClick(element);
        }
        
        // Visual feedback
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    handleKeyPress(keyElement) {
        const action = keyElement.dataset.action;
        const value = keyElement.dataset.value;

        switch (action) {
            case 'char':
            case 'space':
            case 'enter':
                this.addText(value);
                break;
            
            case 'backspace':
                this.deleteLastCharacter();
                break;
            
            case 'clear':
                this.clearText();
                break;
            
            case 'language':
                this.toggleLanguage();
                break;
            
            case 'numbers':
                // TODO: Implement number keyboard
                console.log('Numbers keyboard not implemented yet');
                break;
            
            default:
                console.warn('Unknown key action:', action);
        }
    }

    handleSuggestionClick(suggestionElement) {
        const text = suggestionElement.textContent;
        this.addText(text);
    }

    addText(text) {
        this.elements.textArea.value += text;
        this.elements.textArea.scrollTop = this.elements.textArea.scrollHeight;
        
        // Notify server of text change for AI suggestions
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'text_updated',
                text: this.elements.textArea.value
            }));
        }
    }

    deleteLastCharacter() {
        const currentText = this.elements.textArea.value;
        if (currentText.length > 0) {
            this.elements.textArea.value = currentText.slice(0, -1);
            
            // Notify server of text change
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'text_updated',
                    text: this.elements.textArea.value
                }));
            }
        }
    }

    clearText() {
        this.elements.textArea.value = '';
        
        // Notify server of text change
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'text_updated',
                text: ''
            }));
        }
    }

    speakText() {
        if ('speechSynthesis' in window && this.elements.textArea.value) {
            const utterance = new SpeechSynthesisUtterance(this.elements.textArea.value);
            utterance.lang = this.currentLanguage === 'el' ? 'el-GR' : 'en-US';
            speechSynthesis.speak(utterance);
        }
    }

    updateSuggestions(suggestions) {
        this.elements.suggestionsContainer.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            return;
        }

        suggestions.forEach(suggestion => {
            const button = document.createElement('button');
            button.className = 'suggestion-button';
            button.textContent = suggestion;
            
            // Add hover event listeners
            button.addEventListener('mouseenter', () => {
                this.startDwellTimer(button);
            });

            button.addEventListener('mouseleave', () => {
                this.cancelDwellTimer();
            });

            this.elements.suggestionsContainer.appendChild(button);
        });
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.statusIndicator.classList.add('connected');
            this.elements.statusText.textContent = 'Connected';
        } else {
            this.elements.statusIndicator.classList.remove('connected');
            this.elements.statusText.textContent = 'Disconnected';
        }
    }

    showLoading(message = 'Loading...') {
        document.getElementById('loading-text').textContent = message;
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        console.error(message);
        // TODO: Implement proper error display
        alert(message);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.alsApp = new ALSCommunicationApp();
});