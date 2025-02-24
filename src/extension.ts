import * as vscode from 'vscode';
import { TrivyHelpProvider } from './explorer/helpview';
import { TrivyTreeViewProvider } from './explorer/treeview_provider';
import { TrivyWrapper } from './command/command';
import { registerCommands } from './activate_commands';
import { showErrorMessage } from './notification/notifications';

const disposables: vscode.Disposable[] = [];
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const projectRootPath = vscode.workspace.getWorkspaceFolder;
  if (projectRootPath === undefined) {
    showErrorMessage('Trivy: Must open a project file to scan.');
    return;
  }

  const diagnosticsCollection =
    vscode.languages.createDiagnosticCollection('trivy');
  context.subscriptions.push(diagnosticsCollection);

  const helpProvider = new TrivyHelpProvider();
  const findingProvider = new TrivyTreeViewProvider(context, diagnosticsCollection,  'finding');
  const assuranceProvider = new TrivyTreeViewProvider(context, diagnosticsCollection, 'policy');
  const trivyWrapper = new TrivyWrapper(findingProvider.resultsStoragePath);

  // creating the issue tree explicitly to allow access to events
  const findingTree = vscode.window.createTreeView('trivyIssueViewer', {
    treeDataProvider: findingProvider,
    showCollapseAll: true,
  });

  const assuranceTree = vscode.window.createTreeView('trivyAssuranceViewer', {
    treeDataProvider: assuranceProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('trivyHelpViewer', helpProvider)
  );

  findingTree.onDidChangeSelection(function (event) {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem, 'finding');
    }
  });

  assuranceTree.onDidChangeSelection(function (event) {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem, 'policy');
    }
  });

  const config = vscode.workspace.getConfiguration('trivy');
  context.subscriptions.push(findingTree);
  context.subscriptions.push(assuranceTree);
  registerCommands(
    context,
    trivyWrapper,
    findingProvider,
    assuranceProvider,
    helpProvider,
    config
  );

  // if the config changes externally, we need to ensure that the context used for menus
  // is updated to reflect this too
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('trivy')) {
      const config = vscode.workspace.getConfiguration('trivy');
      syncContextWithConfig(config);
    }
  });

  // on startup, we need to ensure that the context is synced correctly
  syncContextWithConfig(config);
}

function syncContextWithConfig(config: vscode.WorkspaceConfiguration) {
  [
    'useIgnoreFile',
    'offlineScan',
    'secretScanning',
    'fixedOnly',
    'onlyUseConfigFile',
    'useConfigFile',
    'useAquaPlatform',
  ].forEach((key) => {
    const configVal = config.get(key, false);
    vscode.commands.executeCommand('setContext', `trivy.${key}`, configVal);
  });

  ['ignoreFilePath', 'configFilePath'].forEach((key) => {
    vscode.commands.executeCommand(
      'setContext',
      `trivy.${key}`,
      config.get(key, '')
    );
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
  disposables.forEach((d) => d.dispose());
}
