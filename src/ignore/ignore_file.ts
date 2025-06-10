import * as fs from 'fs';

import * as yaml from 'js-yaml';
import * as vscode from 'vscode';

import { TrivyTreeItem } from '../ui/treeview/treeitem';
import { TrivyTreeItemType } from '../ui/treeview/treeitem_types';

// Define types for YAML content
interface IgnoreEntry {
  id: string;
}

type YamlContentType = Record<string, (IgnoreEntry | string)[]>;

export function addIgnoreFileEntry(item: TrivyTreeItem) {
  console.log('Adding entry to ignore file:', item);

  switch (item.itemType) {
    case TrivyTreeItemType.vulnerabilityCode:
      addIgnoreFileEntryForCode(item, 'vulnerabilities');
      break;
    case TrivyTreeItemType.misconfigCode:
      addIgnoreFileEntryForCode(item, 'misconfigurations');
      break;
    case TrivyTreeItemType.secretCode:
      addIgnoreFileEntryForCode(item, 'secrets');
      break;
    default:
      console.warn(`Unsupported item type for ignore file: ${item.itemType}`);
      return;
  }

  function addIgnoreFileEntryForCode(item: TrivyTreeItem, type: string) {
    // Construct the ignore file path based on the workspace name and type
    const ignoreFilePath = getIgnoreFilePath(item.workspaceName);
    if (!ignoreFilePath) {
      console.error(
        `No ignore file path found for workspace: ${item.workspaceName}`
      );
      vscode.window.showErrorMessage(
        `No ignore file path found for workspace: ${item.workspaceName}`
      );
      return;
    }

    const itemId = item.id || item.code;

    if (ignoreFilePath.endsWith('.yaml')) {
      writeToYamlIgnore();
    } else {
      // open the text file and add the item id to the bottom if it doesn't already exist
      writeToLegacyIgnore();
    }

    function writeToLegacyIgnore() {
      try {
        if (fs.existsSync(ignoreFilePath)) {
          const existingContent = fs.readFileSync(ignoreFilePath, 'utf8');
          if (!existingContent.includes(itemId)) {
            fs.appendFileSync(ignoreFilePath, `\n${itemId}`);
            console.log(
              `Entry added to ignore file ${ignoreFilePath}: ${type}:${itemId}`
            );
            vscode.window.showInformationMessage(
              `Added ${itemId} to ignore file under ${type}`
            );
          } else {
            console.log(
              `Entry already exists in ignore file: ${type}:${itemId}`
            );
          }
        } else {
          fs.writeFileSync(ignoreFilePath, `${type}:${itemId}\n`);
          console.log(
            `Created new ignore file and added entry: ${type}:${itemId}`
          );
          vscode.window.showInformationMessage(
            `Created new ignore file and added ${itemId} under ${type}`
          );
        }
      } catch (err) {
        console.error(`Failed to write to ignore file: ${err}`);
        vscode.window.showErrorMessage(`Failed to add to ignore file: ${err}`);
      }
    }

    function writeToYamlIgnore() {
      // Read the existing ignore file content or create a new one
      let yamlContent: YamlContentType = {};

      try {
        if (fs.existsSync(ignoreFilePath)) {
          const existingContent = fs.readFileSync(ignoreFilePath, 'utf8');
          if (existingContent.trim()) {
            // Parse the YAML content
            const parsedContent = yaml.load(existingContent);
            // Make sure it's an object we can work with
            if (parsedContent && typeof parsedContent === 'object') {
              yamlContent = parsedContent as YamlContentType;
            }
          }
        }
      } catch (err) {
        console.error(`Error reading or parsing ignore file: ${err}`);
        // Create a new file if there's an error
        yamlContent = {} as YamlContentType;
      }

      // Add the type as a top-level attribute if it doesn't exist
      if (!yamlContent[type]) {
        yamlContent[type] = [];
      }

      // Add the item ID as a child if it doesn't already exist
      const existingEntry = yamlContent[type].find((entry) => {
        // Handle both object format and string format
        if (typeof entry === 'object' && entry !== null) {
          return entry.id === itemId;
        }
        return entry === itemId || entry === `id: ${itemId}`;
      });

      // Write the updated content back to the ignore file
      try {
        if (!existingEntry) {
          // Add as an object with id property
          yamlContent[type].push({ id: itemId });

          const updatedContent = yaml.dump(yamlContent, {
            lineWidth: -1, // Don't wrap lines
            noRefs: true, // Don't use anchors and aliases
            indent: 2, // 2-space indentation
            quotingType: '"', // Use double quotes when needed
            forceQuotes: false, // Only quote when necessary
          });

          fs.writeFileSync(ignoreFilePath, updatedContent);
          // Show a notification to the user
          vscode.window.showInformationMessage(
            `Added ${itemId} to ignore file under ${type}`
          );
        }
      } catch (writeErr) {
        console.error(`Failed to write to ignore file: ${writeErr}`);
        vscode.window.showErrorMessage(
          `Failed to add to ignore file: ${writeErr}`
        );
      }
    }
  }

  function getIgnoreFilePath(workspaceName: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.name === workspaceName
    )?.uri.fsPath;
    if (!workspaceFolder) {
      console.error(`No workspace folder found for: ${workspaceName}`);
      return '';
    }

    // check if there is a workspace configured ignore file
    const config = vscode.workspace.getConfiguration('trivy');
    const workspaceIgnoreFile = config.get<string>('ignoreFile');
    if (workspaceIgnoreFile) {
      // If a specific ignore file is configured, return its path
      return vscode.Uri.file(workspaceIgnoreFile).fsPath;
    }

    // Construct the ignore file path based on the workspace name and type

    const possibleIgnoreFiles = ['.trivyignore.yaml', '.trivyignore'];

    return (
      possibleIgnoreFiles
        .map((file) => vscode.Uri.file(`${workspaceFolder}/${file}`).fsPath)
        .find((file) => {
          // Check if the file exists
          try {
            return fs.existsSync(file);
          } catch (err) {
            console.error(`Error checking if ignore file exists: ${err}`);
            return false;
          }
        }) || vscode.Uri.file(`${workspaceFolder}/.trivyignore.yaml`).fsPath
    );
  }
}
