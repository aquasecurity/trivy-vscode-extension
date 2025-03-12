import * as vscode from 'vscode';

import {
  Misconfiguration,
  PolicyResult,
  TrivyResult,
  Vulnerability,
} from '../result';

import { TrivyTreeItem } from './treeitem';
import { TrivyTreeItemType } from './treeitem_types';
import { createFileOpenCommand } from './treeview_command';

/**
 * Extract the top level findings from the result data
 * @param resultData to extract the top level findings from
 * @returns The top level findings as TrivyTreeItems
 */
export function getTopLevelFindings<T extends TrivyResult | PolicyResult>(
  resultData: T[]
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const resolvedNodes: string[] = [];

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
      result instanceof TrivyResult && result.extraData instanceof Vulnerability
        ? TrivyTreeItemType.vulnerabilityFile
        : result instanceof TrivyResult &&
            result.extraData instanceof Misconfiguration
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

/**
 * Get the children of a file
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns The children of the file as TrivyTreeItems
 */
export function getMisconfigurationInstances<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult &&
      c.id === element.code &&
      c.filename === element.filename
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof TrivyResult)) {
      continue;
    }

    const title = `${result.filename}:[${result.startLine}-${result.endLine}]`;
    const collapsedState = vscode.TreeItemCollapsibleState.None;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      TrivyTreeItemType.misconfigInstance,
      { check: result, command: createFileOpenCommand(result) }
    );
    results.push(item);
  }

  return results;
}

/**
 * Get the children of a vulnerability
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns The children of the vulnerability as TrivyTreeItems
 */
export function getVulnerabilityChildren<T extends TrivyResult | PolicyResult>(
  resultData: T[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult &&
      c.extraData instanceof Vulnerability &&
      c.extraData.pkgName === element.title &&
      c.filename === element.filename
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof TrivyResult)) {
      continue;
    }

    const title = `${result.id}`;
    const collapsedState = vscode.TreeItemCollapsibleState.None;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      TrivyTreeItemType.vulnerabilityCode,
      { check: result, command: createFileOpenCommand(result) }
    );
    results.push(item);
  }

  return results;
}

/**
 * Get Secret Instances
 * @param resultData the result data to extract the children from
 * @param element
 * @returns
 */
export function getSecretInstances<T extends TrivyResult | PolicyResult>(
  resultData: T[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: TrivyResult | PolicyResult) =>
      c instanceof TrivyResult && c.filename === element.filename
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof TrivyResult)) {
      continue;
    }

    const title = result.title ?? result.id;
    const collapsedState = vscode.TreeItemCollapsibleState.None;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      TrivyTreeItemType.secretInstance,
      { check: result, command: createFileOpenCommand(result) }
    );
    results.push(item);
  }

  return results;
}
