import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecurityValidator } from '../utils/security.js';
import { CommandExecutor, CommandResult } from '../utils/command-executor.js';
import { Storage } from '@google-cloud/storage';

export class GcpTools {
  private commandExecutor: CommandExecutor;
  private storage: Storage | null = null;

  constructor(private securityValidator: SecurityValidator) {
    this.commandExecutor = new CommandExecutor(securityValidator);
    try {
      this.storage = new Storage();
    } catch (error) {
      console.error('Failed to initialize GCS client:', error);
    }
  }

  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'gcp_run_gcloud_command',
        description:
          'Execute a gcloud command safely with security restrictions. Supports project-specific commands.',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The gcloud command to execute (without the "gcloud" prefix)',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID to use for the command',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'gcp_list_buckets',
        description: 'List all GCS buckets in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID. Uses default if not provided.',
            },
          },
        },
      },
      {
        name: 'gcp_list_objects',
        description: 'List objects in a GCS bucket with optional prefix filtering',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Name of the GCS bucket',
            },
            prefix: {
              type: 'string',
              description: 'Optional prefix to filter objects',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of objects to return (default: 100)',
            },
          },
          required: ['bucketName'],
        },
      },
      {
        name: 'gcp_read_object_content',
        description: 'Read the content of a GCS object',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Name of the GCS bucket',
            },
            objectName: {
              type: 'string',
              description: 'Name of the object in the bucket',
            },
            maxBytes: {
              type: 'number',
              description: 'Maximum bytes to read (default: 1MB)',
            },
          },
          required: ['bucketName', 'objectName'],
        },
      },
      {
        name: 'gcp_get_object_metadata',
        description: 'Get metadata for a GCS object',
        inputSchema: {
          type: 'object',
          properties: {
            bucketName: {
              type: 'string',
              description: 'Name of the GCS bucket',
            },
            objectName: {
              type: 'string',
              description: 'Name of the object in the bucket',
            },
          },
          required: ['bucketName', 'objectName'],
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
        case 'gcp_run_gcloud_command':
          return await this.handleRunGcloudCommand(args);
        case 'gcp_list_buckets':
          return await this.handleListBuckets(args);
        case 'gcp_list_objects':
          return await this.handleListObjects(args);
        case 'gcp_read_object_content':
          return await this.handleReadObjectContent(args);
        case 'gcp_get_object_metadata':
          return await this.handleGetObjectMetadata(args);
        default:
          throw new Error(`Unknown GCP tool: ${name}`);
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

  private async handleRunGcloudCommand(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const command = args.command as string;
    const projectId = args.projectId as string | undefined;

    if (!command) {
      throw new Error('Command is required');
    }

    const result = await this.commandExecutor.executeGcpCommand(command, projectId);

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

  private async handleListBuckets(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    if (!this.storage) {
      throw new Error('GCS client not initialized. Ensure Google Cloud credentials are configured.');
    }

    const projectId = args.projectId as string | undefined;
    const options = projectId ? { projectId } : {};

    try {
      const [buckets] = await this.storage.getBuckets(options);
      const bucketList = buckets.map((bucket) => ({
        name: bucket.name,
        location: bucket.metadata.location,
        created: bucket.metadata.timeCreated,
        updated: bucket.metadata.updated,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(bucketList, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to list buckets: ${error.message}`);
    }
  }

  private async handleListObjects(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    if (!this.storage) {
      throw new Error('GCS client not initialized. Ensure Google Cloud credentials are configured.');
    }

    const bucketName = args.bucketName as string;
    const prefix = (args.prefix as string) || '';
    const maxResults = (args.maxResults as number) || 100;

    if (!bucketName) {
      throw new Error('Bucket name is required');
    }

    try {
      const bucket = this.storage.bucket(bucketName);
      const [files] = await bucket.getFiles({
        prefix,
        maxResults,
      });

      const objectList = files.map((file) => ({
        name: file.name,
        size: file.metadata.size,
        contentType: file.metadata.contentType,
        updated: file.metadata.updated,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectList, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to list objects: ${error.message}`);
    }
  }

  private async handleReadObjectContent(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    if (!this.storage) {
      throw new Error('GCS client not initialized. Ensure Google Cloud credentials are configured.');
    }

    const bucketName = args.bucketName as string;
    const objectName = args.objectName as string;
    const maxBytes = (args.maxBytes as number) || 1024 * 1024; // 1MB default

    if (!bucketName || !objectName) {
      throw new Error('Bucket name and object name are required');
    }

    try {
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      const [buffer] = await file.download({
        start: 0,
        end: maxBytes - 1,
      });

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
      throw new Error(`Failed to read object: ${error.message}`);
    }
  }

  private async handleGetObjectMetadata(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    if (!this.storage) {
      throw new Error('GCS client not initialized. Ensure Google Cloud credentials are configured.');
    }

    const bucketName = args.bucketName as string;
    const objectName = args.objectName as string;

    if (!bucketName || !objectName) {
      throw new Error('Bucket name and object name are required');
    }

    try {
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(objectName);
      const [metadata] = await file.getMetadata();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(metadata, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Failed to get object metadata: ${error.message}`);
    }
  }
}

