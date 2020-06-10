// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

export function runCommand(command: string, projectRootPath: string): string {
  var child_process = require("child_process");
  try {
    return child_process
      .execSync(command + " " + projectRootPath)
      .toString();
  } catch (result) {
    switch (result.status) {
      case 0: {
        vscode.window.showInformationMessage("Trivy: No vulnerabilities found.");
        return "";
      }
      case 10: {
        vscode.window.showErrorMessage("Trivy: Vulnerabilities found, check logs for details.");
        return result.stdout.toString();
      }
      default: {
        vscode.window.showErrorMessage(
          "Failed to run Trivy scan, error: " +
            result.status +
            " check logs for details."
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
  console.log('Congratulations, your extension "trivy-vulnerability-scanner" is now active!');

  var outputChannel = vscode.window.createOutputChannel("Trivy Scan");

  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    vscode.window.showErrorMessage("Trivy: Unable to find active window");
    return;
  }

  const projectRootPath = vscode.workspace.getWorkspaceFolder(
    editor.document.uri
  );

  if (projectRootPath === undefined) {
    vscode.window.showErrorMessage("Trivy: Unable to find project root path");
    return;
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("trivy-vulnerability-scanner.scan", () => {
    // The code you place here will be executed every time your command is executed

    const trivyCommand = "trivy filesystem --quiet --exit-code=10";
    var result = runCommand(trivyCommand, projectRootPath.uri.fsPath.toString());
    if (result.length > 0) {
      outputChannel.show(); // TODO: Un-comment if logs should automatically appear
      outputChannel.appendLine(result);
    }
    context.subscriptions.push(disposable);
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
