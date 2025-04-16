/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync } from 'child_process';

import * as vscode from 'vscode';

import { ScanType, TrivyWrapper } from '../command/command';
import { JSONFormatOption, QuietOption } from '../command/options';

import { ScannersOption, SeverityOption } from './mcp_options';
import {
  GET_TRIVY_VERSION,
  mcpTools,
  SCAN_WITH_TRIVY,
  UPDATE_TRIVY_TREEVIEW,
} from './tools';

const toolNames = mcpTools.map((tool) => tool.name);

export const runTool = async (
  name: string,
  args: any,
  trivyWrapper?: TrivyWrapper
) => {
  let result: any;
  if (!toolNames.includes(name)) {
    throw new Error(`Unknown tool: ${name}`);
  }
  // Verify file exists before proceeding
  const uri = vscode.Uri.parse(args?.textDocument?.uri ?? '');
  try {
    await vscode.workspace.fs.stat(uri);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: File not found - ${uri.fsPath}. ${error}`,
        },
      ],
      isError: true,
    };
  }

  switch (name) {
    case UPDATE_TRIVY_TREEVIEW:
      {
        console.log(`Running tool: ${name}`);
        vscode.commands.executeCommand('trivy.scan');
        return 'updated treeview';
      }
      break;
    case GET_TRIVY_VERSION:
      {
        console.log(`Running tool: ${name}`);
        if (!trivyWrapper) {
          throw new Error('TrivyWrapper is not defined');
        }
        const version = await trivyWrapper.getInstalledTrivyVersion();
        console.log(`Trivy version: ${version}`);
        return version;
      }
      break;
    case SCAN_WITH_TRIVY: {
      console.log(`Running tool: ${name}`);
      console.log(`Arguments: ${JSON.stringify(args)}`);

      if (!trivyWrapper) {
        throw new Error('TrivyWrapper is not defined');
      }

      const uri = vscode.Uri.parse(args?.projectPath ?? '');
      if (!uri) {
        throw new Error('Invalid URI');
      }
      const workspaceName =
        vscode.workspace.getWorkspaceFolder(uri)?.name || 'workspace';

      const cmd = trivyWrapper.buildCommand(
        args.projectPath,
        workspaceName,
        ScanType.FilesystemScan,
        [
          new ScannersOption(args.scanType),
          new SeverityOption(args.severities),
          new JSONFormatOption(),
          new QuietOption(),
        ]
      );

      console.log(`Command: ${cmd}`);

      // get the extension context
      const binary = trivyWrapper.getTrivyBinaryPath();
      if (!binary) {
        throw new Error('Trivy binary not found');
      }

      // execute the command and get the result as json
      const result = execSync(binary + ' ' + cmd.join(' '), {
        cwd: args.projectPath,
      }).toString();
      const resultJson = JSON.parse(result);

      let output = '';

      for (const result of resultJson.Results) {
        if (result.Vulnerabilities) {
          for (const vulnerability of result.Vulnerabilities) {
            output += `Filepath: ${result.Target}\n`;
            output += `Vulnerability: ${vulnerability.VulnerabilityID}\n`;
            output += `Severity: ${vulnerability.Severity}\n`;
            output += `Description: ${vulnerability.Description}\n`;
            output += `Package Name: ${vulnerability.PkgName}\n`;
            output += `Installed Version: ${vulnerability.InstalledVersion}\n`;
            output += `Fixed Version: ${vulnerability.FixedVersion}\n\n`;
          }
        }
        if (result.Misconfigurations) {
          for (const misconfig of result.Misconfigurations) {
            output += `Filepath: ${result.Target}\n`;
            output += `Misconfiguration: ${misconfig.VulnerabilityID}\n`;
            output += `Severity: ${misconfig.Severity}\n`;
            output += `Description: ${misconfig.Description}\n`;
            output += `Package Name: ${misconfig.PkgName}\n`;
            output += `Installed Version: ${misconfig.InstalledVersion}\n\n`;
          }
        }
        if (result.Licenses) {
          for (const license of result.Licenses) {
            output += `Filepath: ${result.Target}\n`;
            output += `License: ${license.VulnerabilityID}\n`;
            output += `Severity: ${license.Severity}\n`;
            output += `Description: ${license.Description}\n`;
            output += `Package Name: ${license.PkgName}\n`;
            output += `Installed Version: ${license.InstalledVersion}\n\n`;
          }
        }
        if (result.Secrets) {
          for (const secret of result.Secrets) {
            output += `Filepath: ${result.Target}\n`;
            output += `Secret: ${secret.VulnerabilityID}\n`;
            output += `Severity: ${secret.Severity}\n`;
            output += `Description: ${secret.Description}\n`;
            output += `Package Name: ${secret.PkgName}\n`;
            output += `Installed Version: ${secret.InstalledVersion}\n\n`;
          }
        }
      }

      return output;

      break;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
  return result;
};
