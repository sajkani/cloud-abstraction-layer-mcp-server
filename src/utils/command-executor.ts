import { exec } from 'child_process';
import { promisify } from 'util';
import { SecurityValidator } from './security.js';

const execAsync = promisify(exec);

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class CommandExecutor {
  constructor(private securityValidator: SecurityValidator) {}

  async executeGcpCommand(
    command: string,
    projectId?: string
  ): Promise<CommandResult> {
    const validation = this.securityValidator.validateGcpCommand(command);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Command validation failed');
    }

    let fullCommand = `gcloud ${command}`;
    if (projectId) {
      fullCommand = `gcloud ${command} --project=${projectId}`;
    }

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: this.securityValidator.getMaxTimeout(),
        maxBuffer: this.securityValidator.getMaxBufferSize(),
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
      };
    }
  }

  async executeAzureCommand(
    command: string,
    subscriptionId?: string
  ): Promise<CommandResult> {
    const validation = this.securityValidator.validateAzureCommand(command);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Command validation failed');
    }

    let fullCommand = `az ${command}`;
    if (subscriptionId) {
      fullCommand = `az ${command} --subscription ${subscriptionId}`;
    }

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: this.securityValidator.getMaxTimeout(),
        maxBuffer: this.securityValidator.getMaxBufferSize(),
      });

      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        exitCode: error.code || 1,
      };
    }
  }
}

