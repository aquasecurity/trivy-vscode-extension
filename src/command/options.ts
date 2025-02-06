import * as vscode from 'vscode';

// TrivyCommandOption is an interface that defines the structure of the TrivyCommandOption class.
// The TrivyCommandOption class has an apply method that takes a command and a configuration and returns
// the updated command.
interface TrivyCommandOption {
  name: string;
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[];
}

class DebugOption implements TrivyCommandOption {
  readonly name = 'debug';
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

class ScannersOption implements TrivyCommandOption {
  readonly name = 'scanners';
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

class RequiredSeveritiesOption implements TrivyCommandOption {
  readonly name = 'requiredSeverities';

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

class OfflineScanOption implements TrivyCommandOption {
  readonly name = 'offlineScan';

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

class FixedOnlyOption implements TrivyCommandOption {
  readonly name = 'fixedOnly';

  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    if (config.get<boolean>('fixedOnly')) {
      command.push('--ignore-unfixed');
    }

    return command;
  }
}

class IgnoreFilePathOption implements TrivyCommandOption {
  readonly name = 'useTrivyIgnoreFile';

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

class ConfigFilePathOption implements TrivyCommandOption {
  readonly name = 'configFilePath';

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

export const TrivyCommandOptions: TrivyCommandOption[] = [
  new ScannersOption(),
  new ConfigFilePathOption(),
  new RequiredSeveritiesOption(),
  new OfflineScanOption(),
  new FixedOnlyOption(),
  new IgnoreFilePathOption(),
  new DebugOption(),
];

export function getTrivyCommandOptions(
  commandName: string
): TrivyCommandOption {
  const option = TrivyCommandOptions.find(
    (option) => option.name === commandName
  );
  if (!option) {
    throw new Error(`Unknown command option: ${commandName}`);
  }
  return option;
}
