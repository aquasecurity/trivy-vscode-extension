// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TrivyHelpProvider } from './explorer/trivy_helpview';
import { TrivyTreeViewProvider } from './explorer/trivy_treeview';
import { TrivyWrapper } from './trivy_wrapper';

export function runCommand(command: string, projectRootPath: string): string {
  var child_process = require('child_process');
  try {
    return child_process.execSync(command + ' ' + projectRootPath).toString();
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

  var outputChannel = vscode.window.createOutputChannel('Trivy Scan');

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
  let issueTree = vscode.window.createTreeView('trivy.issueview', {
    treeDataProvider: misconfigProvider,
  });

  issueTree.onDidChangeSelection(function (event) {
    const treeItem = event.selection[0];
    if (treeItem) {
      helpProvider.update(treeItem);
    }
  });

  context.subscriptions.push(issueTree);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('trivy.helpview', helpProvider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'trivy-vulnerability-scanner.explorer-run',
      () => trivyWrapper.run()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy-vulnerability-scanner.version', () =>
      trivyWrapper.showCurrentTrivyVersion()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy-vulnerability-scanner.refresh', () =>
      misconfigProvider.refresh()
    )
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand('trivy-vulnerability-scanner.scan', () => {
      const trivyScanCmd =
        'trivy --quiet filesystem --security-checks config,vuln --exit-code=10';
      var scanResult = runCommand(trivyScanCmd, projectRootPath.toString());
      if (scanResult.length > 0) {
        outputChannel.show();
        outputChannel.appendLine(scanResult);
      } else {
        // return code is 0
        vscode.window.showInformationMessage(
          'Trivy: No vulnerabilities found.'
        );
      }
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
