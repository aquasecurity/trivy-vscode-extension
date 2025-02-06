import { Secret, TrivyResult } from './explorer/trivy_result';
import vscode from 'vscode';

export function getSeverityPosition(severity: string): number {
  switch (severity) {
    case 'CRITICAL':
      return 0;
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 3;
    default:
      return -1;
  }
}

export const sortBySeverity = (a: TrivyResult, b: TrivyResult): number => {
  if (a.extraData instanceof Secret) {
    return 1;
  }
  if (getSeverityPosition(a.severity) > getSeverityPosition(b.severity)) {
    return 1;
  } else if (
    getSeverityPosition(a.severity) < getSeverityPosition(b.severity)
  ) {
    return -1;
  }

  return 0;
};

export async function showWarningWithLink(
  message: string,
  outputChannel: vscode.OutputChannel
) {
  const action = await vscode.window.showWarningMessage(message, 'View Logs');

  if (action === 'View Logs') {
    outputChannel.show(true);
  }
}
