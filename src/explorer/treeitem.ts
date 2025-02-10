import path from 'path';
import * as vscode from 'vscode';
import { TrivyResult } from './result';

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
      check?: TrivyResult;
      command?: vscode.Command;
      workspacePath?: string;
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
      case TrivyTreeItemType.workspace:
        this.title = workspaceName;
        this.tooltip = properties?.workspacePath;
        this.iconPath = new vscode.ThemeIcon('folder-opened');
        break;
      case TrivyTreeItemType.misconfigFile:
      case TrivyTreeItemType.vulnerabilityFile:
      case TrivyTreeItemType.secretFile:
      case TrivyTreeItemType.misconfigInstance:
        this.tooltip = `${properties?.check?.description}`;
        this.iconPath = vscode.ThemeIcon.File;
        this.resourceUri = vscode.Uri.parse(this.filename);
        break;
      case TrivyTreeItemType.secretInstance:
      case TrivyTreeItemType.secretCode:
        this.tooltip = this.id;
        this.iconPath = {
          light: path.join(
            __filename,
            '..',
            '..',
            'resources',
            'light',
            'key.svg'
          ),
          dark: path.join(
            __filename,
            '..',
            '..',
            'resources',
            'dark',
            'key.svg'
          ),
        };
        break;
      case TrivyTreeItemType.misconfigCode:
      case TrivyTreeItemType.vulnerabilityCode:
        this.tooltip = properties?.check?.title;
        this.iconPath = {
          light: path.join(
            __filename,
            '..',
            '..',
            'resources',
            this.severityIcon(this.severity)
          ),
          dark: path.join(
            __filename,
            '..',
            '..',
            'resources',
            this.severityIcon(this.severity)
          ),
        };
        break;
    }
  }

  severityIcon = (severity: string): string => {
    switch (severity) {
      case 'CRITICAL':
        return 'critical.svg';
      case 'HIGH':
        return 'high.svg';
      case 'MEDIUM':
        return 'medium.svg';
      case 'LOW':
        return 'low.svg';
    }
    return 'unknown.svg';
  };
}

export enum TrivyTreeItemType {
  misconfigCode = 0,
  misconfigInstance = 1,
  vulnerablePackage = 2,
  vulnerabilityCode = 3,
  misconfigFile = 4,
  vulnerabilityFile = 5,
  secretFile = 6,
  secretInstance = 7,
  secretCode = 8,
  workspace = 9,
}
