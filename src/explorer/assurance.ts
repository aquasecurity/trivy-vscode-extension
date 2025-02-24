import { PolicyResult, TrivyResult } from './result';
import { TrivyTreeItem, TrivyTreeItemType } from './treeitem';
import * as vscode from 'vscode';
import { createFileOpenCommand } from './treeview_command';

export function getTopLevelPolicies(
  resultData: TrivyResult[] | PolicyResult[]
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const resolvedNodes: string[] = [];

  for (let index = 0; index < resultData.length; index++) {
    const result = resultData[index];
    if (result === undefined) {
      continue;
    }

    if (resolvedNodes.includes(result.title)) {
      continue;
    }

    resolvedNodes.push(result.title);
    results.push(
      new TrivyTreeItem(
        result.workspaceName,
        result.title,
        vscode.TreeItemCollapsibleState.Collapsed,
        TrivyTreeItemType.assurancePolicy,
        { check: result }
      )
    );
  }
  return results;
}

export function getAssurancePolicyChildrenMultiCode(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const filtered = resultData.filter(
    (c) =>
      c instanceof PolicyResult &&
      c.filename == element.filename &&
      c.id == element.code
  );

  filtered.sort((a, b) => {
    if (a instanceof PolicyResult && b instanceof PolicyResult) {
      if (a.severity.toString().localeCompare(b.severity.toString()) === 0) {
        return a.avdId.localeCompare(b.avdId);
      }
      return a.severity.toString().localeCompare(b.severity.toString()) * -1;
    }
    return 0;
  });

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof PolicyResult)) {
      continue;
    }

    const command = createFileOpenCommand(result);
    const collapsedState = vscode.TreeItemCollapsibleState.None;
    const itemType = result.category.includes('misconfig')
      ? TrivyTreeItemType.misconfigFile
      : TrivyTreeItemType.vulnerabilityCode;

    const policy = result as PolicyResult;
    const title = policy.avdId;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      itemType,
      { check: result, command: command }
    );
    results.push(item);
  }

  return results;
}

export function getAssurancePolicyChildrenSingleCode(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const filtered = resultData.filter(
    (c) =>
      c instanceof PolicyResult &&
      c.filename == element.filename &&
      c.id == element.code
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof PolicyResult)) {
      continue;
    }

    const command = createFileOpenCommand(result);
    const collapsedState = vscode.TreeItemCollapsibleState.None;
    const itemType = result.category.includes('misconfig')
      ? TrivyTreeItemType.misconfigFile
      : TrivyTreeItemType.vulnerabilityFile;

    const policy = result as PolicyResult;

    let addition = '';
    // if this is a solo file we can add the line numbers
    if (command && policy.startLine && policy.startLine !== policy.endLine) {
      addition = `:${policy.startLine}-${policy.endLine}`;
    }

    // addition += `${result.failed ? cross : tick}`;

    const title = policy.filename + addition;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      itemType,
      { check: result, command: command }
    );
    results.push(item);
  }
  return results;
}

export function getAssurancePolicyChildren(
  resultData: TrivyResult[] | PolicyResult[],
  element: TrivyTreeItem
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const visited = new Set<string>();

  const filtered = resultData.filter(
    (c) =>
      c instanceof PolicyResult &&
      // c.matchCode === element.code &&
      c.title === element.title
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof PolicyResult)) {
      continue;
    }

    if (visited.has(result.filename)) {
      continue;
    }

    let command = createFileOpenCommand(result);
    let collapsedState = vscode.TreeItemCollapsibleState.None;
    let itemType = result.category.includes('misconfig')
      ? TrivyTreeItemType.misconfigFile
      : TrivyTreeItemType.vulnerabilityFile;

    const sameFile = filtered.filter((c) => c.filename === result.filename);
    if (sameFile.length > 1) {
      // if there are multiple files with the same name we've got a heirarchy
      visited.add(result.filename);
      command = undefined;
      collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
      itemType = TrivyTreeItemType.singleCodeAssurancePolicy;
      const sameCode = sameFile
        .map((c) => {
          const p = c as PolicyResult;
          return p.avdId;
        })
        .reduce((acc, cur) => {
          if (acc.indexOf(cur) === -1) {
            acc.push(cur);
          }
          return acc;
        }, [] as string[]);

      if (sameCode.length > 1) {
        itemType = TrivyTreeItemType.multiCodeAssurancePolicy;
      }
    }

    const policy = result as PolicyResult;

    let addition = '';
    // if this is a solo file we can add the line numbers
    if (command && policy.startLine && policy.startLine !== policy.endLine) {
      addition = `:${policy.startLine}-${policy.endLine}`;
    }

    // addition += `${result.failed ? cross : tick}`;

    const title = policy.filename + addition;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      collapsedState,
      itemType,
      { check: result, command: command }
    );
    results.push(item);
  }

  return results;
}
