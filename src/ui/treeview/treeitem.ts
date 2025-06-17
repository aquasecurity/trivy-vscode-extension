import path from 'path';

import * as vscode from 'vscode';

import { PolicyResult, TrivyResult } from '../../cache/result';

import { TrivyTreeItemType } from './treeitem_types';

/**
 * Tree item for the Trivy tree view
 * @extends vscode.TreeItem
 */
export class TrivyTreeItem extends vscode.TreeItem {
  public filename: string;

  code: string;
  provider: string;
  startLineNumber: number;
  endLineNumber: number;

  severity: string;
  contextValue = '';

  constructor(
    public workspaceName: string,
    public readonly title: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    public itemType: TrivyTreeItemType,
    public properties?: {
      check?: TrivyResult | PolicyResult;
      command?: vscode.Command;
      workspacePath?: string;
      requiredSeverity?: string;
      indirect?: boolean;
    }
  ) {
    super(title, collapsibleState);
    this.severity = properties?.check?.severity || '';
    this.command = properties?.command;
    this.code = properties?.check?.id || '';
    this.provider = '';
    this.startLineNumber = 0;
    this.endLineNumber = 0;
    this.filename = properties?.check?.filename || '';
    this.code = properties?.check?.id || '';

    switch (itemType) {
      case TrivyTreeItemType.vulnerabilitySeverity:
      case TrivyTreeItemType.misconfigSeverity:
      case TrivyTreeItemType.secretSeverity:
      case TrivyTreeItemType.sastSeverity:
        this.iconPath = new vscode.ThemeIcon(
          'debug-breakpoint',
          new vscode.ThemeColor(
            this.getSeverityColor(this.properties?.requiredSeverity || '')
          )
        );
        break;
      case TrivyTreeItemType.assurancePolicy:
        this.code = (properties?.check as PolicyResult)?.matchCode || '';
        this.title = (properties?.check as PolicyResult)?.title || '';
        this.tooltip = (properties?.check as PolicyResult)?.description || '';
        this.iconPath = new vscode.ThemeIcon('output');
        break;
      case TrivyTreeItemType.assuranceControl:
        this.iconPath = new vscode.ThemeIcon(
          'output',
          new vscode.ThemeColor(this.getSeverityColor(this.severity.toString()))
        );
        break;
      case TrivyTreeItemType.assuranceControlResult:
        this.iconPath = new vscode.ThemeIcon(
          'output',
          new vscode.ThemeColor(this.getSeverityColor(this.severity.toString()))
        );
        break;
      case TrivyTreeItemType.workspace:
        this.title = workspaceName;
        this.tooltip = properties?.workspacePath;
        this.iconPath = new vscode.ThemeIcon('folder-opened');
        break;
      case TrivyTreeItemType.misconfigFile:
      case TrivyTreeItemType.vulnerabilityFile:
      case TrivyTreeItemType.secretFile:
      case TrivyTreeItemType.sastFile:
      case TrivyTreeItemType.misconfigInstance:
      case TrivyTreeItemType.singleCodeAssurancePolicy:
      case TrivyTreeItemType.multiCodeAssurancePolicy:
        this.tooltip = `${properties?.check?.description}`;
        this.iconPath = vscode.ThemeIcon.File;
        this.resourceUri = vscode.Uri.parse(this.filename);
        break;
      case TrivyTreeItemType.secretInstance:
      case TrivyTreeItemType.secretCode:
        this.tooltip = this.id;
        this.iconPath = {
          light: vscode.Uri.file(
            path.join(__filename, '..', '..', 'resources', 'light', 'key.svg')
          ),
          dark: vscode.Uri.file(
            path.join(__filename, '..', '..', 'resources', 'dark', 'key.svg')
          ),
        };
        break;
      case TrivyTreeItemType.vulnerablePackage:
        this.iconPath = new vscode.ThemeIcon('package');
        this.label = properties?.indirect
          ? `${this.title} (indirect)`
          : this.title;
        break;
      case TrivyTreeItemType.misconfigCode:
      case TrivyTreeItemType.vulnerabilityCode:
      case TrivyTreeItemType.sastCode:
        this.contextValue = 'trivy.ignorable';
        this.tooltip = properties?.check?.title;
        this.iconPath = new vscode.ThemeIcon(
          'debug-breakpoint',
          new vscode.ThemeColor(this.getSeverityColor(this.severity.toString()))
        );
        break;
    }
  }

  /**
   * Returns the color for the severity of the finding
   * @param severity The severity of the finding
   * @returns The color for the severity
   * @private
   */
  private getSeverityColor(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
      case '4':
        return 'editorError.foreground'; // Built-in VS Code theme color for errors
      case 'HIGH':
      case '3':
        return 'errorForeground'; // For high warnings
      case 'MEDIUM':
      case '2':
        return 'editorWarning.foreground'; // For medium severity
      case 'LOW':
      case '1':
        return 'editorInfo.foreground'; // For low severity
      default:
        return 'foreground'; // Default color
    }
  }
}
