import * as vscode from 'vscode';

import { prettifyName } from '../../utils';
import { PolicyResult, TrivyResult } from '../result';

import { TrivyTreeItem } from './treeitem';
import { TrivyTreeItemType } from './treeitem_types';
import { createFileOpenCommand } from './treeview_command';

/**
 * Extract the top level findings from the result data
 * @param resultData to extract the top level policies from
 * @returns
 */
export function getTopLevelPolicies<T extends TrivyResult | PolicyResult>(
  resultData: T[]
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

/**
 * Get the children of a policy
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns
 */
export function getAssurancePolicyChildrenMultiCode<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof PolicyResult &&
      c.filename == element.filename &&
      c.id == element.code
  );

  filtered.sort(
    (a: PolicyResult | TrivyResult, b: PolicyResult | TrivyResult) => {
      if (a instanceof PolicyResult && b instanceof PolicyResult) {
        if (a.severity.toString().localeCompare(b.severity.toString()) === 0) {
          return a.avdId.localeCompare(b.avdId);
        }
        return a.severity.toString().localeCompare(b.severity.toString()) * -1;
      }
      return 0;
    }
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

/**
 * Get the children of a policy
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns
 */
export function getAssurancePolicyChildrenSingleCode<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof PolicyResult &&
      c.id == element.code &&
      c.category == element.title
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

/**
 * Get the children of a control
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns
 */
export function getAssurancePolicyControlChildren<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const visited = new Set<string>();

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof PolicyResult && c.title === element.title
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof PolicyResult)) {
      continue;
    }

    const policy = result as PolicyResult;
    if (visited.has(policy.category)) {
      continue;
    }
    const title = prettifyName(policy.category);

    visited.add(policy.category);

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      vscode.TreeItemCollapsibleState.Collapsed,
      TrivyTreeItemType.assuranceControl,
      { check: result }
    );
    results.push(item);
  }

  return results;
}

/**
 *
 * @param resultData Get the results for a control result
 * @param element
 * @returns
 */
export function getAssurancePolicyControlResultChildren<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const visited = new Set<string>();

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof PolicyResult &&
      // c.matchCode === element.code &&
      c.category === element.title
  );

  // if there is only one unique match code, we can skip the control level across all the
  // results in filtered
  if (
    filtered
      .map((c: PolicyResult | TrivyResult) => {
        if (c instanceof PolicyResult) {
          return c.matchCode;
        }
        return '';
      })
      .reduce((acc: string[], cur: string) => {
        if (acc.indexOf(cur) === -1) {
          acc.push(cur);
        }
        return acc;
      }, [] as string[]).length === 1
  ) {
    return getAssurancePolicyChildrenSingleCode(resultData, element);
  }

  filtered.sort(
    (a: PolicyResult | TrivyResult, b: PolicyResult | TrivyResult) => {
      if (a instanceof PolicyResult && b instanceof PolicyResult) {
        if (a.severity.toString().localeCompare(b.severity.toString()) === 0) {
          return a.avdId.localeCompare(b.avdId);
        }
        return a.severity.toString().localeCompare(b.severity.toString()) * -1;
      }
      return 0;
    }
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];

    if (result === undefined || !(result instanceof PolicyResult)) {
      continue;
    }

    if (visited.has(result.matchCode)) {
      continue;
    }

    const policy = result as PolicyResult;
    const title = policy.matchCode;

    const item = new TrivyTreeItem(
      result.workspaceName,
      title,
      vscode.TreeItemCollapsibleState.Collapsed,
      TrivyTreeItemType.assuranceControlResult,
      { check: result }
    );

    visited.add(result.matchCode);
    results.push(item);
  }

  return results;
}

/**
 * Get the children of a policy
 * @param resultData to extract the children from
 * @param element to extract the children for
 * @returns
 */
export function getAssurancePolicyChildren<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], element: TrivyTreeItem): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const visited = new Set<string>();

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof PolicyResult && c.matchCode === element.title
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

    const sameFile = filtered.filter(
      (c: PolicyResult | TrivyResult) => c.filename === result.filename
    );
    if (sameFile.length > 1) {
      // if there are multiple files with the same name we've got a heirarchy
      visited.add(result.filename);
      command = undefined;
      collapsedState = vscode.TreeItemCollapsibleState.Collapsed;
      itemType = TrivyTreeItemType.singleCodeAssurancePolicy;
      const sameCode = sameFile
        .map((c: PolicyResult | TrivyResult) => {
          const p = c as PolicyResult;
          return p.avdId;
        })
        .reduce((acc: string[], cur: string) => {
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
