import * as vscode from 'vscode';

import { stripAnsiEscapeCodes } from '../utils';

/**
 * Output manager for Trivy extension logging
 * Implements singleton pattern for consistent access to output channel
 */
export class Output {
  private static instance: Output | undefined;
  private readonly outputChannel: vscode.OutputChannel;

  /**
   * Shows the output channel in the UI
   * @param preserveFocus If true, the editor won't take focus
   * @param channelName Optional specific channel name to show
   */
  public static show(preserveFocus = true, channelName?: string): void {
    const output = Output.getInstance(channelName);
    output.outputChannel.show(preserveFocus);
  }

  /**
   * Clears the output channel content
   * @param channelName Optional specific channel to clear
   */
  public static clear(channelName?: string): void {
    const output = Output.getInstance(channelName);
    output.outputChannel.clear();
  }

  /**
   * Gets or creates the singleton instance
   * @param channelName Optional channel name (defaults to 'Trivy')
   * @returns The Output instance
   */
  public static getInstance(channelName = 'Trivy'): Output {
    if (
      !Output.instance ||
      (channelName && Output.instance.outputChannel.name !== channelName)
    ) {
      Output.instance = new Output(channelName);
    }
    return Output.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   * @param channelName The name for the output channel
   */
  private constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Appends a line to the output channel
   * @param message The message to append
   * @param timestamp Whether to add timestamp prefix
   */
  public appendLine(message: string, timestamp = false): void {
    try {
      const cleanMessage = stripAnsiEscapeCodes(message);

      if (timestamp) {
        const now = new Date();
        const timePrefix = `[${now.toLocaleTimeString()}] `;
        this.outputChannel.appendLine(`${timePrefix}${cleanMessage}`);
      } else {
        this.outputChannel.appendLine(cleanMessage);
      }
    } catch (error) {
      // Fallback if error occurs during output
      console.error('Error writing to output channel:', error);
      this.outputChannel.appendLine(`[Error processing message: ${error}]`);
    }
  }

  /**
   * Appends multiple lines to the output channel
   * @param messages Array of messages to append
   * @param timestamp Whether to add timestamp prefix
   */
  public appendLines(messages: string[], timestamp = false): void {
    for (const message of messages) {
      this.appendLine(message, timestamp);
    }
  }

  /**
   * Appends a line with timestamp
   * @param message The message to append
   */
  public appendLineWithTimestamp(message: string): void {
    this.appendLine(message, true);
  }

  /**
   * Appends a section header to visually separate content
   * @param title The section title
   */
  public appendSection(title: string): void {
    const separator = '-'.repeat(40);
    this.outputChannel.appendLine(separator);
    this.outputChannel.appendLine(`${title}`);
    this.outputChannel.appendLine(separator);
  }

  /**
   * Returns the underlying output channel
   * @returns VS Code output channel
   */
  public getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * Disposes the output channel resources
   */
  public dispose(): void {
    this.outputChannel.dispose();
    Output.instance = undefined;
  }
}
