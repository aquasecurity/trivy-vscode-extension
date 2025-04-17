import fs from 'fs';
import path from 'path';

import * as vscode from 'vscode';

import {
  Misconfiguration,
  PolicyResult,
  TrivyResult,
} from '../../cache/result';
import { VulnerabilityCodeLensProvider } from '../codelens_provider';

/**
 * Creates a command to open the file containing the result
 * @param result The result object
 * @returns A command to open the file or undefined if the file does not exist
 */
export function createFileOpenCommand(
  result: TrivyResult | PolicyResult
): vscode.Command | undefined {
  const wsFolder = vscode.workspace.workspaceFolders?.find(
    (ws) => ws.name === result.workspaceName
  );

  if (!wsFolder) {
    return;
  }

  let fileUri: string = '';
  let startLine = result.startLine;
  let endLine = result.endLine;
  if (
    result instanceof TrivyResult &&
    result.extraData instanceof Misconfiguration &&
    result.extraData.occurrences
  ) {
    result.extraData.occurrences.forEach(
      (occurrence: {
        Filename: string;
        Location: { StartLine: number; EndLine: number };
      }) => {
        const occurrencePath = path.join(
          wsFolder.uri.fsPath,
          occurrence.Filename
        );
        if (fs.existsSync(occurrencePath)) {
          fileUri = occurrencePath;
          startLine = occurrence.Location.StartLine;
          endLine = occurrence.Location.EndLine;
          return;
        }
      }
    );
  } else {
    fileUri = path.join(wsFolder.uri.fsPath, result.filename);
  }
  if (!fileUri || !fs.existsSync(fileUri)) {
    return;
  }

  const issueRange = new vscode.Range(
    new vscode.Position(result.startLine - 1, 0),
    new vscode.Position(result.endLine, 0)
  );

  VulnerabilityCodeLensProvider.instance().updateResults([
    result as TrivyResult,
  ]);

  return {
    command: 'vscode.open',
    title: '',
    arguments: [
      vscode.Uri.file(fileUri),
      {
        selection: startLine === endLine && startLine === 0 ? null : issueRange,
      },
    ],
  };
}
