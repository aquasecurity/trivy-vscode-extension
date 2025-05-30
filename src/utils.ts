import * as os from 'os';
import path from 'path';

import * as vscode from 'vscode';

import { Secret, TrivyResult } from './cache/result';

/**
 * Severity levels in descending order of criticality
 */
export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Gets the position/rank of a severity level (lower is more severe)
 * @param severity The severity string to evaluate
 * @returns A number representing the position (0 = most critical)
 */
export function getSeverityPosition(severity: string): number {
  switch (severity.toUpperCase()) {
    case Severity.CRITICAL:
      return 0;
    case Severity.HIGH:
      return 1;
    case Severity.MEDIUM:
      return 2;
    case Severity.LOW:
      return 3;
    case Severity.UNKNOWN:
      return 4;
    default:
      return 5;
  }
}

/**
 * Convert a severity string to a diagnostic severity level
 * @param severity The severity string to convert
 * @returns The corresponding vscode.DiagnosticSeverity
 */
export function toDiagnosticSeverity(
  severity: string
): vscode.DiagnosticSeverity {
  switch (severity.toUpperCase()) {
    case Severity.CRITICAL:
    case Severity.HIGH:
      return vscode.DiagnosticSeverity.Error;
    case Severity.MEDIUM:
      return vscode.DiagnosticSeverity.Warning;
    case Severity.LOW:
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Hint;
  }
}

/**
 * Compare function to sort TrivyResult objects by severity (most severe first)
 * @param a First TrivyResult to compare
 * @param b Second TrivyResult to compare
 * @returns Negative if a is more severe than b, positive if b is more severe than a
 */
export const sortBySeverity = (a: TrivyResult, b: TrivyResult): number => {
  // Special case: Secrets are considered less severe than other findings
  if (a.extraData instanceof Secret && !(b.extraData instanceof Secret)) {
    return 1;
  }
  if (b.extraData instanceof Secret && !(a.extraData instanceof Secret)) {
    return -1;
  }

  // Lower position number = more severe
  const posA = getSeverityPosition(a.severity);
  const posB = getSeverityPosition(b.severity);

  if (posA !== posB) {
    return posA - posB; // This correctly sorts most severe first (-1 when a is more severe)
  }

  // If severity is the same, sort alphabetically by title as fallback
  return a.title.localeCompare(b.title);
};

/**
 * Strips ANSI escape codes from a string
 * @param str The string to remove ANSI codes from
 * @returns The cleaned string
 */
export function stripAnsiEscapeCodes(str: string): string {
  if (!str) return '';
  // Pattern to match ANSI escape sequences
  // eslint-disable-next-line no-control-regex
  const clean = str.replace(/\u001b\[\d+m/g, '').replace(/\x1b\[\d+;\d+m/g, '');
  return clean;
}

/**
 * Shows a warning message with a clickable link
 * @param message The message to display
 * @param linkText Optional text for the link
 * @param url Optional URL for the link
 */
export async function showWarningWithLink(
  message: string,
  linkText: string = 'Learn more',
  url: string = 'https://github.com/aquasecurity/trivy'
): Promise<void> {
  const result = await vscode.window.showWarningMessage(message, linkText);

  if (result === linkText) {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
}

/**
 * Shows an error message
 * @param message The error message to display
 */
export function showErrorMessage(message: string): void {
  vscode.window.showErrorMessage(`Trivy: ${message}`);
}

/**
 * Checks if a string is null or empty
 * @param value The string to check
 * @returns True if the string is null, undefined, or empty
 */
export function isNullOrEmpty(value?: string | null): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * Prettify the name by splitting on multiple camel case and capital letters
 * @param name The name to prettify
 * @returns The prettified name
 */
export function prettifyName(name: string): string {
  // split the sentence on any camel case
  const split = stripAnsiEscapeCodes(name.replace('\n', ' '));

  return split;
}

export function getSafeResultsPath(
  storagePath: string,
  workspaceName: string,
  resultType: 'assurance' | 'results',
  suffix?: string
): string {
  const p = path.join(
    storagePath,
    `${workspaceName}_${resultType}.json${suffix ? `.${suffix}` : ''}`
  );
  if (os.platform() !== 'darwin') {
    // escape the path for windows
    // return p.replace(/ /g, '\\ ');
  }

  return p;
}

/**
 * Opens VS Code settings UI at a specified setting
 * @param settingId The setting ID to focus on (e.g., "trivy.vulnScanning" or "mcp.servers")
 * @returns A promise that resolves when the command is executed
 */
export async function openSettingsAtSection(settingId: string): Promise<void> {
  return vscode.commands.executeCommand(
    'workbench.action.openSettings',
    settingId
  );
}

export async function openSettingsJsonAtSection(
  settingId: string
): Promise<void> {
  return vscode.commands.executeCommand(
    'workbench.action.openSettingsJson',
    settingId
  );
}
