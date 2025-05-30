import * as fs from 'fs';
import path from 'path';

import * as vscode from 'vscode';

import { registerCommands } from './activate_commands';
import { TrivyWrapper } from './command/command';
import { verifyTrivyInstallation } from './command/install';
import { Output } from './command/output';
import { VulnerabilityCodeLensProvider } from './ui/codelens_provider';
import { TrivyHelpProvider } from './ui/helpview/helpview';
import { showErrorMessage } from './ui/notification/notifications';
import { TrivyTreeViewProvider } from './ui/treeview/treeview_provider';

/**
 * Disposables to clean up when extension is deactivated
 */
const disposables: vscode.Disposable[] = [];

/**
 * Extension configuration keys to sync with VS Code context
 */
const CONFIG_BOOLEAN_KEYS = [
  'useIgnoreFile',
  'offlineScan',
  'vulnScanning',
  'misconfigScanning',
  'secretScanning',
  'packageJsonScanning',
  'gradleScanning',
  'dotnetProjScanning',
  'fixedOnly',
  'onlyUseConfigFile',
  'useConfigFile',
  'useAquaPlatform',
  'orderResultsByType',
];

/*
 * Extension entry point
 * @param context Extension context
 */
export async function activate(context: vscode.ExtensionContext) {
  try {
    await activateExtension(context);

    // Listen for workspace folder changes
    const workspaceFolderChangeDisposable =
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        Output.getInstance().appendLine('Workspace folder changed');
        // Clear the current diagnostics
        disposables.forEach((d) => {
          d.dispose();
        });

        context.subscriptions.forEach((d) => {
          d.dispose();
        });

        await activateExtension(context);
      });

    context.subscriptions.push(workspaceFolderChangeDisposable);
    disposables.push(workspaceFolderChangeDisposable);
  } catch (error) {
    showErrorMessage(`Failed to activate Trivy extension: ${error}`);
    console.error('Error activating Trivy extension:', error);
  }
}

async function activateExtension(context: vscode.ExtensionContext) {
  const projectRootPath = vscode.workspace.getWorkspaceFolder;
  if (projectRootPath === undefined) {
    showErrorMessage('Trivy: Must open a project file to scan.');
    return;
  }

  // ensure that there is a results storage path available
  let resultsStoragePath: string = '';

  if (context.storageUri) {
    const storagePath = context.storageUri.fsPath;
    console.log(`storage path is ${storagePath}`);

    try {
      await fs.promises.access(storagePath);
    } catch {
      await fs.promises.mkdir(storagePath, { recursive: true });
    }
    resultsStoragePath = path.join(storagePath, '/.trivy/');
    try {
      await fs.promises.access(resultsStoragePath);
    } catch {
      await fs.promises.mkdir(resultsStoragePath, { recursive: true });
    }

    // Check if the results storage path exists
    if (resultsStoragePath === '') {
      showErrorMessage(
        'Trivy: Unable to create results storage path. Please check your settings.'
      );
      return;
    }
  }
  // Initialize diagnostics collection
  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection('trivy');
  context.subscriptions.push(diagnosticsCollection);

  // Create providers
  const helpProvider = new TrivyHelpProvider();
  const misconfigProvider = new TrivyTreeViewProvider(context, 'finding');
  const assuranceProvider = new TrivyTreeViewProvider(context, 'policy');
  const trivyWrapper = new TrivyWrapper(
    resultsStoragePath,
    context.extensionPath
  );

  await registerViews(
    context,
    helpProvider,
    misconfigProvider,
    assuranceProvider,
    trivyWrapper
  );

  // Capture when the configuration changes
  // so that we can update the context accordingly
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
    (event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration('trivy')) {
        const config = vscode.workspace.getConfiguration('trivy');
        syncContextWithConfig(config);
        verifyTrivyInstallation(trivyWrapper);
      }
    }
  );
  context.subscriptions.push(configChangeDisposable);
  disposables.push(configChangeDisposable);

  // Set initial context and verify installation
  const config = vscode.workspace.getConfiguration('trivy');
  syncContextWithConfig(config);

  // verify if trivy is installed
  await verifyTrivyInstallation(trivyWrapper);

  // Add to your activation function in extension.ts
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file' },
      VulnerabilityCodeLensProvider.instance()
    )
  );

  vscode.commands.executeCommand('setContext', 'trivy.extensionLoaded', true);
  // Log successful activation
  console.log('Trivy extension activated');
}

/**
 * Registers all views and their event handlers, and create the treeviews
 * @param context Extension context
 * @param helpProvider Help view provider
 * @param misconfigProvider Findings tree view provider
 * @param assuranceProvider Assurance tree view provider
 * @param trivyWrapper Trivy command wrapper
 */
async function registerViews(
  context: vscode.ExtensionContext,
  helpProvider: TrivyHelpProvider,
  misconfigProvider: TrivyTreeViewProvider,
  assuranceProvider: TrivyTreeViewProvider,
  trivyWrapper: TrivyWrapper
): Promise<void> {
  // Register webview provider
  const webviewRegistration = vscode.window.registerWebviewViewProvider(
    'trivyHelpViewer',
    helpProvider
  );
  context.subscriptions.push(webviewRegistration);

  // Create tree views
  const findingTree = vscode.window.createTreeView('trivyIssueViewer', {
    treeDataProvider: misconfigProvider,
    showCollapseAll: true,
  });

  // Create assurance tree view
  const assuranceTree = vscode.window.createTreeView('trivyAssuranceViewer', {
    treeDataProvider: assuranceProvider,
    showCollapseAll: true,
  });

  // Register tree view selection handlers
  findingTree.onDidChangeSelection((event) => {
    const treeItem = event.selection[0];
    if (
      treeItem &&
      treeItem.collapsibleState === vscode.TreeItemCollapsibleState.None
    ) {
      helpProvider.update(treeItem, 'finding');
    } else {
      helpProvider.clear();
    }
  });

  // Register assurance tree view selection handlers
  assuranceTree.onDidChangeSelection((event) => {
    const treeItem = event.selection[0];
    if (
      treeItem &&
      treeItem.collapsibleState === vscode.TreeItemCollapsibleState.None
    ) {
      helpProvider.update(treeItem, 'policy');
    } else {
      helpProvider.clear();
    }
  });

  // Register trees as disposables
  context.subscriptions.push(findingTree);
  context.subscriptions.push(assuranceTree);
  disposables.push(findingTree);
  disposables.push(assuranceTree);

  // Register commands
  const config = vscode.workspace.getConfiguration('trivy');

  registerCommands(
    context,
    trivyWrapper,
    misconfigProvider,
    assuranceProvider,
    helpProvider,
    config
  );
}

/**
 * Syncs extension configuration with VS Code context
 * @param config Workspace configuration
 */
function syncContextWithConfig(config: vscode.WorkspaceConfiguration): void {
  // Sync boolean configuration values
  CONFIG_BOOLEAN_KEYS.forEach((key) => {
    const configVal = config.get<boolean>(key, false);
    vscode.commands.executeCommand('setContext', `trivy.${key}`, configVal);
  });

  // Update the version specific context
  const vscodeVersion = vscode.version;
  const majorVersion = parseInt(vscodeVersion.split('.')[0], 10);
  const minorVersion = parseInt(vscodeVersion.split('.')[1], 10);
  const mcpSupported = majorVersion >= 1 && minorVersion >= 99;
  // MCP Server support added in VS Code 1.99
  vscode.commands.executeCommand(
    'setContext',
    'trivy.mcpSupported',
    mcpSupported
  );
}

/**
 * Deactivation function called when extension is deactivated
 */
export function deactivate(): void {
  try {
    console.log('Deactivating Trivy extension');
    disposables.forEach((d) => {
      try {
        d.dispose();
      } catch (error) {
        console.error('Error disposing resource:', error);
      }
    });
  } catch (error) {
    console.error('Error deactivating Trivy extension:', error);
  }
}
