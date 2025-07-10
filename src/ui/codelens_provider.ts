import path from 'path';

import * as vscode from 'vscode';

import { TrivyResult, Vulnerability } from '../cache/result';

/**
 * CodeLens provider for indirect vulnerabilities
 */
export class CodeLensProvider implements vscode.CodeLensProvider {
  // create singleton instance
  private static _instance: CodeLensProvider | undefined;
  public static instance(): CodeLensProvider {
    if (!this._instance) {
      this._instance = new CodeLensProvider();
    }
    return this._instance;
  }

  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  private results: TrivyResult[] = [];

  private constructor() {
    // Watch for configuration changes that might affect CodeLens
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  /**
   * Update the vulnerability results to display in CodeLens
   * @param results The vulnerability results
   */
  public updateResults(results: TrivyResult[]): void {
    this.results = results;
    this._onDidChangeCodeLenses.fire();
  }

  /**
   * Provide CodeLens for indirect vulnerabilities
   * @param document The document to provide CodeLens for
   * @returns An array of CodeLens
   */
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const filePath = document.uri.fsPath;

    // Find results matching this file
    const fileResults = this.results.filter((result) => {
      // Get the workspace folder for this document
      const wsFolder = vscode.workspace.workspaceFolders?.find(
        (ws) => ws.name === result.workspaceName
      );

      if (!wsFolder) {
        return false;
      }

      // Check if this result's file path matches the current document
      const resultPath = result.filename;
      const fullResultPath =
        path.resolve(wsFolder.uri.fsPath, resultPath) === filePath;

      return fullResultPath;
    });

    // Group results by line number to handle multiple issues on the same line
    const resultsByLine = new Map<number, TrivyResult[]>();
    for (const result of fileResults) {
      const lineNumber = result.startLine - 1;
      if (!resultsByLine.has(lineNumber)) {
        resultsByLine.set(lineNumber, []);
      }
      resultsByLine.get(lineNumber)!.push(result);
    }

    // Create CodeLens for each line, stacking multiple results vertically
    for (const [lineNumber, results] of resultsByLine) {
      results.forEach((result, index) => {
        let title = `⚠️ ${result.id ? result.id + ' - ' : ''}${result.title}`;

        if (result.extraData instanceof Vulnerability) {
          title = `ℹ️ ${result.id} in ${result.extraData.pkgName}@${result.extraData.installedVersion} ${result.extraData.rootPackage ? 'introduced by ' + result.extraData.rootPackage : ''} - ${result.title}`;
        }

        // Use different character positions to stack CodeLens entries vertically
        const range = new vscode.Range(
          new vscode.Position(lineNumber, index),
          new vscode.Position(lineNumber, index)
        );

        const command: vscode.Command = {
          title: title,
          command: 'trivy.revealTreeItem',
          arguments: [result],
        };

        codeLenses.push(new vscode.CodeLens(range, command));
      });
    }

    return codeLenses;
  }
}
