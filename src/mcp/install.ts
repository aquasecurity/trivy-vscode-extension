import * as child from 'child_process';

import * as vscode from 'vscode';

import { Output } from '../command/output';
import { openSettingsJsonAtSection } from '../utils';

export function isTrivyMCPInstalled(): boolean {
  const mcpConfig = vscode.workspace.getConfiguration('mcp');
  const mcpServers = mcpConfig.get('servers') as Record<string, object>;
  return mcpServers && 'trivy' in mcpServers;
}

export async function addMCPCodePrompt(): Promise<void> {
  const instructionText = `After updating packages, manifests, or infrastructure code (e.g., Terraform, Docker, Kubernetes), scan for security vulnerabilities and misconfigurations. Only apply fixes for issues directly related to your changes and as recommended by the scanner. Re-scan after applying fixes.`;

  // get config at github.copilot.chat.codeGeneration.instructions
  const github = vscode.workspace.getConfiguration('github');
  if (github) {
    const instructions = github.copilot.chat.codeGeneration.instructions;
    if (instructions) {
      for (const instruction of instructions) {
        if (instruction.text === instructionText) {
          // instruction already installed
          Output.getInstance().appendLineWithTimestamp(
            `MCP Code Prompt Instruction already installed, no further action required.`
          );
          return;
        }
      }
    }

    instructions.push({ text: instructionText });
    vscode.workspace
      .getConfiguration('github')
      .update(
        'copilot.chat.codeGeneration.instructions',
        instructions,
        vscode.ConfigurationTarget.Global
      );
    return openSettingsJsonAtSection(
      'github.copilot.chat.codeGeneration.instructions'
    );
  }
}

export async function installTrivyMCPServer(): Promise<void> {
  Output.show();

  const trivyConfig = vscode.workspace.getConfiguration('trivy');
  const trivyBinary = trivyConfig.get<string>('binaryPath', 'trivy');

  // make required changes to chat config
  const chatConfig = vscode.workspace.getConfiguration('chat');
  const agentEnabled = chatConfig.get<boolean>('agent.enabled', false);
  if (!agentEnabled) {
    Output.getInstance().appendLineWithTimestamp(
      'Enabling the agent in chat configuration to allow Trivy MCP server installation.'
    );
    // Enable the agent if it is not already enabled
    await chatConfig.update(
      'agent.enabled',
      true,
      vscode.ConfigurationTarget.Global
    );
  }

  const mcpDiscoveryEnabled = chatConfig.get<boolean>(
    'mcp.discovery.enabled',
    false
  );
  if (!mcpDiscoveryEnabled) {
    Output.getInstance().appendLineWithTimestamp(
      'Enabling MCP discovery in chat configuration to allow Trivy MCP server installation.'
    );
    // Enable MCP discovery if it is not already enabled
    await chatConfig.update(
      'mcp.discovery.enabled',
      true,
      vscode.ConfigurationTarget.Global
    );
  }

  const mcpConfig = vscode.workspace.getConfiguration('mcp');
  let mcpServers = mcpConfig.get('servers') as Record<string, object>;
  if (!mcpServers || typeof mcpServers !== 'object') {
    Output.getInstance().appendLineWithTimestamp(
      'No MCP servers configured. Initializing with an empty object.'
    );
    // Initialize mcpServers if it is not defined or not an object
    await mcpConfig.update('servers', {}, vscode.ConfigurationTarget.Global);
    mcpServers = {};
  }

  // Ensure trivy plugin installed
  const pluginInstalled = await installPlugin(trivyBinary);
  if (!pluginInstalled) {
    Output.getInstance().appendLineWithTimestamp(
      'Trivy plugin is not installed. Please install it before configuring the MCP server.'
    );
    return; // Exit if plugin is not installed
  }
  const useAquaPlatform = trivyConfig.get('useAquaPlatform', false);
  const args = ['mcp', '--trivy-binary', trivyBinary];
  if (useAquaPlatform) {
    args.push('--use-aqua-platform');
  }

  mcpServers['trivy'] = {
    type: 'stdio',
    command: 'trivy',
    args,
  };

  await vscode.workspace
    .getConfiguration('mcp')
    .update('servers', mcpServers, vscode.ConfigurationTarget.Global);

  Output.getInstance().appendLineWithTimestamp(
    'Trivy MCP server has been successfully installed and configured.'
  );

  // Open the user configuration file to show the changes
  await openSettingsJsonAtSection(
    'mcp.servers',
    'workbench.mcp.openUserMcpJson'
  );
}

/**
 * Installs the MCP plugin for Trivy
 * @returns Promise resolving to true if installed, false otherwise
 */
async function installPlugin(binary: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    Output.getInstance().appendLineWithTimestamp('Installing MCP Plugin');
    child.exec(`"${binary}" plugin install mcp`, (error, _, stdErr) => {
      Output.getInstance().appendLineWithTimestamp(stdErr);
      if (error) {
        Output.getInstance().appendLineWithTimestamp(
          `Error installing MCP Plugin: ${error.message}`
        );
        resolve(false);
        return;
      }

      Output.getInstance().appendLineWithTimestamp(
        'MCP Plugin installed successfully.'
      );
      resolve(true);
    });
  });
}
