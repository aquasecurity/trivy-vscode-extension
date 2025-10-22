/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';

import { TrivyWrapper } from './command/command';
import { installTrivy } from './command/install';
import { setupCommercial } from './commercial/setup';
import { addIgnoreFileEntry } from './ignore/ignore_file';
import { addMCPCodePrompt, installTrivyMCPServer } from './mcp/install';
import { TrivyHelpProvider } from './ui/helpview/helpview';
import { showErrorMessage } from './ui/notification/notifications';
import { TrivyTreeItem } from './ui/treeview/treeitem';
import { TrivyTreeViewProvider } from './ui/treeview/treeview_provider';

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
  misconfigProvider: TrivyTreeViewProvider,
  assuranceProvider: TrivyTreeViewProvider,
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

  registerCommand(
    context,
    'trivy.installMcpServer',
    async () => {
      await installTrivyMCPServer();
    },
    'Failed to install Trivy MCP server'
  );

  registerCommand(context, 'trivy.mcpAddCodePrompt', async () => {
    await addMCPCodePrompt();
  });

  // Scanning commands
  registerCommand(
    context,
    'trivy.scan',
    () => {
      misconfigProvider.reset();
      assuranceProvider.reset();
      helpProvider.clear();
      trivyWrapper.run(context.secrets);
    },
    'Failed to run Trivy scan'
  );

  registerCommand(
    context,
    'trivy.version',
    () => trivyWrapper.showCurrentTrivyVersion(),
    'Failed to get Trivy version'
  );
  registerCommand(
    context,
    'trivy.updateAquaPlugin',
    () => trivyWrapper.updateAquaPlugin(),
    'Failed to update aqua plugin'
  );
  registerCommand(context, 'trivy.refresh', () => {
    misconfigProvider.refresh();
    assuranceProvider.refresh();
  });
  registerCommand(context, 'trivy.reset', () => {
    misconfigProvider.reset();
    assuranceProvider.reset();
    helpProvider.clear();
  });
  registerCommand(context, 'trivy.useIgnoreFile', () =>
    updateConfigAndContext(config, 'useIgnoreFile', true)
  );
  registerCommand(context, 'trivy.disableUseIgnoreFile', () =>
    updateConfigAndContext(config, 'useIgnoreFile', false)
  );
  registerCommand(context, 'trivy.unsetIgnoreFilePath', () =>
    config.update('ignoreFilePath', undefined)
  );
  registerCommand(context, 'trivy.offlineScan', () =>
    updateConfigAndContext(config, 'offlineScan', true)
  );
  registerCommand(context, 'trivy.disableOfflineScan', () =>
    updateConfigAndContext(config, 'offlineScan', false)
  );
  registerCommand(context, 'trivy.scanForVulns', () =>
    updateConfigAndContext(config, 'vulnScanning', true)
  );
  registerCommand(context, 'trivy.disableScanForVulns', () =>
    updateConfigAndContext(config, 'vulnScanning', false)
  );
  registerCommand(context, 'trivy.scanForMisconfigs', () =>
    updateConfigAndContext(config, 'misconfigScanning', true)
  );
  registerCommand(context, 'trivy.disableScanForMisconfigs', () =>
    updateConfigAndContext(config, 'misconfigScanning', false)
  );
  registerCommand(context, 'trivy.scanForSecrets', () =>
    updateConfigAndContext(config, 'secretScanning', true)
  );
  registerCommand(context, 'trivy.disableScanForSecrets', () =>
    updateConfigAndContext(config, 'secretScanning', false)
  );
  registerCommand(context, 'trivy.setPackageJsonScanning', () =>
    updateConfigAndContext(config, 'packageJsonScanning', true)
  );
  registerCommand(context, 'trivy.disablePackageJsonScanning', () =>
    updateConfigAndContext(config, 'packageJsonScanning', false)
  );
  registerCommand(context, 'trivy.setGradleScanning', () =>
    updateConfigAndContext(config, 'gradleScanning', true)
  );
  registerCommand(context, 'trivy.disableGradleScanning', () =>
    updateConfigAndContext(config, 'gradleScanning', false)
  );
  registerCommand(context, 'trivy.setDotnetProjScanning', () =>
    updateConfigAndContext(config, 'dotnetProjScanning', true)
  );
  registerCommand(context, 'trivy.disableDotnetProjScanning', () =>
    updateConfigAndContext(config, 'dotnetProjScanning', false)
  );
  registerCommand(context, 'trivy.setSastScanning', () =>
    updateConfigAndContext(config, 'sastScanning', true)
  );
  registerCommand(context, 'trivy.disableSastScanning', () =>
    updateConfigAndContext(config, 'sastScanning', false)
  );
  registerCommand(context, 'trivy.onlyFixedIssues', () =>
    updateConfigAndContext(config, 'fixedOnly', true)
  );
  registerCommand(context, 'trivy.disableOnlyFixedIssues', () =>
    updateConfigAndContext(config, 'fixedOnly', false)
  );
  registerCommand(context, 'trivy.useConfigFile', () =>
    updateConfigAndContext(config, 'useConfigFile', true)
  );
  registerCommand(context, 'trivy.unsetConfigFilePath', () =>
    config.update('configFilePath', undefined)
  );
  registerCommand(context, 'trivy.disableUseConfigFile', () => {
    updateConfigAndContext(config, 'useConfigFile', false);
    updateConfigAndContext(config, 'onlyUseConfigFile', false);
  });

  registerCommand(context, 'trivy.onlyUseConfigFile', async () => {
    updateConfigAndContext(config, 'onlyUseConfigFile', true);
    updateConfigAndContext(config, 'useConfigFile', true);
  });
  registerCommand(context, 'trivy.setConfigFilePath', async () => {
    await selectFilePath(config, 'Config file', 'configFilePath', ['*']);
  });
  registerCommand(context, 'trivy.setIgnoreFilePath', async () => {
    await selectFilePath(config, 'Ignore file', 'ignoreFilePath', ['*']);
  });
  registerCommand(context, 'trivy.setupCommercial', async () => {
    await setupCommercial(context);
  });
  registerCommand(context, 'trivy.setOrderResultsByType', async () => {
    await updateConfigAndContext(
      config,
      'orderResultsByType',
      true,
      vscode.ConfigurationTarget.Global
    );
    misconfigProvider.refresh();
    assuranceProvider.refresh();
  });
  registerCommand(context, 'trivy.unsetOrderResultsByType', async () => {
    await updateConfigAndContext(
      config,
      'orderResultsByType',
      false,
      vscode.ConfigurationTarget.Global
    );
    misconfigProvider.refresh();
    assuranceProvider.refresh();
  });
  registerCommand(
    context,
    'trivy.addToIgnoreFile',
    async (item: TrivyTreeItem) => {
      addIgnoreFileEntry(item);
    }
  );
}
