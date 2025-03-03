import * as vscode from 'vscode';
import { TrivyHelpProvider } from './explorer/helpview/helpview';
import { TrivyTreeViewProvider } from './explorer/treeview/treeview_provider';
import { TrivyWrapper } from './command/command';
import { registerCommands } from './activate_commands';
import { showErrorMessage } from './notification/notifications';

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
  'secretScanning',
  'fixedOnly',
  'onlyUseConfigFile',
  'useConfigFile',
  'useAquaPlatform',
];

const CONFIG_STRING_KEYS = ['ignoreFilePath', 'configFilePath'];

/**
 * Activation function called when extension is activated
 * @param context Extension context provided by VS Code
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    // Show walkthrough for first-time users
    if (context.globalState.get<boolean>('trivy.firstLaunch') !== true) {
      context.globalState.update('trivy.firstLaunch', true);
      vscode.commands.executeCommand(
        'workbench.action.openWalkthrough',
        'trivy.walkthrough'
      );
    }

    // Ensure we have a workspace to work with
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      showErrorMessage('Must open a project file to scan.');
      return;
    }

    // Initialize diagnostics collection
    const diagnosticsCollection =
      vscode.languages.createDiagnosticCollection('trivy');
    context.subscriptions.push(diagnosticsCollection);

    // Create providers
    const helpProvider = new TrivyHelpProvider();
    const findingProvider = new TrivyTreeViewProvider(
      context,
      diagnosticsCollection,
      'finding'
    );
    const assuranceProvider = new TrivyTreeViewProvider(
      context,
      diagnosticsCollection,
      'policy'
    );
    const trivyWrapper = new TrivyWrapper(findingProvider.resultsStoragePath);

    // Register views
    await registerViews(
      context,
      helpProvider,
      findingProvider,
      assuranceProvider,
      trivyWrapper
    );

    // Register config change handler
    const configChangeDisposable =
      vscode.workspace.onDidChangeConfiguration(handleConfigChange);
    context.subscriptions.push(configChangeDisposable);
    disposables.push(configChangeDisposable);

    // Set initial context and verify installation
    const config = vscode.workspace.getConfiguration('trivy');
    syncContextWithConfig(config);
    await verifyTrivyInstallation(config);

    // Log successful activation
    console.log('Trivy extension activated');
  } catch (error) {
    showErrorMessage(`Failed to activate Trivy extension: ${error}`);
    console.error('Error activating Trivy extension:', error);
  }
}

/**
 * Registers all views and their event handlers
 * @param context Extension context
 * @param helpProvider Help view provider
 * @param findingProvider Findings tree view provider
 * @param assuranceProvider Assurance tree view provider
 * @param trivyWrapper Trivy command wrapper
 */
async function registerViews(
  context: vscode.ExtensionContext,
  helpProvider: TrivyHelpProvider,
  findingProvider: TrivyTreeViewProvider,
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
    treeDataProvider: findingProvider,
    showCollapseAll: true,
  });

  const assuranceTree = vscode.window.createTreeView('trivyAssuranceViewer', {
    treeDataProvider: assuranceProvider,
    showCollapseAll: true,
  });

  // Register tree view selection handlers
  findingTree.onDidChangeSelection((event) => {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem, 'finding');
    }
  });

  assuranceTree.onDidChangeSelection((event) => {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem, 'policy');
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
    findingProvider,
    assuranceProvider,
    helpProvider,
    config
  );
}

/**
 * Handles configuration changes
 * @param event Configuration change event
 */
function handleConfigChange(event: vscode.ConfigurationChangeEvent): void {
  if (event.affectsConfiguration('trivy')) {
    const config = vscode.workspace.getConfiguration('trivy');
    syncContextWithConfig(config);
  }
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

  // Sync string configuration values
  CONFIG_STRING_KEYS.forEach((key) => {
    const configVal = config.get<string>(key, '');
    vscode.commands.executeCommand('setContext', `trivy.${key}`, configVal);
  });
}

/**
 * Verifies Trivy installation and sets context
 * @param config Workspace configuration
 */
async function verifyTrivyInstallation(
  config: vscode.WorkspaceConfiguration
): Promise<void> {
  try {
    const isInstalled = TrivyWrapper.checkIfInstalled(config);
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.installed',
      isInstalled
    );
  } catch (error) {
    console.error('Error verifying Trivy installation:', error);
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.installed',
      false
    );
    showErrorMessage(`Failed to verify Trivy installation: ${error}`);
  }
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
