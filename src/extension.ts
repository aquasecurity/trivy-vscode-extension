// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

interface TrivyVersion {
  Version: string;
}

export function runCommand(command: string, projectRootPath: string): string {
  var child_process = require("child_process");
  try {
    return child_process.execSync(command + " " + projectRootPath).toString();
  } catch (result) {
    switch (result.status) {
      case 10: {
        vscode.window.showErrorMessage(
          "Trivy: Vulnerabilities found, check logs for details."
        );
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
  console.log(
    'Congratulations, your extension "trivy-vulnerability-scanner" is now active!'
  );

  var outputChannel = vscode.window.createOutputChannel("Trivy Scan");

  const projectRootPath = vscode.workspace.rootPath;
  if (projectRootPath === undefined) {
    vscode.window.showErrorMessage("Trivy: Must open a project file to scan.");
    return;
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "trivy-vulnerability-scanner.scan",
    () => {
      // The code you place here will be executed every time your command is executed

      const trivyVersionCmd = "trivy --format=json --version";
      var version = runCommand(trivyVersionCmd, "").toString();

      // Check for ancient versions which don't support --format=json
      var result: TrivyVersion;
      try {
        result = JSON.parse(version);
      } catch (e) {
        vscode.window.showErrorMessage(
          "Unsupported Trivy version found." +
            " Please upgrade to v0.9.1 or higher."
        );
        return;
      }

      // Check for relatively old versions which support --format=json
      const ok = result.Version.match("\\d\\.[9]\\.\\d+|\\d\\.\\d{2,}\\.\\d+");
      console.log("ok: " + ok);
      if (ok === null) {
        vscode.window.showErrorMessage(
          "Trivy: Version " +
            result.Version +
            " is unsupported." +
            " Please upgrade to v0.9.1 or newer."
        );
        return;
      }

      const trivyScanCmd = "trivy filesystem --quiet --exit-code=10";
      var scanResult = runCommand(trivyScanCmd, projectRootPath.toString());
      if (scanResult.length > 0) {
        outputChannel.show();
        outputChannel.appendLine(scanResult);
      } else {
        // return code is 0
        vscode.window.showInformationMessage(
          "Trivy: No vulnerabilities found."
        );
      }
      context.subscriptions.push(disposable);
    }
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
