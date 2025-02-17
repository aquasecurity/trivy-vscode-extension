import * as vscode from 'vscode';
import { TrivyHelpProvider } from './explorer/helpview';
import { TrivyTreeViewProvider } from './explorer/treeview';
import { TrivyWrapper } from './command/command';
import { registerCommands } from './activate_commands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Trivy Scan');

  const projectRootPath = vscode.workspace.getWorkspaceFolder;
  if (projectRootPath === undefined) {
    vscode.window.showErrorMessage('Trivy: Must open a project file to scan.');
    return;
  }

  const helpProvider = new TrivyHelpProvider();
  const misconfigProvider = new TrivyTreeViewProvider(context);
  const trivyWrapper = new TrivyWrapper(
    outputChannel,
    misconfigProvider.resultsStoragePath
  );

  // creating the issue tree explicitly to allow access to events
  const issueTree = vscode.window.createTreeView('trivyIssueViewer', {
    treeDataProvider: misconfigProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('trivyHelpViewer', helpProvider)
  );

  issueTree.onDidChangeSelection(function (event) {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem);
    }
  });

  const config = vscode.workspace.getConfiguration('trivy');
  context.subscriptions.push(issueTree);
  registerCommands(context, trivyWrapper, misconfigProvider, config);

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
  ].forEach((key) => {
    vscode.commands.executeCommand(
      'setContext',
      `trivy.${key}`,
      config.get(key, false)
    );
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
export function deactivate() {}
