/* eslint-disable @typescript-eslint/no-explicit-any */

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TrivyHelpProvider } from './explorer/trivy_helpview';
import { TrivyTreeViewProvider } from './explorer/trivy_treeview';
import { TrivyWrapper } from './command/trivy';
import { execSync } from 'child_process';

export function runCommand(command: string, projectRootPath: string): string {
  try {
    return execSync(command + ' ' + projectRootPath).toString();
  } catch (result: any) {
    switch (result.status) {
      case 10: {
        vscode.window.showErrorMessage(
          'Trivy: Vulnerabilities found, check logs for details.'
        );
        return result.stdout.toString();
      }
      default: {
        vscode.window.showErrorMessage(
          'Failed to run Trivy scan, error: ' +
            result.status +
            ' check logs for details.'
        );
        return result.stdout.toString();
      }
    }
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "trivy-vulnerability-scanner" is now active!'
  );

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
  const issueTree = vscode.window.createTreeView('trivy.issueview', {
    treeDataProvider: misconfigProvider,
  });

  issueTree.onDidChangeSelection(function (event) {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem);
    }
  });

  const config = vscode.workspace.getConfiguration('trivy');
  context.subscriptions.push(issueTree);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('trivy.helpview', helpProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.scan', () => trivyWrapper.run())
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.version', () =>
      trivyWrapper.showCurrentTrivyVersion()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.refresh', () =>
      misconfigProvider.refresh()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.useIgnoreFile', () =>
      updateConfigAndContext(config, 'useIgnoreFile', true)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableUseIgnoreFile', () =>
      updateConfigAndContext(config, 'useIgnoreFile', false)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.setIgnoreFilePath', async () => {
      const ignoreFilePath = await vscode.window.showOpenDialog({
        openLabel: 'Select Ignore File',
        canSelectMany: false,

        filters: {
          'Ignore Files': ['.yaml', '*'],
        },
      });

      if (ignoreFilePath && ignoreFilePath.length > 0) {
        config.update('ignoreFilePath', ignoreFilePath[0]?.fsPath);
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.unsetIgnoreFilePath', async () => {
      config.update('ignoreFilePath', undefined);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.offlineScan', () =>
      updateConfigAndContext(config, 'offlineScan', true)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableOfflineScan', () =>
      updateConfigAndContext(config, 'offlineScan', false)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.scanForSecrets', () =>
      updateConfigAndContext(config, 'secretScanning', true)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableScanForSecrets', () =>
      updateConfigAndContext(config, 'secretScanning', false)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.onlyFixedIssues', () =>
      updateConfigAndContext(config, 'fixedOnly', true)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableOnlyFixedIssues', () =>
      updateConfigAndContext(config, 'fixedOnly', false)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.useConfigFile', () =>
      updateConfigAndContext(config, 'useConfigFile', true)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableUseConfigFile', () => {
      updateConfigAndContext(config, 'useConfigFile', false);
      updateConfigAndContext(config, 'onlyUseConfigFile', false);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.onlyUseConfigFile', () => {
      updateConfigAndContext(config, 'onlyUseConfigFile', true);
      updateConfigAndContext(config, 'useConfigFile', true);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.disableOnlyUseConfigFile', () =>
      updateConfigAndContext(config, 'onlyUseConfigFile', false)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.setConfigFilePath', async () => {
      const configFile = await vscode.window.showOpenDialog({
        openLabel: 'Select Trivy Config File',
        canSelectMany: false,

        filters: {
          'Ignore Files': ['*'],
        },
      });

      if (configFile && configFile.length > 0) {
        config.update('configFilePath', configFile[0]?.fsPath);
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy.unsetConfigFilePath', async () => {
      config.update('configFilePath', undefined);
    })
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

function updateConfigAndContext(
  config: vscode.WorkspaceConfiguration,
  key: string,
  value: string | boolean
) {
  config.update(key, value);
}

// this method is called when your extension is deactivated
export function deactivate() {}
