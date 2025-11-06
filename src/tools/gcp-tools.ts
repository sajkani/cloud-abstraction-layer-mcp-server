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
      {
        name: 'gcp_list_gce_instances',
        description: 'List Google Compute Engine instances',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
            zone: {
              type: 'string',
              description: 'Zone filter (optional)',
            },
            status: {
              type: 'string',
              description: 'Status filter: RUNNING, STOPPED, etc. (optional)',
            },
          },
        },
      },
      {
        name: 'gcp_start_gce_instance',
        description: 'Start a GCE instance',
        inputSchema: {
          type: 'object',
          properties: {
            instance: {
              type: 'string',
              description: 'Instance name',
            },
            zone: {
              type: 'string',
              description: 'Zone where the instance is located',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
          },
          required: ['instance', 'zone'],
        },
      },
      {
        name: 'gcp_stop_gce_instance',
        description: 'Stop a GCE instance',
        inputSchema: {
          type: 'object',
          properties: {
            instance: {
              type: 'string',
              description: 'Instance name',
            },
            zone: {
              type: 'string',
              description: 'Zone where the instance is located',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
          },
          required: ['instance', 'zone'],
        },
      },
      {
        name: 'gcp_restart_gce_instance',
        description: 'Restart a GCE instance',
        inputSchema: {
          type: 'object',
          properties: {
            instance: {
              type: 'string',
              description: 'Instance name',
            },
            zone: {
              type: 'string',
              description: 'Zone where the instance is located',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
          },
          required: ['instance', 'zone'],
        },
      },
      {
        name: 'gcp_get_gce_instance_info',
        description: 'Get detailed information about a GCE instance',
        inputSchema: {
          type: 'object',
          properties: {
            instance: {
              type: 'string',
              description: 'Instance name',
            },
            zone: {
              type: 'string',
              description: 'Zone where the instance is located',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
          },
          required: ['instance', 'zone'],
        },
      },
      {
        name: 'gcp_modify_gce_instance',
        description: 'Modify GCE instance properties (machine type, labels, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            instance: {
              type: 'string',
              description: 'Instance name',
            },
            zone: {
              type: 'string',
              description: 'Zone where the instance is located',
            },
            machineType: {
              type: 'string',
              description: 'New machine type (optional)',
            },
            labels: {
              type: 'object',
              description: 'Labels to add/update (optional)',
            },
            projectId: {
              type: 'string',
              description: 'Optional GCP project ID',
            },
          },
          required: ['instance', 'zone'],
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
        case 'gcp_list_gce_instances':
          return await this.handleListGceInstances(args);
        case 'gcp_start_gce_instance':
          return await this.handleStartGceInstance(args);
        case 'gcp_stop_gce_instance':
          return await this.handleStopGceInstance(args);
        case 'gcp_restart_gce_instance':
          return await this.handleRestartGceInstance(args);
        case 'gcp_get_gce_instance_info':
          return await this.handleGetGceInstanceInfo(args);
        case 'gcp_modify_gce_instance':
          return await this.handleModifyGceInstance(args);
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
    const projectId = args.projectId as string | undefined;
    
    // Create Storage instance with projectId if provided, otherwise use default
    const storage = projectId ? new Storage({ projectId }) : (this.storage || new Storage());
    
    if (!storage) {
      throw new Error('GCS client not initialized. Ensure Google Cloud credentials are configured.');
    }

    try {
      const [buckets] = await storage.getBuckets();
      const bucketList = buckets.map((bucket: any) => ({
        name: bucket.name,
        location: bucket.metadata?.location,
        created: bucket.metadata?.timeCreated,
        updated: bucket.metadata?.updated,
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

  private async handleListGceInstances(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const projectId = args.projectId as string | undefined;
    const zone = args.zone as string | undefined;
    const status = args.status as string | undefined;

    let command = 'compute instances list';
    if (zone) {
      command += ` --zones=${zone}`;
    }
    if (status) {
      command += ` --filter="status:${status}"`;
    }
    command += ' --format=json';

    const result = await this.commandExecutor.executeGcpCommand(command, projectId);

    try {
      const instances = result.stdout ? JSON.parse(result.stdout) : [];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(instances, null, 2),
          },
        ],
        isError: result.exitCode !== 0,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: result.stdout || result.stderr || 'Failed to parse instance list',
          },
        ],
        isError: true,
      };
    }
  }

  private async handleStartGceInstance(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const instance = args.instance as string;
    const zone = args.zone as string;
    const projectId = args.projectId as string | undefined;

    if (!instance || !zone) {
      throw new Error('Instance name and zone are required');
    }

    const command = `compute instances start ${instance} --zone=${zone}`;
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

  private async handleStopGceInstance(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const instance = args.instance as string;
    const zone = args.zone as string;
    const projectId = args.projectId as string | undefined;

    if (!instance || !zone) {
      throw new Error('Instance name and zone are required');
    }

    const command = `compute instances stop ${instance} --zone=${zone}`;
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

  private async handleRestartGceInstance(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const instance = args.instance as string;
    const zone = args.zone as string;
    const projectId = args.projectId as string | undefined;

    if (!instance || !zone) {
      throw new Error('Instance name and zone are required');
    }

    const command = `compute instances reset ${instance} --zone=${zone}`;
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

  private async handleGetGceInstanceInfo(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const instance = args.instance as string;
    const zone = args.zone as string;
    const projectId = args.projectId as string | undefined;

    if (!instance || !zone) {
      throw new Error('Instance name and zone are required');
    }

    const command = `compute instances describe ${instance} --zone=${zone} --format=json`;
    const result = await this.commandExecutor.executeGcpCommand(command, projectId);

    try {
      const instanceInfo = result.stdout ? JSON.parse(result.stdout) : {};
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(instanceInfo, null, 2),
          },
        ],
        isError: result.exitCode !== 0,
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: result.stdout || result.stderr || 'Failed to parse instance info',
          },
        ],
        isError: true,
      };
    }
  }

  private async handleModifyGceInstance(args: Record<string, unknown>): Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }> {
    const instance = args.instance as string;
    const zone = args.zone as string;
    const projectId = args.projectId as string | undefined;
    const machineType = args.machineType as string | undefined;
    const labels = args.labels as Record<string, string> | undefined;

    if (!instance || !zone) {
      throw new Error('Instance name and zone are required');
    }

    let command = `compute instances set-machine-type ${instance} --zone=${zone}`;
    if (machineType) {
      command += ` --machine-type=${machineType}`;
    }

    const results: CommandResult[] = [];
    
    // Update machine type if provided
    if (machineType) {
      const result = await this.commandExecutor.executeGcpCommand(command, projectId);
      results.push(result);
    }

    // Update labels if provided
    if (labels) {
      const labelsStr = Object.entries(labels)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      const labelCommand = `compute instances add-labels ${instance} --zone=${zone} --labels=${labelsStr}`;
      const result = await this.commandExecutor.executeGcpCommand(labelCommand, projectId);
      results.push(result);
    }

    if (results.length === 0) {
      throw new Error('Either machineType or labels must be provided');
    }

    const hasError = results.some((r) => r.exitCode !== 0);
    const combinedOutput = results
      .map((r, i) => `Operation ${i + 1}:\n${r.stdout}\n${r.stderr}`)
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: combinedOutput,
        },
      ],
      isError: hasError,
    };
  }
}

