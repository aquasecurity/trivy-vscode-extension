import * as vscode from 'vscode';
import * as child from 'child_process';
import * as path from 'path';
import { unlinkSync, readdirSync, existsSync } from 'fs';
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
import { Output } from './output';
import {
  showErrorMessage,
  showInformationMessage,
  showWarningWithLink,
} from '../notification/notifications';

/**
 * Types of Trivy scans
 */
export enum ScanType {
  FilesystemScan = 'fs',
  ImageScan = 'image',
  GitScan = 'repository',
}

/**
 * Result of a Trivy execution
 */
interface ExecutionResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/**
 * Wrapper for executing Trivy commands and handling results
 */
export class TrivyWrapper {
  private readonly outputChannel = Output.getInstance();
  private running: boolean = false;

  // Stores whether the currently used version of Trivy
  // is installed and maintained by VSCode
  public vscodeTrivyInstall = false;

  /**
   * Creates a new instance of TrivyWrapper
   * @param resultsStoragePath Path where results will be stored
   */
  constructor(
    private readonly resultsStoragePath: string,
    private readonly extensionPath: string
  ) {}

  /**
   * Runs Trivy scan on all workspace folders
   * @param secrets Secret storage for API keys and tokens
   */
  async run(): Promise<void> {
    if (this.running) {
      return;
    }

    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('Running Trivy to update results');

    // Ensure Trivy is installed before continuing
    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return;
    }

    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      showErrorMessage('No workspace folders found');
      return;
    }

    // Clean up previous result files
    await this.cleanupPreviousResults();

    // Get the Trivy binary path
    const binary = this.getBinaryPath();

    // Set context to disable views during scanning
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.scanRunning',
      true
    );
    this.running = true;

    try {
      // Run scans for each workspace folder in sequence
      for (const workspaceFolder of workspaceFolders) {
        try {
          await this.scanWorkspaceFolder(workspaceFolder, binary);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.outputChannel.appendLine(
            `Error scanning workspace ${workspaceFolder.name}: ${errorMessage}`
          );
        }
      }

      // Indicate that scanning is complete
      showInformationMessage('Trivy scanning complete');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showErrorMessage(`Error running Trivy: ${errorMessage}`);
    } finally {
      // Reset context to re-enable views
      this.running = false;
      await vscode.commands.executeCommand(
        'setContext',
        'trivy.scanRunning',
        false
      );
    }
  }

  async isInstalled(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        const binary = this.getBinaryPath();
        child.execSync(`"${binary}" --help`, { stdio: 'ignore' });
        if (binary === `${this.extensionPath}/trivy`) {
          this.vscodeTrivyInstall = true;
        }
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Display the current Trivy version
   */
  async showCurrentTrivyVersion(): Promise<void> {
    try {
      const currentVersion = await this.getInstalledTrivyVersion();
      if (currentVersion) {
        showInformationMessage(
          `Extenion is using version ${currentVersion} of Trivy`,
          true
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showErrorMessage(`Failed to get Trivy version: ${errorMessage}`);
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
    binary: string
  ): Promise<void> {
    // Get configuration
    const config = vscode.workspace.getConfiguration('trivy');
    const isAquaPlatformRun = config.get<boolean>('useAquaPlatform');

    // Set up environment
    const env = { ...process.env };

    // Build command
    const workingPath = workspaceFolder.uri.fsPath;
    const command = this.buildCommand(workingPath, workspaceFolder.name);

    // Log the command (sensitive info is handled in updateEnvironment)
    this.outputChannel.appendLine(
      `Running command: ${binary} ${command.join(' ')}`
    );

    // Run the task with progress
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
  private async cleanupPreviousResults(): Promise<void> {
    try {
      if (!existsSync(this.resultsStoragePath)) {
        return;
      }

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
          this.outputChannel.appendLine(
            `Cleaned up previous result file: ${file}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.outputChannel.appendLine(
            `Error cleaning up file ${file}: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.outputChannel.appendLine(
        `Error cleaning up result files: ${errorMessage}`
      );
    }
  }

  /**
   * Get the path to the Trivy binary
   * @returns Path to the Trivy binary
   */
  private getBinaryPath(): string {
    const config = vscode.workspace.getConfiguration('trivy');
    const binary = config.get<string>('binaryPath', 'trivy') || 'trivy';
    return binary;
  }

  /**
   * Check if Trivy is installed and accessible
   * @returns true if Trivy is installed, false otherwise
   */
  private checkTrivyInstalled(): boolean {
    const binaryPath = this.getBinaryPath();

    try {
      child.execSync(`"${binaryPath}" --help`, { stdio: 'ignore' });
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
   * @returns Promise resolving to version string of the installed Trivy binary
   */
  async getInstalledTrivyVersion(): Promise<string> {
    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return '';
    }

    const binary = this.getBinaryPath();

    return new Promise<string>((resolve, reject) => {
      try {
        const process = child.exec(`"${binary}" --version`);
        let output = '';

        process.stdout?.on('data', (data) => {
          const result = data.toString();
          // remove the Version: label prefix
          if (result.includes('Version:')) {
            output = result.split(/\s/)[1].trim();
          } else {
            output = result;
          }
        });

        process.stderr?.on('data', (data) => {
          this.outputChannel.appendLine(`stderr: ${data.toString()}`);
        });

        process.on('exit', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(`Trivy exited with code ${code}`));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build the Trivy command
   * @param workingPath Path to scan
   * @param workspaceName Name of the workspace
   * @param scanType Type of scan to perform
   * @param trivyOptions Optional command options
   * @returns String array of command parts
   */
  buildCommand(
    workingPath: string,
    workspaceName: string,
    scanType: ScanType = ScanType.FilesystemScan,
    trivyOptions?: TrivyCommandOption[]
  ): string[] {
    const config = vscode.workspace.getConfiguration('trivy');
    let command: string[] = [scanType];

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
        location: vscode.ProgressLocation.Notification,
        title: `Running Trivy Scan${isAquaPlatformRun ? ' (Aqua Platform)' : ''}`,
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: 'Starting scan...' });

        return new Promise<void>((resolve, reject) => {
          let killed = false;
          let progressCounter = 0;
          const progressMax = 100;
          let currentPhase = 'Running';

          // Function to update progress bar
          const updateProgress = () => {
            progressCounter += 2;
            if (progressCounter > progressMax) {
              progressCounter = 0;
            }

            progress.report({
              increment: 2,
              message: `${currentPhase} (${Math.min(progressCounter, 100)}%)`,
            });
          };

          // Start progress update interval
          const progressInterval = setInterval(updateProgress, 400);

          // Spawn process
          const execution = child.spawn(binary, command, {
            cwd: workingPath,
            env,
            shell: process.platform === 'win32', // Use shell on Windows
          });

          // Handle cancellation
          token.onCancellationRequested(() => {
            killed = true;
            clearInterval(progressInterval);

            // Kill process and clean up streams
            execution.kill('SIGINT');
            try {
              execution.stdout?.destroy();
              execution.stderr?.destroy();
            } catch {
              // Ignore errors on stream destroy
            }

            this.outputChannel.appendLine('Trivy scan canceled by user');
            reject(new Error('Scan canceled by user'));
          });

          // Handle stdout
          execution.stdout.on('data', (data) => {
            const output = data.toString();
            this.outputChannel.appendLine(output);

            // Update progress based on output
            if (output.includes('Scanning')) {
              currentPhase = 'Scanning files';
              progress.report({ message: `${currentPhase}...` });
            } else if (output.includes('Analyzing')) {
              currentPhase = 'Analyzing dependencies';
              progress.report({ message: `${currentPhase}...` });
            } else if (output.includes('Detecting')) {
              currentPhase = 'Detecting vulnerabilities';
              progress.report({ message: `${currentPhase}...` });
            }
          });

          // Handle stderr
          execution.stderr.on('data', (data) => {
            this.outputChannel.appendLine(data.toString());
          });

          // Handle execution errors
          execution.on('error', (error) => {
            clearInterval(progressInterval);
            this.outputChannel.appendLine(`Execution error: ${error.message}`);
            reject(error);
          });

          // Handle process exit
          execution.on('exit', async (code) => {
            clearInterval(progressInterval);

            if (killed) {
              return; // Already handled by cancellation
            }

            if (code !== 0) {
              showWarningWithLink('Trivy failed to run.');
              reject(new Error(`Trivy failed with exit code ${code}`));
              return;
            }

            showInformationMessage('Trivy ran successfully, updating results');
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

  /**
   * Execute a simple Trivy command and return the result
   * @param args Command arguments
   * @returns Promise resolving to execution result
   */
  async executeCommand(args: string[]): Promise<ExecutionResult> {
    if (!this.checkTrivyInstalled()) {
      return {
        success: false,
        message: 'Trivy is not installed or not found in PATH',
        error: new Error('Trivy not installed'),
      };
    }

    const binary = this.getBinaryPath();
    const command = `"${binary}" ${args.join(' ')}`;

    try {
      const output = child.execSync(command, { encoding: 'utf-8' });
      return { success: true, message: output };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, message: error.message, error };
      }
      return {
        success: false,
        message: 'Unknown error',
        error: new Error('Unknown error'),
      };
    }
  }
}
