import * as vscode from 'vscode';

import {
  Misconfiguration,
  PolicyResult,
  Secret,
  TrivyResult,
  Vulnerability,
} from '../result';

import { TrivyTreeItem } from './treeitem';
import { TrivyTreeItemType } from './treeitem_types';
import { createFileOpenCommand } from './treeview_command';

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low', 'Unknown'];

/**
 * Extract the top level findings from the result data
 * @param resultData to extract the top level findings from
 * @returns The top level findings as TrivyTreeItems
 */
export function getTopLevelFindings<T extends TrivyResult | PolicyResult>(
  resultData: T[]
): TrivyTreeItem[] {
  const config = vscode.workspace.getConfiguration('trivy');
  const useAquaPlatform = config.get<boolean>('useAquaPlatform');
  if (useAquaPlatform) {
    return groupResultsBySeverity(resultData);
  } else {
    return groupResultsByFile(resultData);
  }
}

function groupResultsBySeverity<T extends TrivyResult | PolicyResult>(
  resultData: T[]
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  if (
    resultData.filter(
      (c) => c instanceof TrivyResult && c.extraData instanceof Vulnerability
    ).length > 0
  ) {
    results.push(
      new TrivyTreeItem(
        resultData[0].workspaceName,
        'Vulnerabilities',
        vscode.TreeItemCollapsibleState.Expanded,
        TrivyTreeItemType.vulnerabilityRoot,
        {}
      )
    );
  }

  if (
    resultData.filter(
      (c) => c instanceof TrivyResult && c.extraData instanceof Misconfiguration
    ).length > 0
  ) {
    results.push(
      new TrivyTreeItem(
        resultData[0].workspaceName,
        'Misconfigurations',
        vscode.TreeItemCollapsibleState.Expanded,
        TrivyTreeItemType.misconfigRoot,
        {}
      )
    );
  }

  if (
    resultData.filter(
      (c) => c instanceof TrivyResult && c.extraData instanceof Secret
    ).length > 0
  ) {
    results.push(
      new TrivyTreeItem(
        resultData[0].workspaceName,
        'Sensitive Data',
        vscode.TreeItemCollapsibleState.Expanded,
        TrivyTreeItemType.secretRoot,
        {}
      )
    );
  }

  return results;
}

function groupResultsByFile<T extends TrivyResult | PolicyResult>(
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
      c.filename === element.filename &&
      (element.properties?.requiredSeverity === undefined ||
        c.severity.toLowerCase() ===
          element.properties?.requiredSeverity.toLowerCase())
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
      {
        check: result,
        command: createFileOpenCommand(result),
        requiredSeverity: result.severity,
      }
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

export function getVulnerabilitySeverityRoots<
  T extends TrivyResult | PolicyResult,
>(resultData: T[]): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult && c.extraData instanceof Vulnerability
  );

  const severities = Array.from(new Set(filtered.map((c) => c.severity)));

  SEVERITY_ORDER.forEach((sev) => {
    if (severities.includes(sev.toUpperCase())) {
      results.push(
        new TrivyTreeItem(
          resultData[0].workspaceName,
          sev,
          vscode.TreeItemCollapsibleState.Collapsed,
          TrivyTreeItemType.vulnerabilitySeverity,
          { requiredSeverity: sev }
        )
      );
    }
  });

  return results;
}

export function getMisconfigSeverityRoots(
  resultData: (TrivyResult | PolicyResult)[]
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult && c.extraData instanceof Misconfiguration
  );

  const severities = Array.from(new Set(filtered.map((c) => c.severity)));

  SEVERITY_ORDER.forEach((sev) => {
    if (severities.includes(sev.toUpperCase())) {
      results.push(
        new TrivyTreeItem(
          resultData[0].workspaceName,
          sev,
          vscode.TreeItemCollapsibleState.Collapsed,
          TrivyTreeItemType.misconfigSeverity,
          {
            requiredSeverity: sev,
          }
        )
      );
    }
  });
  return results;
}

export function getSecretRoots(
  resultData: (TrivyResult | PolicyResult)[]
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult && c.extraData instanceof Secret
  );

  const severities = Array.from(new Set(filtered.map((c) => c.severity)));

  SEVERITY_ORDER.forEach((sev) => {
    if (severities.includes(sev.toUpperCase())) {
      results.push(
        new TrivyTreeItem(
          resultData[0].workspaceName,
          sev,
          vscode.TreeItemCollapsibleState.Collapsed,
          TrivyTreeItemType.secretSeverity,
          { requiredSeverity: sev }
        )
      );
    }
  });

  return results;
}

export function getVulnerabilitiesBySeverity<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], severity: string): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const resolvedNodes: string[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult &&
      c.extraData instanceof Vulnerability &&
      c.severity.toLowerCase() === severity.toLowerCase()
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];
    if (result === undefined) {
      continue;
    }

    if (resolvedNodes.includes(result.filename)) {
      continue;
    }

    resolvedNodes.push(result.filename);

    results.push(
      new TrivyTreeItem(
        result.workspaceName,
        result.filename,
        vscode.TreeItemCollapsibleState.Collapsed,
        TrivyTreeItemType.vulnerabilityFile,
        { check: result, requiredSeverity: severity }
      )
    );
  }

  return results;
}

export function getMisconfigurationsBySeverity<
  T extends TrivyResult | PolicyResult,
>(resultData: T[], severity: string): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const resolvedNodes: string[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult &&
      c.extraData instanceof Misconfiguration &&
      c.severity.toLowerCase() === severity.toLowerCase()
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];
    if (result === undefined) {
      continue;
    }

    if (resolvedNodes.includes(result.filename)) {
      continue;
    }

    resolvedNodes.push(result.filename);

    results.push(
      new TrivyTreeItem(
        result.workspaceName,
        result.filename,
        vscode.TreeItemCollapsibleState.Collapsed,
        TrivyTreeItemType.misconfigFile,
        { check: result, requiredSeverity: severity }
      )
    );
  }

  return results;
}

export function getSecretsBySeverity<T extends TrivyResult | PolicyResult>(
  resultData: T[],
  severity: string
): TrivyTreeItem[] {
  const results: TrivyTreeItem[] = [];
  const resolvedNodes: string[] = [];

  const filtered = resultData.filter(
    (c: PolicyResult | TrivyResult) =>
      c instanceof TrivyResult &&
      c.extraData instanceof Secret &&
      c.severity.toLowerCase() === severity.toLowerCase()
  );

  for (let index = 0; index < filtered.length; index++) {
    const result = filtered[index];
    if (result === undefined) {
      continue;
    }

    if (resolvedNodes.includes(result.filename)) {
      continue;
    }

    resolvedNodes.push(result.filename);

    results.push(
      new TrivyTreeItem(
        result.workspaceName,
        result.filename,
        vscode.TreeItemCollapsibleState.Collapsed,
        TrivyTreeItemType.secretFile,
        { check: result, requiredSeverity: severity }
      )
    );
  }

  return results;
}
