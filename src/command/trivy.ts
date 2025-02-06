import * as vscode from 'vscode';
import * as child from 'child_process';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { unlinkSync, readdirSync } from 'fs';
import { TrivyCommandOptions } from './options';
import { showWarningWithLink } from '../utils';

export class TrivyWrapper {
  private workingPath: string[] = [];
  constructor(
    private outputChannel: vscode.OutputChannel,
    private readonly resultsStoragePath: string
  ) {
    if (
      !vscode.workspace ||
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length <= 0
    ) {
      return;
    }
    const folders = vscode.workspace.workspaceFolders;
    for (let i = 0; i < folders.length; i++) {
      if (folders[i]) {
        const workspaceFolder = folders[i];
        if (!workspaceFolder) {
          continue;
        }
        this.workingPath.push(workspaceFolder.uri.fsPath);
      }
    }
  }

  run() {
    const outputChannel = this.outputChannel;
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('Running Trivy to update results');

    if (!this.checkTrivyInstalled()) {
      return;
    }

    const files = readdirSync(this.resultsStoragePath).filter(
      (fn) => fn.endsWith('_results.json') || fn.endsWith('_results.json.json')
    );
    files.forEach((file) => {
      const deletePath = path.join(this.resultsStoragePath, file);
      unlinkSync(deletePath);
    });

    const binary = this.getBinaryPath();

    this.workingPath.forEach(async (workingPath) => {
      const command = await this.buildCommand(workingPath);
      this.outputChannel.appendLine(`command: ${command.join(' ')}`);

      const execution = child.spawn(binary, command, { cwd: workingPath });

      execution.stdout.on('data', function (data) {
        outputChannel.appendLine(data.toString());
      });

      execution.stderr.on('data', function (data) {
        outputChannel.appendLine(data.toString());
      });

      execution.on('exit', async function (code) {
        if (code !== 0) {
          await showWarningWithLink('Trivy failed to run.', outputChannel);

          return;
        }
        vscode.window.showInformationMessage(
          'Trivy ran successfully, updating results'
        );
        outputChannel.appendLine('Reloading the Findings Explorer content');
        setTimeout(() => {
          vscode.commands.executeCommand('trivy.refresh');
        }, 250);
      });
    });
  }

  showCurrentTrivyVersion() {
    const currentVersion = this.getInstalledTrivyVersion();
    if (currentVersion) {
      vscode.window.showInformationMessage(
        `Current Trivy version is ${currentVersion}`
      );
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

  private checkTrivyInstalled(): boolean {
    const binaryPath = this.getBinaryPath();

    const command = [];
    command.push(binaryPath);
    command.push('--help');
    try {
      child.execSync(command.join(' '));
    } catch (err) {
      this.outputChannel.show();
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
      vscode.window.showErrorMessage(
        'Trivy could not be found, check Output window'
      );
      return '';
    }

    const binary = this.getBinaryPath();

    const command = [];
    command.push(binary);
    command.push('--version');
    const getVersion = child.execSync(command.join(' '));
    return getVersion.toString();
  }

  private buildCommand(workingPath: string): string[] {
    const config = vscode.workspace.getConfiguration('trivy');
    let command: string[] = ['fs'];

    // apply the command options to
    // add the required configuration to the command
    for (const option of TrivyCommandOptions) {
      command = option.apply(command, config);
    }

    command.push('--format=json');
    const resultsPath = path.join(
      this.resultsStoragePath,
      `${uuid()}_results.json`
    );
    command.push(`--output=${resultsPath}`);

    command.push(workingPath);
    return command;
  }
}
