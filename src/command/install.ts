import * as crypto from 'crypto';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { window } from 'vscode';
import * as vscode from 'vscode';

import { TrivyWrapper } from './command';
import { Output } from './output';

/**
 * Fetches the latest release tag from GitHub for the Trivy repository
 * @returns Promise resolving to the latest release tag (e.g. 'v0.37.3')
 */
export async function getLatestTrivyReleaseTag(): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/aquasecurity/trivy/releases/latest',
      headers: {
        'User-Agent': 'trivy-vscode-extension',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          if (release.tag_name) {
            // remove the v prefix from the tag name
            resolve(release.tag_name.replace(/^v/, ''));
          } else {
            reject(new Error('Could not find tag_name in GitHub API response'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse GitHub API response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to get latest Trivy release: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Gets the current OS and architecture in a format used by Trivy releases
 * @returns Object with os and arch properties
 */
function getPlatformInfo(): { os: string; arch: string } {
  // Get OS
  const platform = os.platform();
  let osName: string;

  switch (platform) {
    case 'win32':
      osName = 'windows';
      break;
    case 'darwin':
      osName = 'macOS';
      break;
    case 'linux':
      osName = 'Linux';
      break;
    default:
      throw new Error(`Unsupported operating system: ${platform}`);
  }

  // Get architecture
  const arch = os.arch();
  let archName: string;

  switch (arch) {
    case 'x64':
      archName = 'AMD64';
      break;
    case 'arm64':
      archName = 'ARM64';
      break;
    case 'arm':
      archName = 'ARM';
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { os: osName, arch: archName };
}

/**
 * Downloads a file from the given URL and saves it to the specified path
 * @param url URL to download the file from
 * @param destPath Path to save the downloaded file to
 * @returns Promise that resolves when the file has been downloaded
 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(url, {}, (response) => {
        if (response.statusCode === 302 && response.headers.location) {
          // Follow the redirect
          return downloadFile(response.headers.location, destPath)
            .then(resolve)
            .catch(reject);
        }

        const file = fs.createWriteStream(destPath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (error) => {
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download file: ${error.message}`));
      });
  });
}

/**
 * Uses the checksum file to to a sha256sum check on the downloaded file
 * @param checksumPath Path to the checksum file
 * @param filePath Path to the downloaded file
 * @returns Promise that resolves when the checksum has been verified
 */
function verifyChecksum(checksumPath: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const checksums = fs.readFileSync(checksumPath, 'utf8');
    const checksumLines = checksums.split('\n');

    for (const line of checksumLines) {
      const [checksum, filename] = line.split('  ');

      if (filename === path.basename(filePath)) {
        const fileData = fs.readFileSync(filePath);
        const sha256sum = crypto
          .createHash('sha256')
          .update(fileData)
          .digest('hex');

        if (checksum === sha256sum) {
          resolve();
        } else {
          reject(new Error(`Checksum verification failed for ${filePath}`));
        }

        return;
      }
    }

    reject(new Error(`Checksum not found for ${filePath}`));
  });
}

/**
 * Extracts a zip archive to the specified directory
 * @param archivePath Path to the zip archive
 * @param outputDir Directory to extract the zip archive to
 * @returns Promise that resolves when the zip archive has been extracted
 */
async function extractZip(archivePath: string, outputDir: string) {
  const zip = new AdmZip(archivePath);
  zip.extractEntryTo('trivy.exe', outputDir, false, true);
  console.log(`Extracted to ${outputDir}`);
}

/**
 * Extracts a tarball to the specified directory
 * @param archivePath Path to the tarball
 * @param outputDir Directory to extract the tarball to
 * @returns Promise that resolves when the tarball has been extracted
 */
async function extractTar(archivePath: string, outputDir: string) {
  await tar.x({
    file: archivePath,
    C: outputDir, // Output directory
    filter: (path) => path === 'trivy', // Only extract the trivy binary
  });
  console.log(`Extracted to ${outputDir}`);
}

/**
 * Installs Trivy by downloading the latest release from GitHub
 * @param extensionPath Path to the extension directory
 * @param updating If true, the installation is an update
 */
export async function installTrivy(
  extensionPath: string,
  updating = false
): Promise<void> {
  const action = updating ? 'Updating' : 'Installing';

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `${action} Trivy`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 0, message: `${action} Trivy` });
      try {
        Output.show();
        const output = Output.getInstance();
        output.appendSection(`${action} Trivy`);

        progress.report({ increment: 10, message: 'Fetching latest release' });

        // get the latest release from github releases page
        const latestReleaseTag = await getLatestTrivyReleaseTag();
        output.appendLine(`Latest release tag: ${latestReleaseTag}`);

        // get the OS and arch
        const { os: osName, arch } = getPlatformInfo();
        output.appendLine(`Detected OS: ${osName}, Arch: ${arch}`);

        const suffix = osName === 'windows' ? '.zip' : '.tar.gz';

        // Construct download URL for Trivy and the checksum file
        // Example URL format: https://github.com/aquasecurity/trivy/releases/download/v0.60.0/trivy_0.60.0_macOS-ARM64.tar.gz
        // const downloadUrl = `https://github.com/aquasecurity/trivy/releases/download/v${latestReleaseTag}/trivy_${latestReleaseTag}_${osName}-${arch}${suffix}`;
        const downloadUrl = `https://get.trivy.dev/trivy?os=${osName.toLowerCase()}&arch=${arch.toLowerCase()}&type=${suffix === '.zip' ? 'zip' : 'tar.gz'}`;
        const checksumUrl = `https://github.com/aquasecurity/trivy/releases/download/v${latestReleaseTag}/trivy_${latestReleaseTag}_checksums.txt`;

        // download the files to a temporary directory
        const tempDir = os.tmpdir();
        const trivyDownloadDir = `${tempDir}/trivy-download`;
        output.appendLine(`Creating temporary directory ${trivyDownloadDir}`);
        fs.mkdirSync(trivyDownloadDir, { recursive: true });

        const trivyDownloadPath = `${trivyDownloadDir}/trivy_${latestReleaseTag}_${osName}-${arch}${suffix}`;
        const checksumDownloadPath = `${trivyDownloadDir}/checksums.txt`;

        // download the tarball and checksum
        // NOTE: chained function calls are async/await to preserve the progress report
        // when they are called sequentially without await, the progress notification is closer
        // before the process completes
        output.appendLine(`Downloading Trivy from ${downloadUrl}`);
        progress.report({ increment: 20, message: 'Downloading Trivy' });
        await downloadFile(downloadUrl, trivyDownloadPath)
          .then(async () => {
            output.appendLine(`Downloading of Trivy completed`);
            output.appendLine(`Downloading checksum from ${checksumUrl}`);
            progress.report({ increment: 40, message: 'Downloading checksum' });
            await downloadFile(checksumUrl, checksumDownloadPath)
              .then(async () => {
                output.appendLine(`Download of checksum completed`);
                output.appendLine(`Verifying checksum`);
                progress.report({
                  increment: 60,
                  message: 'Verifying checksum',
                });
                await verifyChecksum(checksumDownloadPath, trivyDownloadPath)
                  .then(async () => {
                    output.appendLine(`Checksum verification successful`);
                    output.appendLine(
                      `${action} Trivy to Extension directory ${extensionPath}`
                    );
                    progress.report({
                      increment: 80,
                      message: `${action} Trivy`,
                    });
                    const trivyInstallDir = `${extensionPath}`;
                    fs.mkdirSync(trivyInstallDir, { recursive: true });
                    // untar the downloaded file
                    output.appendLine(`Extracting Trivy to ${trivyInstallDir}`);
                    if (osName === 'windows') {
                      // extract zip file
                      await extractZip(trivyDownloadPath, trivyInstallDir)
                        .then(async () => {
                          output.appendLine(
                            `Trivy has been installed to ${trivyInstallDir}`
                          );
                          output.appendLine(
                            `Cleaning up temporary directory ${trivyDownloadDir}`
                          );
                          fs.rmdirSync(trivyDownloadDir, { recursive: true });
                          output.appendLine(
                            `Setting path to Trivy in the config`
                          );
                          const config =
                            vscode.workspace.getConfiguration('trivy');
                          config.update(
                            'binaryPath',
                            `${trivyInstallDir}/trivy.exe`,
                            true
                          );
                          vscode.commands.executeCommand(
                            'setContext',
                            'trivy.installed',
                            true
                          );
                          vscode.commands.executeCommand(
                            'setContext',
                            'trivy.isLatest',
                            true
                          );
                          window.showInformationMessage(
                            'Trivy has been installed'
                          );
                          progress.report({ increment: 100, message: 'Done' });
                        })
                        .catch((error) => {
                          output.appendLine(
                            `Failed to extract Trivy: ${error.message}`
                          );
                          throw new Error(
                            `Failed to extract Trivy: ${error.message}`
                          );
                        });
                    } else {
                      await extractTar(trivyDownloadPath, trivyInstallDir)
                        .then(async () => {
                          output.appendLine(
                            `Trivy has been installed to ${trivyInstallDir}`
                          );
                          output.appendLine(
                            `Cleaning up temporary directory ${trivyDownloadDir}`
                          );
                          fs.rmdirSync(trivyDownloadDir, { recursive: true });
                          output.appendLine(
                            `Setting path to Trivy in the config`
                          );
                          const config =
                            vscode.workspace.getConfiguration('trivy');
                          config.update(
                            'binaryPath',
                            `${trivyInstallDir}/trivy`,
                            true
                          );
                          vscode.commands.executeCommand(
                            'setContext',
                            'trivy.installed',
                            true
                          );
                          vscode.commands.executeCommand(
                            'setContext',
                            'trivy.isLatest',
                            true
                          );
                          window.showInformationMessage(
                            'Trivy has been installed'
                          );
                          progress.report({ increment: 100, message: 'Done' });
                        })
                        .catch((error) => {
                          output.appendLine(
                            `Failed to extract Trivy: ${error.message}`
                          );
                          throw new Error(
                            `Failed to extract Trivy: ${error.message}`
                          );
                        });
                    }
                  })
                  .catch((error) => {
                    output.appendLine(
                      `Checksum verification failed: ${error.message}`
                    );
                    throw new Error(
                      `Checksum verification failed: ${error.message}`
                    );
                  });
              })
              .catch((error) => {
                output.appendLine(
                  `Failed to download checksum file: ${error.message}`
                );
                throw new Error(
                  `Failed to download checksum file: ${error.message}`
                );
              });
          })
          .catch((error) => {
            output.appendLine(`Failed to download Trivy: ${error.message}`);
            throw new Error(`Failed to download Trivy: ${error.message}`);
          });
      } catch (error) {
        if (error instanceof Error) {
          window.showErrorMessage(`Failed to install Trivy: ${error.message}`);
        } else {
          window.showErrorMessage('Failed to install Trivy');
        }
      }
    }
  );
}

/**
 * Verifies Trivy installation and sets context
 * @param config Workspace configuration
 */
export async function verifyTrivyInstallation(
  trivyWrapper: TrivyWrapper
): Promise<void> {
  try {
    trivyWrapper.isInstalled().then((isInstalled) => {
      vscode.commands.executeCommand(
        'setContext',
        'trivy.installed',
        isInstalled
      );
      // now check if the installed version
      if (trivyWrapper.vscodeTrivyInstall) {
        // if trivy is installed, check the version
        trivyWrapper.getInstalledTrivyVersion().then((version) => {
          getLatestTrivyReleaseTag().then((latestVersion) => {
            const isLatest = version === latestVersion;
            vscode.commands.executeCommand(
              'setContext',
              'trivy.isLatest',
              isLatest
            );
            if (!isLatest) {
              vscode.window
                .showInformationMessage(
                  `You're currently using ${version}, you should update Trivy to ${latestVersion}`,
                  'Update'
                )
                .then((action) => {
                  if (action === 'Update') {
                    vscode.commands.executeCommand('trivy.update');
                  }
                });
            }
          });
        });
      }
    });
  } catch (error) {
    console.error('Error verifying Trivy installation:', error);
  }
}
