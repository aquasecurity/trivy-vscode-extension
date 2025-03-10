/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { TrivyWrapper } from './command/command';
import { showErrorMessage } from './notification/notifications';
import { installTrivy } from './command/install';
import { TrivyTreeViewProvider } from './explorer/treeview';
import { TrivyHelpProvider } from './explorer/helpview';

/**
 * Command registration helper that adds proper typing and error handling
 * @param context Extension context
 * @param commandId The command ID to register
 * @param callback The function to execute when the command is called
 * @param errorMessage Optional error message to show if command fails
 */
function registerCommand<T extends (...args: any[]) => any>(
  context: vscode.ExtensionContext,
  commandId: string,
  callback: T,
  errorMessage?: string
): void {
  const wrappedCallback = async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | undefined> => {
    try {
      return (await callback(...args)) as ReturnType<T>;
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      showErrorMessage(
        errorMessage || `Failed to execute ${commandId}: ${error}`
      );
      return undefined;
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(commandId, wrappedCallback)
  );
}

/**
 * Opens a file picker dialog and updates configuration with selected path
 * @param config Workspace configuration
 * @param purpose Description of the file being selected
 * @param configKey Configuration key to update
 * @param extensions File extensions to filter for
 * @returns The selected file path or undefined if canceled
 */
async function selectFilePath(
  config: vscode.WorkspaceConfiguration,
  purpose: string,
  configKey: string,
  extensions: string[]
): Promise<string | undefined> {
  try {
    // Create a filter object with the file extensions
    const filters: { [key: string]: string[] } = {};
    if (extensions.length === 1 && extensions[0] === '*') {
      filters['All Files'] = ['*'];
    } else {
      filters['Supported Files'] = extensions;
    }

    const uris = await vscode.window.showOpenDialog({
      openLabel: `Select ${purpose}`,
      canSelectMany: false,
      filters,
    });

    if (uris && uris.length > 0 && uris[0]) {
      const filePath = uris[0].fsPath;
      await config.update(
        configKey,
        filePath,
        vscode.ConfigurationTarget.Workspace
      );
      return filePath;
    }
    return undefined;
  } catch (error) {
    showErrorMessage(`Failed to select ${purpose}: ${error}`);
    return undefined;
  }
}

/**
 * Updates a configuration value and sets the corresponding VS Code context
 * @param config Workspace configuration
 * @param key Configuration key to update
 * @param value Value to set
 * @param target Configuration target scope
 */
async function updateConfigAndContext(
  config: vscode.WorkspaceConfiguration,
  key: string,
  value: string | boolean,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
): Promise<void> {
  try {
    await config.update(key, value, target);
    await vscode.commands.executeCommand('setContext', `trivy.${key}`, value);
  } catch (error) {
    showErrorMessage(`Failed to update configuration ${key}: ${error}`);
  }
}

/**
 * Registers all commands for the Trivy extension
 * @param context Extension context
 * @param trivyWrapper Trivy command wrapper
 * @param findingsProvider Findings tree view provider
 * @param assuranceProvider Assurance tree view provider
 * @param helpProvider Help webview provider
 * @param config Workspace configuration
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  trivyWrapper: TrivyWrapper,
  findingsProvider: TrivyTreeViewProvider,
  helpProvider: TrivyHelpProvider,
  config: vscode.WorkspaceConfiguration
): void {
  // installation commands
  registerCommand(
    context,
    'trivy.install',
    async () => {
      await installTrivy(context.extensionPath);
    },
    'Failed to install Trivy'
  );

  registerCommand(
    context,
    'trivy.update',
    async () => {
      await installTrivy(context.extensionPath, true);
    },
    'Failed to install Trivy'
  );

  // Scanning commands
  registerCommand(
    context,
    'trivy.scan',
    () => trivyWrapper.run(),
    'Failed to run Trivy scan'
  );

  registerCommand(
    context,
    'trivy.version',
    () => trivyWrapper.showCurrentTrivyVersion(),
    'Failed to get Trivy version'
  );

  // Refresh and reset commands
  registerCommand(context, 'trivy.refresh', async () => {
    findingsProvider.refresh();
  });

  registerCommand(context, 'trivy.reset', async () => {
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.useAquaPlatform',
      false
    );

    findingsProvider.reset();
  });

  // Ignore file commands
  registerCommand(context, 'trivy.useIgnoreFile', async () => {
    await updateConfigAndContext(config, 'useIgnoreFile', true);
  });

  registerCommand(context, 'trivy.disableUseIgnoreFile', async () => {
    await updateConfigAndContext(config, 'useIgnoreFile', false);
  });

  registerCommand(context, 'trivy.setIgnoreFilePath', async () => {
    const filePath = await selectFilePath(
      config,
      'Ignore File',
      'ignoreFilePath',
      ['.yaml', '.yml', '.toml', '.json']
    );
    if (filePath) {
      await updateConfigAndContext(config, 'useIgnoreFile', true);
    }
  });

  registerCommand(context, 'trivy.unsetIgnoreFilePath', async () => {
    await config.update(
      'ignoreFilePath',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
    await updateConfigAndContext(config, 'useIgnoreFile', false);
  });

  // Scan mode commands
  registerCommand(context, 'trivy.offlineScan', async () => {
    await updateConfigAndContext(config, 'offlineScan', true);
  });

  registerCommand(context, 'trivy.disableOfflineScan', async () => {
    await updateConfigAndContext(config, 'offlineScan', false);
  });

  registerCommand(context, 'trivy.scanForSecrets', async () => {
    await updateConfigAndContext(config, 'secretScanning', true);
  });

  registerCommand(context, 'trivy.disableScanForSecrets', async () => {
    await updateConfigAndContext(config, 'secretScanning', false);
  });

  registerCommand(context, 'trivy.onlyFixedIssues', async () => {
    await updateConfigAndContext(config, 'fixedOnly', true);
  });

  registerCommand(context, 'trivy.disableOnlyFixedIssues', async () => {
    await updateConfigAndContext(config, 'fixedOnly', false);
  });

  // Config file commands
  registerCommand(context, 'trivy.useConfigFile', async () => {
    await updateConfigAndContext(config, 'useConfigFile', true);
  });

  registerCommand(context, 'trivy.setConfigFilePath', async () => {
    const filePath = await selectFilePath(
      config,
      'Config File',
      'configFilePath',
      ['.yaml', '.yml', '.toml', '.json']
    );
    if (filePath) {
      await updateConfigAndContext(config, 'useConfigFile', true);
    }
  });

  registerCommand(context, 'trivy.unsetConfigFilePath', async () => {
    await config.update(
      'configFilePath',
      undefined,
      vscode.ConfigurationTarget.Workspace
    );
  });

  registerCommand(context, 'trivy.disableUseConfigFile', async () => {
    await updateConfigAndContext(config, 'useConfigFile', false);
    await updateConfigAndContext(config, 'onlyUseConfigFile', false);
  });

  registerCommand(context, 'trivy.onlyUseConfigFile', async () => {
    await updateConfigAndContext(config, 'onlyUseConfigFile', true);
    await updateConfigAndContext(config, 'useConfigFile', true);
  });

  registerCommand(context, 'trivy.disableOnlyUseConfigFile', async () => {
    await updateConfigAndContext(config, 'onlyUseConfigFile', false);
  });
}
