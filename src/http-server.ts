#!/usr/bin/env node

import express from 'express';
import { GcpTools } from './tools/gcp-tools.js';
import { AzureTools } from './tools/azure-tools.js';
import { SecurityValidator } from './utils/security.js';

const app = express();
app.use(express.json());

const securityValidator = new SecurityValidator();
const gcpTools = new GcpTools(securityValidator);
const azureTools = new AzureTools(securityValidator);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cloud-abstraction-layer-mcp-server' });
});

// List all available tools
app.get('/tools', async (req, res) => {
  try {
    const gcpToolList = await gcpTools.listTools();
    const azureToolList = await azureTools.listTools();
    res.json({
      tools: [...gcpToolList, ...azureToolList],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Execute a tool
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body.arguments || req.body || {};

    let result;
    if (toolName.startsWith('gcp_')) {
      result = await gcpTools.handleTool(toolName, args);
    } else if (toolName.startsWith('azure_')) {
      result = await azureTools.handleTool(toolName, args);
    } else {
      return res.status(400).json({ error: `Unknown tool: ${toolName}` });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// MCP-compatible endpoint
app.post('/mcp/call', async (req, res) => {
  try {
    const { name, arguments: args } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    let result;
    if (name.startsWith('gcp_')) {
      result = await gcpTools.handleTool(name, args || {});
    } else if (name.startsWith('azure_')) {
      result = await azureTools.handleTool(name, args || {});
    } else {
      return res.status(400).json({ error: `Unknown tool: ${name}` });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Cloud Abstraction Layer MCP Server running on port ${PORT}`);
});

