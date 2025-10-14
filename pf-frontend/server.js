const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve language files
app.use('/languages', express.static(path.join(__dirname, 'languages')));

// Start the Express server first
const server = app.listen(PORT, () => {
    console.log(`ALS Communication UI server running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
});

// WebSocket server for communication with clients (use the same HTTP server)
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Handle WebSocket connections from the UI
wss.on('connection', (ws) => {
    console.log('UI client connected');
    clients.add(ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'text_updated') {
                // Generate suggestions when text is updated
                const suggestions = await generateSuggestions(data.text);
                
                // Broadcast suggestions to all clients
                const response = JSON.stringify({
                    type: 'suggestions',
                    suggestions: suggestions
                });
                
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(response);
                    }
                });
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('UI client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Connect to Python backend's WebSocket server
let backendConnection = null;

function connectToBackend() {
    try {
        backendConnection = new WebSocket('ws://vision:8765');
        
        backendConnection.on('open', () => {
            console.log('Connected to Python backend');
        });

        backendConnection.on('message', (message) => {
            // Forward cursor coordinates to UI clients
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    const data = JSON.parse(message);
                    client.send(JSON.stringify({
                        type: 'cursor_position',
                        x: data.x,
                        y: data.y,
                        timestamp: data.timestamp
                    }));
                }
            });
        });

        backendConnection.on('close', () => {
            console.log('Disconnected from Python backend, attempting to reconnect...');
            setTimeout(connectToBackend, 5000); // Retry after 5 seconds
        });

        backendConnection.on('error', (error) => {
            console.error('Backend connection error:', error.message);
            setTimeout(connectToBackend, 5000); // Retry after 5 seconds
        });
        
    } catch (error) {
        console.error('Failed to connect to backend:', error);
        setTimeout(connectToBackend, 5000); // Retry after 5 seconds
    }
}

async function generateSuggestions(currentText) {
    if (!genAI) {
        // Return default suggestions if no API key
        return getDefaultSuggestions();
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const currentTime = new Date();
        const timeOfDay = getTimeOfDay(currentTime);
        const location = process.env.LOCATION || "your location";
        
        const prompt = `
Context: You are helping someone with ALS communicate faster through text suggestions.
Current text: "${currentText}"
Time: ${currentTime.toLocaleString()}
Time of day: ${timeOfDay}
Location: ${location}

Please provide 6 helpful text suggestions in JSON format:
1. A relevant completion or continuation of their current text
2. A time-appropriate greeting (good morning/afternoon/evening)
3. A common phrase that might be useful in conversation
4. A simple yes/no or acknowledgment phrase
5. A brief weather-related comment for ${location}
6. A current news headline or topic (make it general and positive)

Format as JSON array with just the text strings, no explanations:
["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5", "suggestion6"]

Keep suggestions short (under 50 characters each) and conversational.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Try to parse JSON response
        try {
            const suggestions = JSON.parse(text);
            if (Array.isArray(suggestions)) {
                return suggestions;
            }
        } catch (parseError) {
            console.error('Failed to parse AI suggestions:', parseError);
        }
        
        // Fallback to default suggestions
        return getDefaultSuggestions();
        
    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        return getDefaultSuggestions();
    }
}

function getDefaultSuggestions() {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    
    let greeting = "Hello";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else greeting = "Good evening";
    
    return [
        "How are you?",
        greeting,
        "Thank you",
        "Yes, please",
        "It's a beautiful day",
        "Have a great day!"
    ];
}

function getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour < 6) return "early morning";
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
}

// Connect to Python backend after server starts
setTimeout(connectToBackend, 2000); // Give some time for services to start

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    wss.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    wss.close();
    process.exit(0);
});