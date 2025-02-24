import * as vscode from 'vscode';
import { stripAnsi } from '../utils';

export class Output {
  public static _outputChannel: vscode.OutputChannel;

  public static show(preserveFocus?: boolean) {
    if (Output._outputChannel) {
      Output._outputChannel.show(preserveFocus);
    }
  }

  constructor() {
    if (!Output._outputChannel) {
      Output._outputChannel = vscode.window.createOutputChannel('Trivy Scan');
    }
  }

  public appendLine(message: string) {
    Output._outputChannel.appendLine(stripAnsi(message));
  }
}
