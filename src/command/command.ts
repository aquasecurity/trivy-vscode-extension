import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import { unlinkSync, readdirSync } from 'fs';
import {
  ConfigFilePathOption,
  DebugOption,
  FixedOnlyOption,
  IgnoreFilePathOption,
  JSONFormatOption,
  OfflineScanOption,
  RequiredSeveritiesOption,
  ResultsOutputOption,
  ScannersOption,
  TrivyCommandOption,
} from './options';
import { updateEnvironment } from '../commercial/env';
import { Output } from './output';
import {
  showErrorMessage,
  showInformationMessage,
  showWarningWithLink,
} from '../notification/notifications';

export class TrivyWrapper {
  private readonly outputChannel = new Output();

  constructor(private readonly resultsStoragePath: string) {}

  run(secrets: vscode.SecretStorage) {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('Running Trivy to update results');

    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return;
    }

    const files = readdirSync(this.resultsStoragePath).filter(
      (fn) =>
        fn.endsWith('_results.json') ||
        fn.endsWith('_results.json.json') ||
        fn.endsWith('_assurance.json')
    );
    files.forEach((file) => {
      const deletePath = path.join(this.resultsStoragePath, file);
      unlinkSync(deletePath);
    });

    const binary = this.getBinaryPath();
    vscode.workspace.workspaceFolders?.forEach(async (workspaceFolder) => {
      if (!workspaceFolder) {
        return;
      }

      let env = process.env;
      const config = vscode.workspace.getConfiguration('trivy');
      const isAquaPlatformRun = config.get<boolean>('useAquaPlatform');
      if (config.get<boolean>('useAquaPlatform')) {
        const assuranceReportPath = path.join(
          this.resultsStoragePath,
          `${workspaceFolder.name}_assurance.json`
        );
        env = await updateEnvironment(
          config,
          secrets,
          env,
          assuranceReportPath
        );
      }

      const workingPath = workspaceFolder.uri.fsPath;
      const command = this.buildCommand(workingPath, workspaceFolder.name);
      this.outputChannel.appendLine(`command: ${command.join(' ')}`);

      this.runTaskWithProgress(
        binary,
        command,
        workingPath,
        env,
        isAquaPlatformRun
      );
    });
  }

  showCurrentTrivyVersion() {
    const currentVersion = this.getInstalledTrivyVersion();
    if (currentVersion) {
      showInformationMessage(`Current Trivy version is ${currentVersion}`);
    }
  }

  private getBinaryPath() {
    const config = vscode.workspace.getConfiguration('trivy');
    let binary = config.get('binaryPath', 'trivy');
    if (binary === '') {
      binary = 'trivy';
    }

    return binary;
  }

  private async runTaskWithProgress(
    binary: string,
    command: string[],
    workingPath: string,
    env: NodeJS.ProcessEnv,
    isAquaPlatformRun: boolean | undefined
  ) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title:
          'Running Trivy Scan' + (isAquaPlatformRun ? ' (Aqua Platform)' : ''),
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0 });

        return new Promise<void>((resolve, reject) => {
          const execution = child.spawn(binary, command, {
            cwd: workingPath,
            env,
          });
          let cancelled = false;

          token.onCancellationRequested(() => {
            execution.kill();
            execution.stderr.destroy();
            execution.stdout.destroy();
            this.outputChannel.appendLine('Trivy scan canceled by user');
            cancelled = true;
            return;
          });

          execution.stdout.on('data', (data) => {
            this.outputChannel.appendLine(data.toString());
          });

          execution.stderr.on('data', (data) => {
            this.outputChannel.appendLine(data.toString());
          });

          execution.on('exit', async (code) => {
            if (code !== 0) {
              if (cancelled) {
                await showWarningWithLink('Trivy scan was canceled');
                reject(new Error('Trivy scan was canceled'));
                return;
              }
              await showWarningWithLink('Trivy failed to run.');
              reject(new Error('Trivy failed to run.'));
              return;
            }
            showInformationMessage('Trivy ran successfully, updating results');
            this.outputChannel.appendLine(
              'Reloading the Findings Explorer content'
            );
            setTimeout(() => {
              vscode.commands.executeCommand('trivy.refresh');
            }, 250);
            resolve();
          });
        });
      }
    );
  }

  private checkTrivyInstalled(): boolean {
    const binaryPath = this.getBinaryPath();

    const command = [];
    command.push(binaryPath);
    command.push('--help');
    try {
      child.execSync(command.join(' '));
    } catch (err) {
      Output.show();
      this.outputChannel.appendLine(
        `Trivy not found. Check the Trivy extension settings to ensure the path is correct. [${binaryPath}]`
      );
      if (err instanceof Error) {
        this.outputChannel.appendLine(err.message);
      }
      return false;
    }
    return true;
  }

  private getInstalledTrivyVersion(): string {
    if (!this.checkTrivyInstalled) {
      showErrorMessage('Trivy could not be found, check Output window');
      return '';
    }

    const binary = this.getBinaryPath();

    const command = [];
    command.push(binary);
    command.push('--version');
    const getVersion = child.execSync(command.join(' '));
    return getVersion.toString();
  }

  buildCommand(
    workingPath: string,
    workspaceName: string,
    trivyOptions?: TrivyCommandOption[]
  ): string[] {
    const config = vscode.workspace.getConfiguration('trivy');
    let command: string[] = ['fs'];

    const resultsPath = path.join(
      this.resultsStoragePath,
      `${workspaceName}_results.json`,
      config.get('useAquaPlatform') ? '.dump' : ''
    );
    if (!trivyOptions) {
      trivyOptions = [
        new ScannersOption(),
        new ConfigFilePathOption(),
        new RequiredSeveritiesOption(),
        new OfflineScanOption(),
        new FixedOnlyOption(),
        new IgnoreFilePathOption(),
        new DebugOption(),
        new JSONFormatOption(),
        new ResultsOutputOption(resultsPath),
      ];
    }

    // apply the command options to
    // add the required configuration to the command
    for (const option of trivyOptions) {
      command = option.apply(command, config);
    }

    command.push(workingPath);
    return command;
  }
}
