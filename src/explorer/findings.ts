import {
  Misconfiguration,
  PolicyResult,
  TrivyResult,
  Vulnerability,
} from './result';
import { TrivyTreeItem, TrivyTreeItemType } from './treeitem';
import * as vscode from 'vscode';
import { createFileOpenCommand } from './treeview_command';

export function getTopLevelFindings(
  resultData: TrivyResult[] | PolicyResult[]
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

export function getMisconfigurationInstances(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c) =>
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

export function getVulnerabilityChildren(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c) =>
      c instanceof TrivyResult &&
      c.extraData instanceof Vulnerability &&
      c.extraData.pkgName === element.title
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

export function getSecretInstances(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c) => c instanceof TrivyResult && c.filename === element.filename
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof TrivyResult)) {
      continue;
    }

    const title = result.id;
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
