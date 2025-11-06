export class SecurityValidator {
  private readonly MAX_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

  // Dangerous commands that should be blocked
  private readonly BLOCKED_GCP_COMMANDS = [
    'auth',
    'config',
    'init',
    'beta',
    'alpha',
  ];

  private readonly BLOCKED_AZURE_COMMANDS = [
    'login',
    'account',
    'config',
  ];

  /**
   * Validates if a gcloud command is safe to execute
   */
  validateGcpCommand(command: string): { valid: boolean; reason?: string } {
    if (!command || command.trim().length === 0) {
      return { valid: false, reason: 'Empty command' };
    }

    const normalizedCommand = command.trim().toLowerCase();

    // Check for blocked commands
    for (const blocked of this.BLOCKED_GCP_COMMANDS) {
      if (normalizedCommand.startsWith(blocked)) {
        return {
          valid: false,
          reason: `Command blocked: ${blocked} commands are not allowed for security reasons`,
        };
      }
    }

    // Additional security checks
    if (normalizedCommand.includes('--format') && normalizedCommand.includes('eval')) {
      return {
        valid: false,
        reason: 'Potentially dangerous format evaluation detected',
      };
    }

    return { valid: true };
  }

  /**
   * Validates if an Azure CLI command is safe to execute
   */
  validateAzureCommand(command: string): { valid: boolean; reason?: string } {
    if (!command || command.trim().length === 0) {
      return { valid: false, reason: 'Empty command' };
    }

    const normalizedCommand = command.trim().toLowerCase();

    // Check for blocked commands
    for (const blocked of this.BLOCKED_AZURE_COMMANDS) {
      if (normalizedCommand.startsWith(blocked)) {
        return {
          valid: false,
          reason: `Command blocked: ${blocked} commands are not allowed for security reasons`,
        };
      }
    }

    return { valid: true };
  }

  getMaxTimeout(): number {
    return this.MAX_TIMEOUT_MS;
  }

  getMaxBufferSize(): number {
    return this.MAX_BUFFER_SIZE;
  }
}

