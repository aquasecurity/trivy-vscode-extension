import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractPolicyResults,
  PolicyResult,
  processResult,
  Secret,
  TrivyResult,
  Vulnerability,
} from '../result';
import { TrivyTreeItem, TrivyTreeItemType } from './treeitem';
import { sortBySeverity } from '../../utils';
import { Ignorer } from '../../ignorer';
import {
  getMisconfigurationInstances,
  getSecretInstances,
  getTopLevelFindings,
  getVulnerabilityChildren,
} from './findings';
import {
  getAssurancePolicyChildren,
  getAssurancePolicyChildrenMultiCode,
  getAssurancePolicyChildrenSingleCode,
  getTopLevelPolicies,
} from './assurance';
import { createFileOpenCommand } from './treeview_command';
import { showInformationMessage } from '../../notification/notifications';

export type explorerType = 'finding' | 'policy';

export class TrivyTreeViewProvider
  implements vscode.TreeDataProvider<TrivyTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TrivyTreeItem | undefined | void
  > = new vscode.EventEmitter<TrivyTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TrivyTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;
  public resultData: Map<string, TrivyResult[] | PolicyResult[]> = new Map();
  private taintResults: boolean = true;
  private storagePath: string = '';
  public readonly resultsStoragePath: string = '';
  public items: TrivyTreeItem[] = [];
  private diagnosticsCollection: vscode.DiagnosticCollection;

  constructor(
    context: vscode.ExtensionContext,
    dignosticsCollection: vscode.DiagnosticCollection,
    private readonly explorerType: explorerType = 'finding'
  ) {
    this.diagnosticsCollection = dignosticsCollection;
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
    if (this.explorerType === 'finding') {
      // only need to clear when its findings
      this.diagnosticsCollection.clear();
    }
    this.taintResults = true;
    this.loadResultData();
  }

  reset() {
    this.items = [];
    this.taintResults = true;
    this.resultData.clear();
    this._onDidChangeTreeData.fire();
  }

  // when there is trivy output file, load the results
  async loadResultData() {
    const config = vscode.workspace.getConfiguration('trivy');
    const ig = new Ignorer(config);
    const isAssurance = config.get('useAquaPlatform', false);
    this.resultData.clear();
    if (
      this.resultsStoragePath !== '' &&
      vscode.workspace &&
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders[0]
    ) {
      const files = fs
        .readdirSync(this.resultsStoragePath)
        .filter((fn) =>
          isAssurance
            ? fn.endsWith('_assurance.json')
            : fn.endsWith('_results.json')
        );
      Promise.resolve(
        files.forEach((file) => {
          const resultFile = path.join(this.resultsStoragePath, file);
          const workspaceName = file
            .replace('_results.json', '')
            .replace('_assurance.json', '');

          if (fs.existsSync(resultFile)) {
            const content = fs.readFileSync(resultFile, 'utf8');
            try {
              const data = JSON.parse(content);
              if (
                data === null ||
                data.Results === null ||
                (data.Report === null && isAssurance)
              ) {
                return;
              }

              if (isAssurance) {
                const results = data.Report.Results;
                const trivyResults: TrivyResult[] = [];

                if (this.explorerType === 'finding') {
                  for (let i = 0; i < results.length; i++) {
                    const element = results[i];
                    trivyResults.push(
                      ...processResult(element, workspaceName, ig)
                    );
                  }

                  this.updateProblems(file, trivyResults);
                  this.resultData.set(workspaceName, trivyResults);
                } else {
                  const assurancePolicies = isAssurance
                    ? extractPolicyResults(data.Results, workspaceName)
                    : [];

                  this.resultData.set(`${workspaceName}`, assurancePolicies);
                }
              } else {
                if (this.explorerType === 'finding') {
                  const results = data.Results;
                  const trivyResults: TrivyResult[] = [];
                  for (let i = 0; i < results.length; i++) {
                    const element = results[i];
                    trivyResults.push(
                      ...processResult(element, workspaceName, ig)
                    );
                  }
                  this.updateProblems(file, trivyResults);
                  this.resultData.set(workspaceName, trivyResults);
                }
              }
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
      showInformationMessage(
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

  private getChildNodes(element: TrivyTreeItem): TrivyTreeItem[] {
    const trivyResults: TrivyTreeItem[] = [];
    const resultData = this.resultData.get(element.workspaceName);
    if (!resultData) {
      return [];
    }

    switch (element.itemType) {
      case TrivyTreeItemType.workspace:
        return this.getTopLevelNodes(element.workspaceName);
      case TrivyTreeItemType.vulnerablePackage:
        return getVulnerabilityChildren(resultData, element);
      case TrivyTreeItemType.misconfigCode:
        return getMisconfigurationInstances(resultData, element);
      case TrivyTreeItemType.secretFile:
        return getSecretInstances(resultData, element);
      case TrivyTreeItemType.assurancePolicy:
        return getAssurancePolicyChildren(resultData, element);
      case TrivyTreeItemType.multiCodeAssurancePolicy:
        return getAssurancePolicyChildrenMultiCode(resultData, element);
      case TrivyTreeItemType.singleCodeAssurancePolicy:
        return getAssurancePolicyChildrenSingleCode(resultData, element);
    }

    const filtered = resultData.filter(
      (c) => c.filename === element.filename && c instanceof TrivyResult
    );

    switch (element.itemType) {
      case TrivyTreeItemType.misconfigFile:
        (filtered as TrivyResult[]).sort(sortBySeverity);
        break;
    }

    const resolvedNodes: string[] = [];
    for (let index = 0; index < filtered.length; index++) {
      const result = filtered[index];

      if (result === undefined || !(result instanceof TrivyResult)) {
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
            cmd = createFileOpenCommand(result);
          }
          if (filtered.filter((c) => c.id === result.id).length === 1) {
            // there is only result for this code in this file
            state = vscode.TreeItemCollapsibleState.None;
            cmd = createFileOpenCommand(result);
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
    const resultData = this.resultData.get(workspaceName);
    if (!resultData) {
      return [];
    }

    switch (this.explorerType) {
      case 'finding':
        return getTopLevelFindings(resultData);
        break;
      case 'policy':
        return getTopLevelPolicies(resultData);
    }
  }
}
