#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { GcpTools } from './tools/gcp-tools.js';
import { AzureTools } from './tools/azure-tools.js';
import { SecurityValidator } from './utils/security.js';

class CloudAbstractionMcpServer {
  private server: Server;
  private gcpTools: GcpTools;
  private azureTools: AzureTools;
  private securityValidator: SecurityValidator;

  constructor() {
    this.server = new Server(
      {
        name: 'cloud-abstraction-layer-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.securityValidator = new SecurityValidator();
    this.gcpTools = new GcpTools(this.securityValidator);
    this.azureTools = new AzureTools(this.securityValidator);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const gcpToolList = await this.gcpTools.listTools();
      const azureToolList = await this.azureTools.listTools();
      return {
        tools: [...gcpToolList, ...azureToolList],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      // Route to appropriate tool handler
      if (name.startsWith('gcp_')) {
        return await this.gcpTools.handleTool(name, args || {});
      } else if (name.startsWith('azure_')) {
        return await this.azureTools.handleTool(name, args || {});
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cloud Abstraction Layer MCP Server running on stdio');
  }
}

const server = new CloudAbstractionMcpServer();
server.run().catch(console.error);

