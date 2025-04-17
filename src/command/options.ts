import * as os from 'os';

import * as vscode from 'vscode';

import { showErrorMessage } from '../ui/notification/notifications';

/**
 * Interface defining a command option that can be applied to a Trivy command
 */
export interface TrivyCommandOption {
  /**
   * Apply this option to a command array
   * @param command The command array to modify
   * @param config The VS Code configuration to use
   * @returns The modified command array
   */
  apply(command: string[], config?: vscode.WorkspaceConfiguration): string[];
}

/**
 * Base class for options that should be skipped when using config file only mode
 */
abstract class ConfigAwareOption implements TrivyCommandOption {
  /**
   * Apply the option if not in config-file-only mode
   * @param command The command array to modify
   * @param config The VS Code configuration to use
   * @returns The modified command array
   */
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // Skip this option if only using config file
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }

    return this.applyOption(command, config);
  }

  /**
   * Implementation-specific option application
   * @param command The command array to modify
   * @param config The VS Code configuration to use
   * @returns The modified command array
   */
  protected abstract applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[];
}

/**
 * Option to enable debug output
 */
export class DebugOption extends ConfigAwareOption {
  protected applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[] {
    if (config.get<boolean>('debug')) {
      command.push('--debug');
    }
    return command;
  }
}

/**
 * Option to set scanners (misconfig, vuln, secret)
 */
export class ScannersOption extends ConfigAwareOption {
  protected applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[] {
    const scanners = [];

    if (config.get<boolean>('vulnScanning')) {
      scanners.push('vuln');
    }

    if (config.get<boolean>('misconfigScanning')) {
      scanners.push('misconfig');
    }

    if (config.get<boolean>('secretScanning')) {
      scanners.push('secret');
    }

    command.push(`--scanners=${scanners.join(',')}`);
    command.push('--list-all-pkgs');

    return command;
  }
}

/**
 * Option to set the minimum severity level for reporting
 */
export class RequiredSeveritiesOption extends ConfigAwareOption {
  private static readonly SEVERITIES = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'UNKNOWN',
  ];

  protected applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[] {
    const minRequired = config.get<string>('minimumReportedSeverity');
    if (!minRequired) {
      return command;
    }

    const requiredSeverities = this.getSeveritiesByMinimum(minRequired);
    if (requiredSeverities.length > 0) {
      command.push(`--severity=${requiredSeverities.join(',')}`);
    }

    return command;
  }

  /**
   * Get all severities from CRITICAL down to the specified minimum
   * @param minimum The minimum severity level to include
   * @returns Array of severity levels
   */
  private getSeveritiesByMinimum(minimum: string): string[] {
    const result: string[] = [];

    for (const severity of RequiredSeveritiesOption.SEVERITIES) {
      result.push(severity);
      if (severity === minimum) {
        break;
      }
    }

    return result;
  }
}

/**
 * Option to enable offline scanning
 */
export class OfflineScanOption extends ConfigAwareOption {
  protected applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[] {
    if (config.get<boolean>('offlineScan')) {
      command.push('--offline-scan');
    }
    return command;
  }
}

/**
 * Option to only show fixed vulnerabilities
 */
export class FixedOnlyOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    if (config.get<boolean>('fixedOnly')) {
      command.push('--ignore-unfixed');
    }
    return command;
  }
}

/**
 * Base class for file path options
 * @abstract
 * @extends ConfigAwareOption
 */
abstract class FilePathOption extends ConfigAwareOption {
  constructor(
    protected readonly configKey: string,
    protected readonly flagName: string,
    protected readonly errorMessage: string
  ) {
    super();
  }

  protected applyOption(
    command: string[],
    config: vscode.WorkspaceConfiguration
  ): string[] {
    const useFlag = config.get<boolean>(
      `use${this.capitalizeFirst(this.configKey)}`
    );

    if (!useFlag) {
      return command;
    }

    const filePath = config.get<string>(`${this.configKey}Path`);
    if (filePath) {
      command.push(`--${this.flagName}=${filePath}`);
    } else {
      showErrorMessage(this.errorMessage);
      void config.update(
        `use${this.capitalizeFirst(this.configKey)}`,
        false,
        vscode.ConfigurationTarget.Workspace
      );
    }

    return command;
  }

  /**
   * Capitalize the first letter of a string
   * @param str Input string
   * @returns String with first letter capitalized
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

/**
 * Option to set the ignore file path
 */
export class IgnoreFilePathOption extends FilePathOption {
  constructor() {
    super('ignoreFile', 'ignorefile', 'Trivy ignore file path is not set.');
  }
}

/**
 * Option to set the config file path
 */
export class ConfigFilePathOption extends FilePathOption {
  constructor() {
    super(
      'configFilePath',
      'config',
      'Trivy config file path override is not set.'
    );
  }
}

/**
 * Option to set JSON output format
 */
export class JSONFormatOption implements TrivyCommandOption {
  apply(command: string[]): string[] {
    command.push('--format=json');
    return command;
  }
}

/**
 * Option to set the output file path
 */
export class ResultsOutputOption implements TrivyCommandOption {
  /**
   * @param resultsPath Path where results should be saved
   */
  constructor(private readonly resultsPath: string) {}

  apply(command: string[]): string[] {
    if (os.platform() !== 'darwin') {
      // wrap the path in quotes for windows and linux
      command.push(`--output="${this.resultsPath}"`);
    } else {
      command.push(`--output=${this.resultsPath}`);
    }

    return command;
  }
}

/**
 * Option to set a custom exit code
 */
export class ExitCodeOption implements TrivyCommandOption {
  /**
   * @param exitCode Exit code to use
   */
  constructor(private readonly exitCode: number) {}

  apply(command: string[]): string[] {
    command.push(`--exit-code=${this.exitCode}`);
    return command;
  }
}

/**
 * Option to suppress output
 */
export class QuietOption implements TrivyCommandOption {
  apply(command: string[]): string[] {
    command.push('--quiet');
    return command;
  }
}
