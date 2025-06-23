import path from 'path';

import * as vscode from 'vscode';

import { TrivyResult } from '../../cache/result';

export class Problems {
  public static instance: Problems = new Problems();
  private diagnosticsCollection: vscode.DiagnosticCollection;

  private constructor() {
    // Private constructor to prevent instantiation
    this.diagnosticsCollection =
      vscode.languages.createDiagnosticCollection('trivy');
  }

  public clearProblems() {
    this.diagnosticsCollection.clear();
  }

  public updateProblems(trivyResults: TrivyResult[]) {
    //always clear problems before updating
    this.clearProblems();
    if (trivyResults.length === 0) {
      return;
    }

    // group by file
    const fileDiagnostics = new Map<string, TrivyResult[]>();
    trivyResults.forEach((item) => {
      if (!fileDiagnostics.has(item.filename)) {
        fileDiagnostics.set(item.filename, []);
      }
      fileDiagnostics.get(item.filename)?.push(item);
    });

    fileDiagnostics.forEach((results, file) => {
      this.updateFileProblems(file, results);
    });
  }

  private updateFileProblems(file: string, trivyResults: TrivyResult[]) {
    const fileDiagnostics = new Map<string, vscode.Diagnostic[]>();
    if (trivyResults.length === 0) {
      return;
    }

    trivyResults.forEach((item) => {
      try {
        const startLine = Math.max(item.startLine, 1);
        const endLine = Math.max(item.endLine, 1);
        const range = new vscode.Range(
          new vscode.Position(startLine - 1, 0),
          new vscode.Position(endLine, 0)
        );

        let diagSeverity = vscode.DiagnosticSeverity.Information;
        if (item.severity === 'CRITICAL' || item.severity === 'HIGH') {
          diagSeverity = vscode.DiagnosticSeverity.Error;
        }
        if (item.severity === 'MEDIUM') {
          diagSeverity = vscode.DiagnosticSeverity.Warning;
        }

        const diagnostic = new vscode.Diagnostic(
          range,
          item.title.toString() || '',
          diagSeverity
        );
        diagnostic.source = 'trivy';
        diagnostic.code = item.id;

        const workspaceFilename = vscode.workspace.workspaceFolders?.find(
          (ws) => ws.name === item.workspaceName
        )?.uri.fsPath;
        if (!workspaceFilename) {
          return;
        }
        const fullFilename = path.join(workspaceFilename, item.filename);
        if (!fileDiagnostics.has(fullFilename)) {
          fileDiagnostics.set(fullFilename, []);
        }
        fileDiagnostics.get(fullFilename)?.push(diagnostic);
      } catch (error) {
        console.error(`Error updating problems: ${error}`);
      }
    });

    fileDiagnostics.forEach((diagnostics, filePath) => {
      this.diagnosticsCollection.set(vscode.Uri.file(filePath), diagnostics);
    });
  }
}
