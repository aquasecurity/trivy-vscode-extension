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
  showWarningWithLink,
} from '../notification/notifications';

/**
 * Wrapper for executing Trivy commands and handling results
 */
export class TrivyWrapper {
  private readonly outputChannel = new Output();

  /**
   * Creates a new instance of TrivyWrapper
   * @param resultsStoragePath Path where results will be stored
   */
  constructor(private readonly resultsStoragePath: string) {}

  /**
   * Runs Trivy scan on all workspace folders
   * @param secrets Secret storage for API keys and tokens
   */
  async run(secrets: vscode.SecretStorage): Promise<void> {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('Running Trivy to update results');

    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return;
    }

    // Clean up previous result files
    this.cleanupPreviousResults();

    const binary = this.getBinaryPath();

    // Process each workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      showErrorMessage('No workspace folders found');
      return;
    }

    // Set context to disable views during scanning
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.scanRunning',
      true
    );

    try {
      // Run scans for each workspace folder
      for (const workspaceFolder of workspaceFolders) {
        try {
          await this.scanWorkspaceFolder(workspaceFolder, binary, secrets);
        } catch (error) {
          this.outputChannel.appendLine(
            `Error scanning workspace ${workspaceFolder.name}: ${error}`
          );
        }
      }
    } finally {
      // Reset context to re-enable views
      await vscode.commands.executeCommand(
        'setContext',
        'trivy.scanRunning',
        false
      );
    }
  }

  /**
   * Display the current Trivy version
   */
  showCurrentTrivyVersion(): void {
    try {
      const currentVersion = this.getInstalledTrivyVersion();
      if (currentVersion) {
        vscode.window.showInformationMessage(
          `Current Trivy version is ${currentVersion.trim()}`
        );
      }
    } catch (error) {
      showErrorMessage(`Failed to get Trivy version: ${error}`);
    }
  }

  /**
   * Scan a specific workspace folder
   * @param workspaceFolder The workspace folder to scan
   * @param binary Path to the Trivy binary
   * @param secrets Secret storage for API keys and tokens
   */
  private async scanWorkspaceFolder(
    workspaceFolder: vscode.WorkspaceFolder,
    binary: string,
    secrets: vscode.SecretStorage
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('trivy');
    const isAquaPlatformRun = config.get<boolean>('useAquaPlatform');

    let env = process.env;

    if (isAquaPlatformRun) {
      const assuranceReportPath = path.join(
        this.resultsStoragePath,
        `${workspaceFolder.name}_assurance.json`
      );
      env = await updateEnvironment(config, secrets, env, assuranceReportPath);
    }

    const workingPath = workspaceFolder.uri.fsPath;
    const command = this.buildCommand(workingPath, workspaceFolder.name);
    this.outputChannel.appendLine(`command: ${command.join(' ')}`);

    await this.runTaskWithProgress(
      binary,
      command,
      workingPath,
      env,
      isAquaPlatformRun
    );
  }

  /**
   * Clean up previous result files
   */
  private cleanupPreviousResults(): void {
    const files = readdirSync(this.resultsStoragePath).filter(
      (fn) =>
        fn.endsWith('_results.json') ||
        fn.endsWith('_results.json.dump') ||
        fn.endsWith('_assurance.json')
    );

    for (const file of files) {
      try {
        const deletePath = path.join(this.resultsStoragePath, file);
        unlinkSync(deletePath);
      } catch (error) {
        this.outputChannel.appendLine(
          `Error cleaning up file ${file}: ${error}`
        );
      }
    }
  }

  /**
   * Get the path to the Trivy binary
   * @returns Path to the Trivy binary
   */
  private getBinaryPath(): string {
    const config = vscode.workspace.getConfiguration('trivy');
    let binary = config.get<string>('binaryPath', 'trivy');

    if (binary === '') {
      binary = 'trivy';
    }

    return binary;
  }

  /**
   * Check if Trivy is installed and accessible
   * @returns true if Trivy is installed, false otherwise
   */
  private checkTrivyInstalled(): boolean {
    const binaryPath = this.getBinaryPath();

    try {
      child.execSync(`${binaryPath} --help`, { stdio: 'ignore' });
      return true;
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
  }

  /**
   * Get the installed Trivy version
   * @returns Version string of the installed Trivy binary
   */
  private getInstalledTrivyVersion(): string {
    // Note: Call the function, not reference it
    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return '';
    }

    const binary = this.getBinaryPath();
    const getVersion = child.execSync(`${binary} --version`);
    return getVersion.toString();
  }

  /**
   * Build the Trivy command
   * @param workingPath Path to scan
   * @param workspaceName Name of the workspace
   * @param trivyOptions Optional command options
   * @returns String array of command parts
   */
  buildCommand(
    workingPath: string,
    workspaceName: string,
    trivyOptions?: TrivyCommandOption[]
  ): string[] {
    const config = vscode.workspace.getConfiguration('trivy');
    let command: string[] = ['fs'];

    const isAquaPlatform = config.get<boolean>('useAquaPlatform');
    const suffix = isAquaPlatform ? '.dump' : '';

    const resultsPath = path.join(
      this.resultsStoragePath,
      `${workspaceName}_results.json${suffix}`
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

    // Apply command options
    for (const option of trivyOptions) {
      command = option.apply(command, config);
    }

    command.push(workingPath);
    return command;
  }

  /**
   * Run a task with a progress bar
   * @param binary Path to the Trivy binary
   * @param command Command array to execute
   * @param workingPath Working directory
   * @param env Environment variables
   * @param isAquaPlatformRun Whether this is an Aqua Platform run
   */
  private async runTaskWithProgress(
    binary: string,
    command: string[],
    workingPath: string,
    env: NodeJS.ProcessEnv,
    isAquaPlatformRun: boolean | undefined
  ): Promise<void> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: `Running Trivy Scan${isAquaPlatformRun ? ' (Aqua Platform)' : ''}`,
        cancellable: true,
      },
      async (progress, token) => {
        let killed = false;

        progress.report({ increment: 0, message: 'Scanning...' });

        return new Promise<void>((resolve, reject) => {
          const execution = child.spawn(binary, command, {
            cwd: workingPath,
            env,
          });

          token.onCancellationRequested(() => {
            killed = true;
            execution.kill();
            execution.stderr.destroy();
            execution.stdout.destroy();
            this.outputChannel.appendLine('Trivy scan canceled by user');
          });

          execution.stdout.on('data', (data) => {
            const output = data.toString();
            this.outputChannel.appendLine(output);

            // Update progress based on output
            if (output.includes('Scanning')) {
              progress.report({ message: 'Scanning files...' });
            } else if (output.includes('Analyzing')) {
              progress.report({ message: 'Analyzing dependencies...' });
            }
          });

          execution.stderr.on('data', (data) => {
            this.outputChannel.appendLine(data.toString());
          });

          execution.on('error', (error) => {
            this.outputChannel.appendLine(`Execution error: ${error.message}`);
            reject(error);
          });

          execution.on('exit', async (code) => {
            if (killed) {
              reject(new Error('Scan canceled by user'));
              return;
            }

            if (code !== 0) {
              await showWarningWithLink('Trivy failed to run.');
              reject(new Error(`Trivy failed with exit code ${code}`));
              return;
            }

            vscode.window.showInformationMessage(
              'Trivy ran successfully, updating results'
            );
            this.outputChannel.appendLine(
              'Reloading the Findings Explorer content'
            );

            // Use a slight delay to ensure files are written before refreshing
            setTimeout(() => {
              vscode.commands.executeCommand('trivy.refresh');
            }, 250);

            resolve();
          });
        });
      }
    );
  }
}
