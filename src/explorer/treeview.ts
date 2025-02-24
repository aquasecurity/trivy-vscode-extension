import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  Misconfiguration,
  processResult,
  Secret,
  TrivyResult,
  Vulnerability,
} from './result';
import { TrivyTreeItem, TrivyTreeItemType } from './treeitem';
import { sortBySeverity } from '../utils';
import { Ignorer } from '../ignorer';

export class TrivyTreeViewProvider
  implements vscode.TreeDataProvider<TrivyTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TrivyTreeItem | undefined | void
  > = new vscode.EventEmitter<TrivyTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TrivyTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;
  public resultData: Map<string, TrivyResult[]> = new Map();
  private taintResults: boolean = true;
  private storagePath: string = '';
  public readonly resultsStoragePath: string = '';
  public items: TrivyTreeItem[] = [];
  private diagnosticsCollection: vscode.DiagnosticCollection;

  constructor(
    context: vscode.ExtensionContext,
    diagnosticsCollection: vscode.DiagnosticCollection
  ) {
    this.diagnosticsCollection = diagnosticsCollection;
    if (context.storageUri) {
      this.storagePath = context.storageUri.fsPath;
      console.log(`storage path is ${this.storagePath}`);
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath);
      }
      this.resultsStoragePath = path.join(this.storagePath, '/.trivy/');
      if (!fs.existsSync(this.resultsStoragePath)) {
        fs.mkdirSync(this.resultsStoragePath);
      }
    }
  }

  updateProblems(file: string, trivyResults: TrivyResult[]) {
    if (trivyResults.length === 0) {
      return;
    }

    const fileDiagnostics = new Map<string, vscode.Diagnostic[]>();
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

    fileDiagnostics.forEach((diags, filename) => {
      this.diagnosticsCollection.set(vscode.Uri.file(filename), diags);
    });
  }

  refresh(): void {
    this.items = [];
    this.diagnosticsCollection.clear();
    this.taintResults = true;
    this.loadResultData();
  }

  // when there is trivy output file, load the results
  async loadResultData() {
    const config = vscode.workspace.getConfiguration('trivy');
    const ig = new Ignorer(config);
    this.resultData.clear();
    if (
      this.resultsStoragePath !== '' &&
      vscode.workspace &&
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders[0]
    ) {
      const files = fs
        .readdirSync(this.resultsStoragePath)
        .filter(
          (fn) =>
            fn.endsWith('_results.json') || fn.endsWith('_results.json.json')
        );
      Promise.resolve(
        files.forEach((file) => {
          const resultFile = path.join(this.resultsStoragePath, file);
          const workspaceName = file.replace('_results.json', '');

          if (fs.existsSync(resultFile)) {
            const content = fs.readFileSync(resultFile, 'utf8');
            try {
              const data = JSON.parse(content);
              if (data === null || data.results === null) {
                return;
              }
              const results = data.Results;
              const trivyResults: TrivyResult[] = [];
              for (let i = 0; i < results.length; i++) {
                const element = results[i];
                trivyResults.push(...processResult(element, workspaceName, ig));
              }
              this.updateProblems(file, trivyResults);
              this.resultData.set(workspaceName, trivyResults);
            } catch (error) {
              console.debug(`Error loading results file ${file}: ${error}`);
            }
          }
        })
      ).then(() => {
        this.taintResults = !this.taintResults;
        this._onDidChangeTreeData.fire();
      });
    } else {
      vscode.window.showInformationMessage(
        'No workspace detected to load Trivy results from'
      );
    }
    this.taintResults = false;
  }

  getTreeItem(element: TrivyTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TrivyTreeItem): Thenable<TrivyTreeItem[]> {
    // if this is refresh then get the top level codes
    let items: TrivyTreeItem[] = [];
    if (!element) {
      items = this.getWorkspaceNodes();
      if (items.length === 1) {
        // only one workspace so dont need to include in the tree
        items = this.getTopLevelNodes(items[0].workspaceName);
      }
    } else {
      items = this.getChildNodes(element);
    }
    this.items.push(...items);

    return Promise.resolve(items);
  }

  private getVulnerabilityChildren(element: TrivyTreeItem): TrivyTreeItem[] {
    const results: TrivyTreeItem[] = [];
    const resultData = this.resultData.get(element.workspaceName);
    if (!resultData) {
      return results;
    }

    const filtered = resultData.filter(
      (c) =>
        c.extraData instanceof Vulnerability &&
        c.extraData.pkgName === element.title
    );

    for (let index = 0; index < filtered.length; index++) {
      const result = filtered[index];

      if (result === undefined) {
        continue;
      }

      const title = `${result.id}`;
      const collapsedState = vscode.TreeItemCollapsibleState.None;

      const item = new TrivyTreeItem(
        result.workspaceName,
        title,
        collapsedState,
        TrivyTreeItemType.vulnerabilityCode,
        { check: result, command: this.createFileOpenCommand(result) }
      );
      results.push(item);
    }

    return results;
  }

  getSecretInstances(element: TrivyTreeItem): TrivyTreeItem[] {
    const results: TrivyTreeItem[] = [];
    const resultData = this.resultData.get(element.workspaceName);
    if (!resultData) {
      return results;
    }

    const filtered = resultData.filter((c) => c.filename === element.filename);

    for (let index = 0; index < filtered.length; index++) {
      const result = filtered[index];

      if (result === undefined) {
        continue;
      }

      const title = result.id;
      const collapsedState = vscode.TreeItemCollapsibleState.None;

      const item = new TrivyTreeItem(
        result.workspaceName,
        title,
        collapsedState,
        TrivyTreeItemType.secretInstance,
        { check: result, command: this.createFileOpenCommand(result) }
      );
      results.push(item);
    }

    return results;
  }

  getMisconfigurationInstances(element: TrivyTreeItem): TrivyTreeItem[] {
    const results: TrivyTreeItem[] = [];
    const resultData = this.resultData.get(element.workspaceName);
    if (!resultData) {
      return results;
    }

    const filtered = resultData.filter(
      (c) => c.id === element.code && c.filename === element.filename
    );

    for (let index = 0; index < filtered.length; index++) {
      const result = filtered[index];

      if (result === undefined) {
        continue;
      }

      const title = `${result.filename}:[${result.startLine}-${result.endLine}]`;
      const collapsedState = vscode.TreeItemCollapsibleState.None;

      const item = new TrivyTreeItem(
        result.workspaceName,
        title,
        collapsedState,
        TrivyTreeItemType.misconfigInstance,
        { check: result, command: this.createFileOpenCommand(result) }
      );
      results.push(item);
    }

    return results;
  }

  private getChildNodes(element: TrivyTreeItem): TrivyTreeItem[] {
    const trivyResults: TrivyTreeItem[] = [];

    switch (element.itemType) {
      case TrivyTreeItemType.workspace:
        return this.getTopLevelNodes(element.workspaceName);
      case TrivyTreeItemType.vulnerablePackage:
        return this.getVulnerabilityChildren(element);
      case TrivyTreeItemType.misconfigCode:
        return this.getMisconfigurationInstances(element);
      case TrivyTreeItemType.secretFile:
        return this.getSecretInstances(element);
    }

    const resultData = this.resultData.get(element.workspaceName);
    if (!resultData) {
      return trivyResults;
    }

    const filtered = resultData.filter((c) => c.filename === element.filename);

    switch (element.itemType) {
      case TrivyTreeItemType.misconfigFile:
        filtered.sort(sortBySeverity);
        break;
    }

    const resolvedNodes: string[] = [];
    for (let index = 0; index < filtered.length; index++) {
      const result = filtered[index];

      if (result === undefined) {
        continue;
      }

      switch (element.itemType) {
        case TrivyTreeItemType.misconfigFile: {
          if (resolvedNodes.includes(result.id)) {
            continue;
          }

          let cmd: vscode.Command | undefined;
          let state = vscode.TreeItemCollapsibleState.Collapsed;

          if (result.extraData instanceof Secret) {
            state = vscode.TreeItemCollapsibleState.None;
            cmd = this.createFileOpenCommand(result);
          }
          if (filtered.filter((c) => c.id === result.id).length === 1) {
            // there is only result for this code in this file
            state = vscode.TreeItemCollapsibleState.None;
            cmd = this.createFileOpenCommand(result);
          }
          resolvedNodes.push(result.id);
          trivyResults.push(
            new TrivyTreeItem(
              result.workspaceName,
              result.title,
              state,
              result.extraData instanceof Secret
                ? TrivyTreeItemType.secretInstance
                : TrivyTreeItemType.misconfigCode,
              { check: result, command: cmd }
            )
          );
          break;
        }
        case TrivyTreeItemType.vulnerabilityFile: {
          const extraData = result.extraData;

          if (extraData instanceof Vulnerability) {
            if (resolvedNodes.includes(extraData.pkgName)) {
              continue;
            }
            resolvedNodes.push(extraData.pkgName);
            trivyResults.push(
              new TrivyTreeItem(
                result.workspaceName,
                extraData.pkgName,
                vscode.TreeItemCollapsibleState.Collapsed,
                TrivyTreeItemType.vulnerablePackage,
                { check: result }
              )
            );
          }
          break;
        }
      }
    }
    return trivyResults;
  }

  private getWorkspaceNodes(): TrivyTreeItem[] {
    const results: TrivyTreeItem[] = [];

    if (this.resultData.size === 0) {
      return results;
    }

    vscode.workspace.workspaceFolders?.forEach((wsFolder) => {
      const workspaceName = wsFolder.name;
      const workspaceResults = this.resultData.get(workspaceName);
      if (!workspaceResults) {
        return;
      }

      const workspaceItem = new TrivyTreeItem(
        workspaceName,
        workspaceName,
        vscode.TreeItemCollapsibleState.Collapsed,
        TrivyTreeItemType.workspace,
        {
          workspacePath: wsFolder.uri.fsPath,
        }
      );
      results.push(workspaceItem);
    });

    return results;
  }

  private getTopLevelNodes(workspaceName: string): TrivyTreeItem[] {
    const results: TrivyTreeItem[] = [];
    const resolvedNodes: string[] = [];

    const resultData = this.resultData.get(workspaceName);
    if (!resultData) {
      return results;
    }

    for (let index = 0; index < resultData.length; index++) {
      const result = resultData[index];
      if (result === undefined) {
        continue;
      }

      if (resolvedNodes.includes(result.filename)) {
        continue;
      }

      resolvedNodes.push(result.filename);

      const itemType =
        result.extraData instanceof Vulnerability
          ? TrivyTreeItemType.vulnerabilityFile
          : result.extraData instanceof Misconfiguration
            ? TrivyTreeItemType.misconfigFile
            : TrivyTreeItemType.secretFile;
      results.push(
        new TrivyTreeItem(
          result.workspaceName,
          result.filename,
          vscode.TreeItemCollapsibleState.Collapsed,
          itemType,
          { check: result }
        )
      );
    }
    return results;
  }

  private createFileOpenCommand(
    result: TrivyResult
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
    return {
      command: 'vscode.open',
      title: '',
      arguments: [
        vscode.Uri.file(fileUri),
        {
          selection:
            startLine === endLine && startLine === 0 ? null : issueRange,
        },
      ],
    };
  }
}
