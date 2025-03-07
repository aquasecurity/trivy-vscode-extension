import * as vscode from 'vscode';
import { Output } from '../command/output';

export function showErrorMessage(message: string) {
  showInformationMessage(`Error: ${message}`);
}

let statusBarItem: vscode.StatusBarItem;

export function showInformationMessage(
  message: string,
  asPopup: boolean = false
) {
  if (asPopup) {
    vscode.window.showInformationMessage(message);
    return;
  }

  // make sure to not have multiple status bar items
  if (statusBarItem) {
    statusBarItem.dispose();
  }

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0
  );
  statusBarItem.text = message;
  statusBarItem.show();

  setTimeout(() => {
    statusBarItem.dispose();
  }, 3000);
}

export async function showWarningWithLink(message: string) {
  const action = await vscode.window.showWarningMessage(message, 'View Logs');
  if (action === 'View Logs') {
    Output.show(true);
  }
}
