import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { Ignorer } from '../../ignorer';
import { showInformationMessage } from '../../notification/notifications';
import { sortBySeverity } from '../../utils';
import {
  extractPolicyResults,
  PolicyResult,
  processResult,
  Secret,
  TrivyResult,
  Vulnerability,
} from '../result';

import {
  getAssurancePolicyChildren,
  getAssurancePolicyChildrenMultiCode,
  getAssurancePolicyChildrenSingleCode,
  getAssurancePolicyControlChildren,
  getAssurancePolicyControlResultChildren,
  getTopLevelPolicies,
} from './assurance';
import {
  getMisconfigSeverityRoots,
  getMisconfigurationInstances,
  getSecretInstances,
  getSecretRoots,
  getTopLevelFindings,
  getVulnerabilityChildren,
  getVulnerabilitySeverityRoots,
  getVulnerabilitiesBySeverity,
  getMisconfigurationsBySeverity,
  getSecretsBySeverity,
} from './findings';
import { TrivyTreeItem } from './treeitem';
import { TrivyTreeItemType } from './treeitem_types';
import { createFileOpenCommand } from './treeview_command';

/*
 * Trivy tree view provider type, normal findings view or policy view
 */
export type explorerType = 'finding' | 'policy';

/**
 * Trivy tree view provider
 */
export class TrivyTreeViewProvider
  implements vscode.TreeDataProvider<TrivyTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    TrivyTreeItem | undefined | void
  > = new vscode.EventEmitter<TrivyTreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TrivyTreeItem | undefined | void> =
    this._onDidChangeTreeData.event;
  public resultData: Map<string, (TrivyResult | PolicyResult)[]> = new Map();
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

  /**
   * Add the results to the problems pane
   * @param file
   * @param trivyResults
   * @returns
   * @memberof TrivyTreeViewProvider
   */
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

  /**
   * Refresh the tree view
   * @memberof TrivyTreeViewProvider
   */
  refresh(): void {
    this.items = [];
    if (this.explorerType === 'finding') {
      // only need to clear when its findings
      this.diagnosticsCollection.clear();
    }
    this.taintResults = true;
    this.loadResultData();
  }

  /**
   * Reset the tree view
   * @memberof TrivyTreeView
   */
  reset() {
    this.items = [];
    this.taintResults = true;
    this.resultData.clear();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Load the results data
   * @memberof TrivyTreeViewProvider
   */
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
                    ? extractPolicyResults(
                        data.Results,
                        data.Report,
                        workspaceName
                      )
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

  /**
   * Get the tree item
   * @param element The tree item
   * @returns The tree item
   * @memberof TrivyTreeViewProvider
   */
  getTreeItem(element: TrivyTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get the children of the tree item
   * @param element The tree item
   * @returns The children of the tree item
   * @memberof TrivyTreeView
   */
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

  /**
   * Get the children of the tree item
   * @param element The tree item
   * @returns The children of the tree item
   * @memberof TrivyTreeView
   */
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
        return getAssurancePolicyControlChildren(resultData, element);
      case TrivyTreeItemType.assuranceControl:
        return getAssurancePolicyControlResultChildren(resultData, element);
      case TrivyTreeItemType.assuranceControlResult:
        return getAssurancePolicyChildren(resultData, element);
      case TrivyTreeItemType.multiCodeAssurancePolicy:
        return getAssurancePolicyChildrenMultiCode(resultData, element);
      case TrivyTreeItemType.singleCodeAssurancePolicy:
        return getAssurancePolicyChildrenSingleCode(resultData, element);
      case TrivyTreeItemType.vulnerabilityRoot:
        return getVulnerabilitySeverityRoots(resultData);
      case TrivyTreeItemType.vulnerabilitySeverity:
        return getVulnerabilitiesBySeverity(resultData, element.title);
      case TrivyTreeItemType.misconfigSeverity:
        return getMisconfigurationsBySeverity(resultData, element.title);
      case TrivyTreeItemType.secretSeverity:
        return getSecretsBySeverity(resultData, element.title);
      case TrivyTreeItemType.misconfigRoot:
        return getMisconfigSeverityRoots(resultData);
      case TrivyTreeItemType.secretRoot:
        return getSecretRoots(resultData);
    }

    const filtered = resultData.filter(
      (c: PolicyResult | TrivyResult) =>
        c.filename === element.filename &&
        c instanceof TrivyResult &&
        (element.properties?.requiredSeverity
          ? c.severity.toLowerCase() ===
            element.properties?.requiredSeverity.toLowerCase()
          : true)
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
          if (
            filtered.filter(
              (c: PolicyResult | TrivyResult) => c.id === result.id
            ).length === 1
          ) {
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
              {
                check: result,
                command: cmd,
                requiredSeverity: element.properties?.requiredSeverity,
              }
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
                {
                  check: result,
                  requiredSeverity: element.properties?.requiredSeverity,
                  indirect: extraData.indirect,
                }
              )
            );
          }
          break;
        }
      }
    }
    return trivyResults;
  }

  /**
   * Get the top level nodes
   * @returns The top level nodes
   * @memberof TrivyTreeViewProvider
   * @private
   */
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

  /**
   * Get the top level nodes
   * @param workspaceName The workspace name
   * @returns The top level nodes
   * @memberof TrivyTreeViewProvider
   * @private
   **/
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
