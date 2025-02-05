import * as vscode from 'vscode';

interface TrivyCommandOption {
  name: string;
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[];
}

class DebugOption implements TrivyCommandOption {
  readonly name = 'debug';
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    if (config.get<boolean>('debug')) {
      command.push('--debug');
    }
    return command;
  }
}

class ScannersOption implements TrivyCommandOption {
  readonly name = 'scanners';
  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    let requireChecks = 'misconfig,vuln';
    if (config.get<boolean>('secretScanning')) {
      requireChecks = `${requireChecks},secret`;
    }
    command.push('fs');
    command.push(`--scanners=${requireChecks}`);

    return command;
  }
}

class RequiredSeveritiesOption implements TrivyCommandOption {
  readonly name = 'requiredSeverities';

  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
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

class ServerEnabledOption implements TrivyCommandOption {
  readonly name = 'serverEnabled';

  apply(command: string[], config: vscode.WorkspaceConfiguration): string[] {
    if (
      config.get<boolean>('serverEnable') &&
      config.get<string>('serverUrl') !== ''
    ) {
      command.push('--server');
      command.push(`${config.get<string>('serverUrl')}`);
    }

    return command;
  }
}

export const TrivyCommandOptions: TrivyCommandOption[] = [
  new DebugOption(),
  new ScannersOption(),
  new RequiredSeveritiesOption(),
  new OfflineScanOption(),
  new FixedOnlyOption(),
  new ServerEnabledOption(),
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
