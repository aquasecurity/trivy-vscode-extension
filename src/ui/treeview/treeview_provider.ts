import * as vscode from 'vscode';

import {
  PolicyResult,
  Secret,
  TrivyResult,
  Vulnerability,
} from '../../cache/result';
import { ResultCache } from '../../cache/result_cache';
import { sortBySeverity } from '../../utils';

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
import { Problems } from './problems';
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
  private resultData: ResultCache = ResultCache.instance;
  public items: TrivyTreeItem[] = [];
  private treeViewType: typeof TrivyResult | typeof PolicyResult;

  constructor(
    context: vscode.ExtensionContext,
    private readonly explorerType: explorerType = 'finding'
  ) {
    this.treeViewType =
      this.explorerType === 'finding' ? TrivyResult : PolicyResult;
  }

  /**
   * Refresh the tree view
   * @memberof TrivyTreeViewProvider
   */
  refresh(): void {
    this.items = [];
    if (this.explorerType === 'finding') {
      Problems.instance.updateProblems(this.resultData.getTrivyResults());
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Reset the tree view
   * @memberof TrivyTreeView
   */
  reset() {
    this.items = [];
    // this.taintResults = true;
    this.resultData.clear();
    this._onDidChangeTreeData.fire();
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

    switch (element.itemType) {
      case TrivyTreeItemType.workspace:
        return this.getTopLevelNodes(element.workspaceName);
      case TrivyTreeItemType.vulnerablePackage:
        return getVulnerabilityChildren(
          this.resultData.getTrivyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.misconfigCode:
        return getMisconfigurationInstances(
          this.resultData.getTrivyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.secretFile:
        return getSecretInstances(
          this.resultData.getTrivyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.assurancePolicy:
        return getAssurancePolicyControlChildren(
          this.resultData.getPolicyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.assuranceControl:
        return getAssurancePolicyControlResultChildren(
          this.resultData.getPolicyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.assuranceControlResult:
        return getAssurancePolicyChildren(
          this.resultData.getPolicyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.multiCodeAssurancePolicy:
        return getAssurancePolicyChildrenMultiCode(
          this.resultData.getPolicyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.singleCodeAssurancePolicy:
        return getAssurancePolicyChildrenSingleCode(
          this.resultData.getPolicyResults(element.workspaceName),
          element
        );
      case TrivyTreeItemType.vulnerabilityRoot:
        return getVulnerabilitySeverityRoots(
          this.resultData.getTrivyResults(element.workspaceName)
        );
      case TrivyTreeItemType.vulnerabilitySeverity:
        return getVulnerabilitiesBySeverity(
          this.resultData.getTrivyResults(element.workspaceName),
          element.title
        );
      case TrivyTreeItemType.misconfigSeverity:
        return getMisconfigurationsBySeverity(
          this.resultData.getTrivyResults(element.workspaceName),
          element.title
        );
      case TrivyTreeItemType.secretSeverity:
        return getSecretsBySeverity(
          this.resultData.getTrivyResults(element.workspaceName),
          element.title
        );
      case TrivyTreeItemType.misconfigRoot:
        return getMisconfigSeverityRoots(
          this.resultData.getTrivyResults(element.workspaceName)
        );
      case TrivyTreeItemType.secretRoot:
        return getSecretRoots(
          this.resultData.getTrivyResults(element.workspaceName)
        );
    }

    const filtered = this.resultData
      .getTrivyResults(element.workspaceName)
      .filter(
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

    // if (this.resultData.size() === 0) {
    //   return results;
    // }

    vscode.workspace.workspaceFolders?.forEach((wsFolder) => {
      const workspaceName = wsFolder.name;
      const workspaceResults = this.resultData.getTrivyResults(workspaceName);
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
    switch (this.explorerType) {
      case 'finding':
        return getTopLevelFindings(
          this.resultData.getTrivyResults(workspaceName)
        );
        break;
      case 'policy':
        return getTopLevelPolicies(
          this.resultData.getPolicyResults(workspaceName)
        );
        break;
    }
  }
}
