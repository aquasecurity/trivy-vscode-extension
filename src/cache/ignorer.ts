import * as fs from 'fs';
import * as path from 'path';

import ignore, { Ignore } from 'ignore';
import * as vscode from 'vscode';

import { Output } from '../command/output';

/**
 * Manages file ignoring based on gitignore rules and custom ignore patterns
 */
export class Ignorer {
  private useGitIgnore: boolean;
  private useCustomIgnore: boolean;
  private customIgnorePaths: string[];
  private ignoreFiles: Map<string, Ignore> = new Map();
  private readonly output: Output;

  /**
   * Creates a new Ignorer instance
   * @param config VS Code workspace configuration
   */
  constructor(config: vscode.WorkspaceConfiguration) {
    this.useGitIgnore = config.get<boolean>('ignoreFilesInGitIgnore', false);
    this.useCustomIgnore = config.get<boolean>('useCustomIgnore', false);
    this.customIgnorePaths = config.get<string[]>('customIgnorePaths', []);
    this.output = Output.getInstance();
  }

  /**
   * Updates the ignorer configuration
   * @param config Updated VS Code workspace configuration
   */
  public updateConfig(config: vscode.WorkspaceConfiguration): void {
    const oldGitIgnore = this.useGitIgnore;
    const oldCustomIgnore = this.useCustomIgnore;
    const oldCustomPaths = [...this.customIgnorePaths];

    this.useGitIgnore = config.get<boolean>('ignoreFilesInGitIgnore', false);
    this.useCustomIgnore = config.get<boolean>('useCustomIgnore', false);
    this.customIgnorePaths = config.get<string[]>('customIgnorePaths', []);

    // Clear cache if configuration has changed
    if (
      oldGitIgnore !== this.useGitIgnore ||
      oldCustomIgnore !== this.useCustomIgnore ||
      JSON.stringify(oldCustomPaths) !== JSON.stringify(this.customIgnorePaths)
    ) {
      this.ignoreFiles.clear();
    }
  }

  /**
   * Checks if a file should be ignored based on ignore rules
   * @param filePath Path of the file relative to workspace root
   * @param workspaceName Name of the workspace containing the file
   * @returns true if the file should be ignored, false otherwise
   */
  public isFileIgnored(filePath: string, workspaceName: string): boolean {
    if (!this.useGitIgnore && !this.useCustomIgnore) {
      return false;
    }

    try {
      const ignorer = this.getIgnorer(workspaceName);
      if (!ignorer) {
        return false;
      }

      // Normalize path to use forward slashes for ignore matching
      const normalizedPath = filePath.split(path.sep).join('/');
      return ignorer.ignores(normalizedPath);
    } catch (error) {
      this.output.appendLine(
        `Error checking ignore status for ${filePath}: ${error}`
      );
      return false;
    }
  }

  /**
   * Gets the ignorer for a specific workspace, loading it if necessary
   * @param workspaceName Name of the workspace
   * @returns Ignore instance or undefined if no ignore rules could be loaded
   */
  private getIgnorer(workspaceName: string): Ignore | undefined {
    if (this.ignoreFiles.has(workspaceName)) {
      return this.ignoreFiles.get(workspaceName);
    }

    const workspace = vscode.workspace.workspaceFolders?.find(
      (ws) => ws.name === workspaceName
    );

    if (!workspace) {
      return undefined;
    }

    const rootDir = workspace.uri.fsPath;
    const ignorer = ignore();
    let rulesLoaded = false;

    // Load .gitignore if enabled
    if (this.useGitIgnore) {
      const gitignorePath = path.join(rootDir, '.gitignore');
      rulesLoaded = this.loadIgnoreFile(ignorer, gitignorePath) || rulesLoaded;
    }

    // Load custom ignore files if enabled
    if (this.useCustomIgnore && this.customIgnorePaths.length > 0) {
      for (const ignorePath of this.customIgnorePaths) {
        const fullPath = path.isAbsolute(ignorePath)
          ? ignorePath
          : path.join(rootDir, ignorePath);
        rulesLoaded = this.loadIgnoreFile(ignorer, fullPath) || rulesLoaded;
      }
    }

    if (rulesLoaded) {
      this.ignoreFiles.set(workspaceName, ignorer);
      return ignorer;
    }

    return undefined;
  }

  /**
   * Loads ignore rules from a file into an ignorer
   * @param ignorer The ignore instance to add rules to
   * @param filePath Path to the ignore file
   * @returns true if rules were loaded successfully, false otherwise
   */
  private loadIgnoreFile(ignorer: Ignore, filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      ignorer.add(content);
      return true;
    } catch (error) {
      this.output.appendLine(`Error loading ignore file ${filePath}: ${error}`);
      return false;
    }
  }

  /**
   * Clears the ignore file cache, forcing reload on next use
   */
  public clearCache(): void {
    this.ignoreFiles.clear();
  }
}
