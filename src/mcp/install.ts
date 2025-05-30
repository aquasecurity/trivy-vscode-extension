import * as child from 'child_process';

import * as vscode from 'vscode';

import { Output } from '../command/output';
import { openSettingsJsonAtSection } from '../utils';

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

  const mcpServers = vscode.workspace
    .getConfiguration('mcp')
    .get('servers') as Record<string, object>;
  if (!mcpServers || typeof mcpServers !== 'object') {
    Output.getInstance().appendLineWithTimestamp(
      'No MCP servers configured. Initializing with an empty object.'
    );
  }

  // Ensure trivy plugin installed
  const pluginInstalled = await installPlugin(trivyBinary);
  if (!pluginInstalled) {
    Output.getInstance().appendLineWithTimestamp(
      'Trivy plugin is not installed. Please install it before configuring the MCP server.'
    );
    return; // Exit if plugin is not installed
  }

  for (const server of Object.keys(mcpServers as Record<string, unknown>)) {
    if (server.toLocaleLowerCase() === 'trivy') {
      Output.getInstance().appendLineWithTimestamp(
        'Trivy MCP server is already configured.'
      );
      return; // Trivy MCP server is already configured
    }
  }

  mcpServers['trivy'] = {
    type: 'stdio',
    command: 'trivy',
    args: ['mcp', '--trivy-binary', trivyBinary],
  };

  await vscode.workspace
    .getConfiguration('mcp')
    .update('servers', mcpServers, vscode.ConfigurationTarget.Global);

  Output.getInstance().appendLineWithTimestamp(
    'Trivy MCP server has been successfully installed and configured.'
  );

  // Open the user configuration file to show the changes
  await openSettingsJsonAtSection('mcp.servers');
}

/**
 * Check if Trivy is installed
 * @returns Promise resolving to true if installed, false otherwise
 */
async function installPlugin(binary: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      Output.getInstance().appendLineWithTimestamp('Installing MCP Plugin');
      child.execSync(`"${binary}" plugin install mcp`, { stdio: 'ignore' });
      Output.getInstance().appendLineWithTimestamp(
        'MCP Plugin installed successfully.'
      );
      resolve(true);
    } catch (error) {
      Output.getInstance().appendLineWithTimestamp(
        `Failed to install MCP Plugin: ${error instanceof Error ? error.message : String(error)}`
      );
      resolve(false);
    }
  });
}
