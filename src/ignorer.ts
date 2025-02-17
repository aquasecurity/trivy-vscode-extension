import ignore from 'ignore';
import path from 'path';
import fs from 'fs';
import vscode from 'vscode';

export class Ignorer {
  private useGitIgnoreFile: boolean;

  private ignoreFiles: Map<string, ignore.Ignore> = new Map();

  constructor(config: vscode.WorkspaceConfiguration) {
    this.useGitIgnoreFile = config.get('ignoreFilesInGitIgnore', false);
  }

  public isFileIgnored(filePath: string, workspaceName: string): boolean {
    if (!this.useGitIgnoreFile) {
      return false;
    }

    if (!this.ignoreFiles.has(workspaceName)) {
      const workspace = vscode.workspace.workspaceFolders?.find(
        (ws) => ws.name === workspaceName
      );

      if (!workspace) {
        return false;
      }

      const rootDir = workspace?.uri.fsPath;
      const gitignorePath = path.join(rootDir, '.gitignore');

      if (!fs.existsSync(gitignorePath)) {
        return false;
      }

      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const ig = ignore().add(gitignoreContent);
      this.ignoreFiles.set(workspaceName, ig);
    }

    const ignorer = this.ignoreFiles.get(workspaceName);

    if (!ignorer) {
      return false;
    }
    return ignorer.ignores(filePath);
  }
}
