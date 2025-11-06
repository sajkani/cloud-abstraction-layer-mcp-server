import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecurityValidator } from '../utils/security.js';
import { CommandExecutor, CommandResult } from '../utils/command-executor.js';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  AnonymousCredential,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export class AzureTools {
  private commandExecutor: CommandExecutor;

  constructor(private securityValidator: SecurityValidator) {
    this.commandExecutor = new CommandExecutor(securityValidator);
  }

  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'azure_run_az_command',
        description:
          'Execute an Azure CLI command safely with security restrictions. Supports subscription-specific commands.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The az command to execute (without the "az" prefix)',
            },
            subscriptionId: {
              type: 'string',
              description: 'Optional Azure subscription ID to use for the command',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'azure_list_storage_accounts',
        description: 'List all storage accounts in a subscription',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'Optional Azure subscription ID. Uses default if not provided.',
            },
            resourceGroup: {
              type: 'string',
              description: 'Optional resource group name to filter by',
            },
          },
        },
      },
      {
        name: 'azure_list_containers',
        description: 'List containers in an Azure Storage account',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: {
              type: 'string',
              description: 'Name of the Azure Storage account',
            },
            accountKey: {
              type: 'string',
              description: 'Optional storage account key. Uses DefaultAzureCredential if not provided.',
            },
          },
          required: ['accountName'],
        },
      },
      {
        name: 'azure_list_blobs',
        description: 'List blobs in an Azure Storage container with optional prefix filtering',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: {
              type: 'string',
              description: 'Name of the Azure Storage account',
            },
            containerName: {
              type: 'string',
              description: 'Name of the container',
            },
            prefix: {
              type: 'string',
              description: 'Optional prefix to filter blobs',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of blobs to return (default: 100)',
            },
            accountKey: {
              type: 'string',
              description: 'Optional storage account key. Uses DefaultAzureCredential if not provided.',
            },
          },
          required: ['accountName', 'containerName'],
        },
      },
      {
        name: 'azure_read_blob_content',
        description: 'Read the content of an Azure Storage blob',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: {
              type: 'string',
              description: 'Name of the Azure Storage account',
            },
            containerName: {
              type: 'string',
              description: 'Name of the container',
            },
            blobName: {
              type: 'string',
              description: 'Name of the blob',
            },
            maxBytes: {
              type: 'number',
              description: 'Maximum bytes to read (default: 1MB)',
            },
            accountKey: {
              type: 'string',
              description: 'Optional storage account key. Uses DefaultAzureCredential if not provided.',
            },
          },
          required: ['accountName', 'containerName', 'blobName'],
        },
      },
      {
        name: 'azure_get_blob_metadata',
        description: 'Get metadata for an Azure Storage blob',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: {
              type: 'string',
              description: 'Name of the Azure Storage account',
            },
            containerName: {
              type: 'string',
              description: 'Name of the container',
            },
            blobName: {
              type: 'string',
              description: 'Name of the blob',
            },
            accountKey: {
              type: 'string',
              description: 'Optional storage account key. Uses DefaultAzureCredential if not provided.',
            },
          },
          required: ['accountName', 'containerName', 'blobName'],
        },
      },
    ];
  }

  async handleTool(name: string, args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    try {
      switch (name) {
        case 'azure_run_az_command':
          return await this.handleRunAzCommand(args);
        case 'azure_list_storage_accounts':
          return await this.handleListStorageAccounts(args);
        case 'azure_list_containers':
          return await this.handleListContainers(args);
        case 'azure_list_blobs':
          return await this.handleListBlobs(args);
        case 'azure_read_blob_content':
          return await this.handleReadBlobContent(args);
        case 'azure_get_blob_metadata':
          return await this.handleGetBlobMetadata(args);
        default:
          throw new Error(`Unknown Azure tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleRunAzCommand(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const command = args.command as string;
    const subscriptionId = args.subscriptionId as string | undefined;

    if (!command) {
      throw new Error('Command is required');
    }

    const result = await this.commandExecutor.executeAzureCommand(command, subscriptionId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
            },
            null,
            2
          ),
        },
      ],
      isError: result.exitCode !== 0,
    };
  }

  private async handleListStorageAccounts(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const subscriptionId = args.subscriptionId as string | undefined;
    const resourceGroup = args.resourceGroup as string | undefined;

    let command = 'storage account list';
    if (resourceGroup) {
      command += ` --resource-group ${resourceGroup}`;
    }

    const result = await this.commandExecutor.executeAzureCommand(command, subscriptionId);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to list storage accounts: ${result.stderr}`);
    }

    let accounts;
    try {
      accounts = JSON.parse(result.stdout);
    } catch {
      throw new Error('Failed to parse storage accounts output');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(accounts, null, 2),
        },
      ],
    };
  }

  private getBlobServiceClient(accountName: string, accountKey?: string): BlobServiceClient {
    const accountUrl = `https://${accountName}.blob.core.windows.net`;

    if (accountKey) {
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      return new BlobServiceClient(accountUrl, credential);
    } else {
      // Use DefaultAzureCredential
      const credential = new DefaultAzureCredential();
      return new BlobServiceClient(accountUrl, credential);
    }
  }

  private async handleListContainers(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const accountName = args.accountName as string;
    const accountKey = args.accountKey as string | undefined;

    if (!accountName) {
      throw new Error('Account name is required');
    }

    try {
      const blobServiceClient = this.getBlobServiceClient(accountName, accountKey);
      const containers = [];

      for await (const container of blobServiceClient.listContainers()) {
        containers.push({
          name: container.name,
          metadata: container.metadata,
          properties: {
            lastModified: container.properties?.lastModified,
            etag: container.properties?.etag,
          },
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(containers, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  }

  private async handleListBlobs(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const accountName = args.accountName as string;
    const containerName = args.containerName as string;
    const prefix = (args.prefix as string) || '';
    const maxResults = (args.maxResults as number) || 100;
    const accountKey = args.accountKey as string | undefined;

    if (!accountName || !containerName) {
      throw new Error('Account name and container name are required');
    }

    try {
      const blobServiceClient = this.getBlobServiceClient(accountName, accountKey);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobs = [];
      let count = 0;

      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (count >= maxResults) break;
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength,
          contentType: blob.properties.contentType,
          lastModified: blob.properties.lastModified,
          etag: blob.properties.etag,
        });
        count++;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(blobs, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to list blobs: ${error.message}`);
    }
  }

  private async handleReadBlobContent(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const accountName = args.accountName as string;
    const containerName = args.containerName as string;
    const blobName = args.blobName as string;
    const maxBytes = (args.maxBytes as number) || 1024 * 1024; // 1MB default
    const accountKey = args.accountKey as string | undefined;

    if (!accountName || !containerName || !blobName) {
      throw new Error('Account name, container name, and blob name are required');
    }

    try {
      const blobServiceClient = this.getBlobServiceClient(accountName, accountKey);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const downloadResponse = await blobClient.download(0, maxBytes);
      const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody!);
      const content = buffer.toString('utf-8');

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to read blob: ${error.message}`);
    }
  }

  private async handleGetBlobMetadata(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const accountName = args.accountName as string;
    const containerName = args.containerName as string;
    const blobName = args.blobName as string;
    const accountKey = args.accountKey as string | undefined;

    if (!accountName || !containerName || !blobName) {
      throw new Error('Account name, container name, and blob name are required');
    }

    try {
      const blobServiceClient = this.getBlobServiceClient(accountName, accountKey);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);

      const properties = await blobClient.getProperties();

      const metadata = {
        name: blobName,
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
        etag: properties.etag,
        metadata: properties.metadata,
        blobType: properties.blobType,
        accessTier: properties.accessTier,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(metadata, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get blob metadata: ${error.message}`);
    }
  }

  private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data: any) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      readableStream.on('error', reject);
    });
  }
}

