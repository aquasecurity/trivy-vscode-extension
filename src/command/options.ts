import * as vscode from 'vscode';

// TrivyCommandOption is an interface that defines the structure of the TrivyCommandOption class.
// The TrivyCommandOption class has an apply method that takes a command and a configuration and returns
// the updated command.
export interface TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[];
}

export class DebugOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }
    if (config.get<boolean>('debug')) {
      command.push('--debug');
    }
    return command;
  }
}

export class ScannersOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }

    let requireChecks = 'misconfig,vuln';
    if (config.get<boolean>('secretScanning')) {
      requireChecks = `${requireChecks},secret`;
    }
    command.push(`--scanners=${requireChecks}`);
    return command;
  }
}

export class RequiredSeveritiesOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }
    const requiredSeverities: string[] = [];

    const minRequired = config.get<string>('minimumReportedSeverity');
    const severities: string[] = [
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW',
      'UNKNOWN',
    ];

    for (let i = 0; i < severities.length; i++) {
      const s = severities[i];
      if (!s) {
        continue;
      }
      requiredSeverities.push(s);
      if (s === minRequired) {
        break;
      }
    }
    command.push(`--severity=${requiredSeverities.join(',')}`);

    return command;
  }
}

export class OfflineScanOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }
    if (config.get<boolean>('offlineScan')) {
      command.push('--offline-scan');
    }
    return command;
  }
}

export class FixedOnlyOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    if (config.get<boolean>('fixedOnly')) {
      command.push('--ignore-unfixed');
    }

    return command;
  }
}

export class IgnoreFilePathOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }
    const ignoreFilePath = config.get<string>('ignoreFilePath');
    if (config.get<boolean>('useIgnoreFile')) {
      if (ignoreFilePath) {
        command.push(`--ignorefile=${ignoreFilePath}`);
      } else {
        vscode.window.showWarningMessage('Trivy ignore file path is not set.');
        config.update('useIgnoreFile', false);
      }
    }

    return command;
  }
}

export class ConfigFilePathOption implements TrivyCommandOption {
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    // if onlyUseConfigFile is set, we don't need to add the scanners option
    if (config.get<boolean>('onlyUseConfigFile')) {
      return command;
    }
    const configFilePath = config.get<string>('configFilePath');
    if (config.get<boolean>('useConfigFile')) {
      if (configFilePath) {
        command.push(`--config=${configFilePath}`);
      } else {
        vscode.window.showWarningMessage(
          'Trivy config file path override is not set.'
        );
        config.update('useConfigFile', false);
      }
    }

    return command;
  }
}

export class JSONFormatOption implements TrivyCommandOption {
  apply(command: string[]): string[] {
    command.push('--format=json');
    return command;
  }
}

export class ResultsOutputOption implements TrivyCommandOption {
  constructor(private resultsPath: string) {}

  apply(command: string[]): string[] {
    command.push(`--output=${this.resultsPath}`);
    return command;
  }
}

export class ExitCodeOption implements TrivyCommandOption {
  constructor(private exitCode: number) {}

  apply(command: string[]): string[] {
    command.push(`--exit-code=${this.exitCode}`);
    return command;
  }
}

export class QuietOption implements TrivyCommandOption {
  apply(command: string[]): string[] {
    command.push('--quiet');
    return command;
  }
}
