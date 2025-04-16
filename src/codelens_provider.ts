import path from 'path';

import * as vscode from 'vscode';

import { TrivyResult, Vulnerability } from './explorer/result';

/**
 * CodeLens provider for indirect vulnerabilities
 */
export class VulnerabilityCodeLensProvider implements vscode.CodeLensProvider {
  // create singleton instance
  private static _instance: VulnerabilityCodeLensProvider | undefined;
  public static instance(): VulnerabilityCodeLensProvider {
    if (!this._instance) {
      this._instance = new VulnerabilityCodeLensProvider();
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

    // Create a CodeLens for each indirect vulnerability
    for (const result of fileResults) {
      if (
        result.extraData instanceof Vulnerability &&
        result.extraData.indirect
      ) {
        const range = new vscode.Range(
          new vscode.Position(result.startLine - 1, 0),
          new vscode.Position(result.startLine - 1, 0)
        );

        const command: vscode.Command = {
          title: `ℹ️ ${result.id} in ${result.extraData.pkgName}@${result.extraData.installedVersion} introduced by ${result.extraData.rootPackage}`,
          command: '',
          arguments: [result],
        };

        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }

    return codeLenses;
  }
}
