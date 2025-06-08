#!/usr/bin/env node

import express from 'express';
import { chatWithBookSearch } from './openai-integration-example.js';

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ChatGPT + Google Books Integration</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .chat-container { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .message { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .user { background-color: #e3f2fd; }
        .assistant { background-color: #f5f5f5; }
        .search-info { background-color: #fff3e0; padding: 10px; margin: 5px 0; border-radius: 3px; }
        input[type="text"] { width: 70%; padding: 10px; margin: 10px 5px; }
        button { padding: 10px 20px; background-color: #4caf50; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background-color: #45a049; }
        .loading { color: #666; font-style: italic; }
    </style>
</head>
<body>
    <h1>🤖 ChatGPT + Google Books MCP Integration</h1>
    <p>Ask about books and I'll search the Google Books API for you!</p>
    
    <div>
        <input type="text" id="userInput" placeholder="Ask about books... (e.g., 'Find books about Python programming')" />
        <button onclick="sendMessage()">Send</button>
    </div>
    
    <div id="chatHistory"></div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('userInput');
            const message = input.value.trim();
            if (!message) return;

            const chatHistory = document.getElementById('chatHistory');
            
            // Add user message
            chatHistory.innerHTML += \`
                <div class="message user">
                    <strong>You:</strong> \${message}
                </div>
            \`;
            
            // Show loading
            chatHistory.innerHTML += \`
                <div class="message loading" id="loading">
                    <strong>Assistant:</strong> <em>Thinking...</em>
                </div>
            \`;
            
            input.value = '';
            chatHistory.scrollTop = chatHistory.scrollHeight;

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });

                const result = await response.json();
                
                // Remove loading message
                document.getElementById('loading').remove();
                
                if (result.error) {
                    chatHistory.innerHTML += \`
                        <div class="message assistant">
                            <strong>Error:</strong> \${result.error}
                        </div>
                    \`;
                } else {
                    // Show search info if books were searched
                    if (result.searchQuery) {
                        chatHistory.innerHTML += \`
                            <div class="search-info">
                                🔍 <strong>Searched:</strong> "\${result.searchQuery}" 
                                | 📚 <strong>Found:</strong> \${result.bookResults.totalItems || 0} books
                            </div>
                        \`;
                    }
                    
                    // Show AI response
                    chatHistory.innerHTML += \`
                        <div class="message assistant">
                            <strong>Assistant:</strong> \${result.aiResponse}
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('loading').remove();
                chatHistory.innerHTML += \`
                    <div class="message assistant">
                        <strong>Error:</strong> Failed to get response
                    </div>
                \`;
            }
            
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        // Enter key support
        document.getElementById('userInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
  `);
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call our ChatGPT + Books integration
    const result = await chatWithBookSearch(message);
    
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.WEB_PORT || 3003;
app.listen(port, () => {
  console.log(`🌐 Web app running on http://localhost:${port}`);
  console.log(`📝 Make sure to set OPENAI_API_KEY environment variable`);
  console.log(`🔗 Bridge server should be running on ${process.env.BRIDGE_SERVER_URL || 'your ngrok URL'}`);
}); 