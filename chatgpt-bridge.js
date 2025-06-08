#!/usr/bin/env node

import express from 'express';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { spawn } from 'child_process';
import { discoverTools } from "./lib/tools.js";

const app = express();
app.use(express.json());

// Enable CORS for ChatGPT Custom GPT usage
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Store tool definitions
let availableTools = [];

async function initializeTools() {
  availableTools = await discoverTools();
  console.log('Available tools:', availableTools.map(t => t.definition.function.name));
}

// Initialize tools on startup
initializeTools();

// OpenAPI schema endpoint for ChatGPT
app.get('/openapi.json', (req, res) => {
  // Get the host from the request to use the actual ngrok URL
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${process.env.PORT || 3002}`;
  const baseUrl = `${protocol}://${host}`;
  
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Google Books API via MCP",
      version: "1.0.0",
      description: "Search Google Books API through MCP server"
    },
    servers: [
      {
        url: baseUrl,
        description: "MCP Bridge Server"
      }
    ],
    paths: {
      "/search-books": {
        post: {
          summary: "Search for books using Google Books API",
          operationId: "searchBooks",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    q: {
                      type: "string",
                      description: "Search query for books (e.g., 'javascript', 'author:tolkien', 'subject:fiction')"
                    }
                  },
                  required: ["q"]
                }
              }
            }
          },
          responses: {
            200: {
              description: "Search results from Google Books API",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      kind: { type: "string" },
                      totalItems: { type: "integer" },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            volumeInfo: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                authors: { type: "array", items: { type: "string" } },
                                publishedDate: { type: "string" },
                                description: { type: "string" },
                                pageCount: { type: "integer" }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
  
  res.json(openApiSpec);
});

// Search books endpoint
app.post('/search-books', async (req, res) => {
  try {
    const { q } = req.body;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    // Find the search_volumes tool
    const tool = availableTools.find(t => t.definition.function.name === 'search_volumes');
    if (!tool) {
      return res.status(500).json({ error: 'Search tool not available' });
    }

    // Execute the tool
    const result = await tool.function({ q });
    
    res.json(result);
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Google Books MCP Bridge',
    description: 'MCP server for searching Google Books API',
    status: 'running',
    endpoints: {
      openapi: '/openapi.json',
      search: '/search-books',
      health: '/health'
    },
    usage: {
      chatgpt_schema: `${req.protocol}://${req.get('host')}/openapi.json`
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', tools: availableTools.length });
});

const port = process.env.PORT || 3002;
console.log(`Starting server on port ${port}...`);
app.listen(port, '0.0.0.0', () => {
  console.log(`📚 Google Books MCP Bridge running on port ${port}`);
  console.log(`🌐 Server listening on 0.0.0.0:${port}`);
  console.log(`📋 OpenAPI spec available at: /openapi.json`);
  console.log(`🔍 Search endpoint: POST /search-books`);
  console.log(`💡 For ChatGPT Custom GPT, use: https://books-mcp-server-jme4040.replit.app/openapi.json`);
}); 