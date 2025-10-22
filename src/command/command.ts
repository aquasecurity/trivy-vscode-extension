import * as child from 'child_process';
import { unlinkSync, readdirSync, existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as vscode from 'vscode';

import { loader } from '../cache/loader';
import { updateEnvironment } from '../commercial/env';
import {
  showErrorMessage,
  showInformationMessage,
  showWarningWithLink,
} from '../ui/notification/notifications';
import { stripAnsiEscapeCodes } from '../utils';

import {
  ConfigFilePathOption,
  DebugOption,
  ExitCodeOption,
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

/**
 * Types of Trivy scans
 */
export enum ScanType {
  FilesystemScan = 'fs',
  ImageScan = 'image',
  GitScan = 'repository',
}

const phaseMap: Record<string, { phase: string; increment: number }> = {
  '[vulndb]': {
    phase: 'Downloading vulnerability database',
    increment: 1,
  },
  'Installing the plugin': {
    phase: 'Installing the plugin',
    increment: 1,
  },
  'Vulnerability scanning is enabled': {
    phase: 'Scanning for vulnerabilities',
    increment: 4,
  },
  'Secret scanning is enabled': {
    phase: 'Scanning for secrets...',
    increment: 4,
  },
  'Misconfiguration scanning is enabled': {
    phase: 'Scanning for misconfigurations...',
    increment: 4,
  },
  'context=trivy-plugin': {
    phase: 'Preparing scan...',
    increment: 1,
  },
  'Detected config files': {
    phase: 'Processing results...',
    increment: 1,
  },
  'Detecting vulnerabilities': {
    phase: 'Scanning...',
    increment: 1,
  },
  'Scanning root module': {
    phase: 'Scanning...',
    increment: 1,
  },
  'Scanning SAST': {
    phase: 'Scanning...',
    increment: 1,
  },
};

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
  async run(secrets: vscode.SecretStorage): Promise<void> {
    try {
      if (this.running) {
        return;
      }
      this.running = true;
      // Set context to disable views during scanning
      await vscode.commands.executeCommand(
        'setContext',
        'trivy.scanRunning',
        true
      );

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

      // Run scans for each workspace folder in sequence
      for (const workspaceFolder of workspaceFolders) {
        try {
          await this.scanWorkspaceFolder(workspaceFolder, binary, secrets);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.outputChannel.appendLine(
            `Error scanning workspace ${workspaceFolder.name}: ${errorMessage}`
          );
        }
      }

      // Use a slight delay to ensure files are written before refreshing
      setTimeout(() => {
        vscode.commands.executeCommand('trivy.refresh');
      }, 50);

      // Indicate that scanning is complete
      showInformationMessage('Trivy scanning complete');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showErrorMessage(`Error running Trivy: ${errorMessage}`);
    } finally {
      // Reset context to re-enable views
      this.running = false;

      setTimeout(
        async () =>
          await vscode.commands.executeCommand(
            'setContext',
            'trivy.scanRunning',
            false
          ),
        500
      );
    }
  }

  /**
   * Check if Trivy is installed
   * @returns Promise resolving to true if installed, false otherwise
   */
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
   * Update the Aqua Platform plugin
   */
  async updateAquaPlugin(): Promise<void> {
    try {
      await this.updateAquaPluginVersion();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showErrorMessage(`Failed to update aqua plugin: ${errorMessage}`);
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
    // Get configuration
    const config = vscode.workspace.getConfiguration('trivy');
    const isAquaPlatformRun = config.get<boolean>('useAquaPlatform');

    // Set up environment
    let env = { ...process.env };
    const workspaceName = workspaceFolder.name;
    let assuranceReportPath = '';

    if (isAquaPlatformRun) {
      assuranceReportPath = path.join(
        this.resultsStoragePath,
        `assurance.json`
      );
      env = await updateEnvironment(config, secrets, env, assuranceReportPath);
    }

    const suffix = isAquaPlatformRun ? '.dump' : '';

    const resultsPath = path.join(
      this.resultsStoragePath,
      `${workspaceName}_results.json${suffix}`
    );

    // Build command
    const workingPath = workspaceFolder.uri.fsPath;
    const command = this.buildCommand(
      workingPath,
      workspaceFolder.name,
      resultsPath
    );

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
    ).then(async () => {
      await loader(
        workspaceName,
        resultsPath,
        isAquaPlatformRun ? assuranceReportPath : undefined
      );
    });
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
   * Update the Aqua Platform plugin version
   * @returns Promise resolving when the update is complete
   */
  async updateAquaPluginVersion() {
    if (!this.checkTrivyInstalled()) {
      showErrorMessage('Trivy could not be found, check Output window');
      return;
    }

    const binary = this.getBinaryPath();

    return new Promise<string>((resolve, reject) => {
      this.outputChannel.getOutputChannel().show(true);
      try {
        const process = child.exec(`"${binary}" plugin upgrade aqua`);

        process.stdout?.on('data', (data) => {
          this.outputChannel.appendLine(`${data.toString()}`);
        });

        process.stderr?.on('data', (data) => {
          this.outputChannel.appendLine(`${data.toString()}`);
          const result = data.toString();
          if (result.includes('Plugin upgraded')) {
            showInformationMessage(
              'Aqua Platform plugin upgraded successfully'
            );
            resolve('');
          } else if (result.includes('The plugin is up-to-date')) {
            showInformationMessage(
              'Aqua Platform plugin is already up-to-date'
            );
            resolve('');
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
    resultsPath: string,
    scanType: ScanType = ScanType.FilesystemScan,
    trivyOptions?: TrivyCommandOption[]
  ): string[] {
    const config = vscode.workspace.getConfiguration('trivy');
    let command: string[] = [scanType];

    if (!trivyOptions) {
      trivyOptions = [
        new ScannersOption(),
        new ConfigFilePathOption(),
        new RequiredSeveritiesOption(),
        new OfflineScanOption(),
        new FixedOnlyOption(),
        new IgnoreFilePathOption(),
        new DebugOption(),
        new ExitCodeOption(0),
        new JSONFormatOption(),
        new ResultsOutputOption(resultsPath),
      ];
    }

    // Apply command options
    for (const option of trivyOptions) {
      command = option.apply(command, config);
    }

    command.push(`.`);

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
        title: isAquaPlatformRun
          ? 'Running Aqua Platform Scan'
          : 'Running Trivy Scan',
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({ increment: 0, message: 'Starting scan...' });

        return new Promise<void>((resolve, reject) => {
          let killed = false;
          let progressCounter = 0;
          let progressIncrement = 1;
          const progressMax = 100;
          let currentPhase = 'Running';

          const handleOutput = (data: string) => {
            const output = stripAnsiEscapeCodes(data);
            for (const [key, value] of Object.entries(phaseMap)) {
              if (output.includes(key)) {
                currentPhase = value.phase;
                progressIncrement = value.increment;
                break; // Exit loop after first match}
              }
            }
          };

          // Function to update progress bar
          const updateProgress = () => {
            if (progressCounter <= progressMax) {
              // The threshold was changed from 50 to 75 based on observed scan behavior.
              // At 75%, scans tend to slow down significantly, so we adjust the increment to avoid overshooting progress.
              if (progressCounter === 75 && progressIncrement === 1) {
                // what we have here is a slow start, so let's slow things down a bit
                progressIncrement = 0;

                // Fallback mechanism to ensure progress continues
                setTimeout(() => {
                  if (progressIncrement === 0) {
                    progressIncrement = 1; // Resume with a smaller increment
                  }
                }, 10000); // Wait for 10 seconds before applying the fallback
              }
              progressCounter += progressIncrement;
            }

            progress.report({
              increment: progressIncrement,
              message: `${currentPhase} (${Math.min(progressCounter, 100)}%)`,
            });
          };

          // Start progress update interval
          const progressInterval = setInterval(updateProgress, 600);

          // Spawn process
          const execution = child.spawn(binary, command, {
            cwd: workingPath,
            env,
            shell: os.platform() !== 'darwin',
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
            handleOutput(output);
          });

          // Handle stderr
          execution.stderr.on('data', (data) => {
            const output = data.toString();
            this.outputChannel.appendLine(output);
            handleOutput(output);
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

            // if not a clean exit or an assurance policy failure (code 13)
            if (code !== 0 && code !== 13) {
              showWarningWithLink('Trivy failed to run.');
              reject(new Error(`Trivy failed with exit code ${code}`));
              return;
            }

            showInformationMessage('Trivy ran successfully, updating results');
            this.outputChannel.appendLine(
              'Reloading the Findings Explorer content'
            );

            resolve();
          });
        });
      }
    );
  }
}
