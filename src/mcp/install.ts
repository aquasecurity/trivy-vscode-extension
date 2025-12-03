import * as child from 'child_process';

import * as vscode from 'vscode';

import { Output } from '../command/output';
import { openSettingsJsonAtSection } from '../utils';

interface McpServerConfig {
  type: string;
  command: string;
  args: string[];
}

interface McpJsonConfig {
  mcp?: {
    servers?: Record<string, McpServerConfig>;
  };
  servers?: Record<string, McpServerConfig>;
}

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
  const isRemote = Boolean(vscode.env.remoteName);
  const settingsTarget = isRemote
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;

  if (isRemote) {
    Output.getInstance().appendLineWithTimestamp(
      'Remote workspace detected. Trivy MCP settings will be written to the current workspace so they stay alongside the remote binary.'
    );
  }

  // make required changes to chat config
  const chatConfig = vscode.workspace.getConfiguration('chat');
  const agentEnabled = chatConfig.get<boolean>('agent.enabled', false);
  if (!agentEnabled) {
    Output.getInstance().appendLineWithTimestamp(
      'Enabling the agent in chat configuration to allow Trivy MCP server installation.'
    );
    // Enable the agent if it is not already enabled
    await chatConfig.update('agent.enabled', true, settingsTarget);
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
    await chatConfig.update('mcp.discovery.enabled', true, settingsTarget);
  }

  // Ensure trivy plugin installed
  const pluginInstalled = await installPlugin(trivyBinary);
  if (!pluginInstalled) {
    Output.getInstance().appendLineWithTimestamp(
      'Trivy plugin is not installed. Please install it before configuring the MCP server.'
    );
    return;
  }

  const useAquaPlatform = trivyConfig.get('useAquaPlatform', false);
  const args = ['mcp', '--trivy-binary', trivyBinary];
  if (useAquaPlatform) {
    args.push('--use-aqua-platform');
  }

  const trivyServer: McpServerConfig = {
    type: 'stdio',
    command: trivyBinary,
    args,
  };

  // Open the MCP JSON file first to get the document
  const openCommand = isRemote
    ? 'workbench.mcp.openRemoteUserMcpJson'
    : 'workbench.mcp.openUserMcpJson';

  await vscode.commands.executeCommand(openCommand);

  // Wait for the editor to open
  await new Promise((resolve) => setTimeout(resolve, 100));

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    Output.getInstance().appendLineWithTimestamp(
      'Failed to open MCP configuration file.'
    );
    return;
  }

  const document = editor.document;
  if (!document.fileName.endsWith('mcp.json')) {
    Output.getInstance().appendLineWithTimestamp(
      'Unexpected file opened. Expected MCP configuration file.'
    );
    return;
  }
  const text = document.getText();

  let config: McpJsonConfig = {};
  try {
    if (text.trim()) {
      config = JSON.parse(text);
    }
  } catch {
    Output.getInstance().appendLineWithTimestamp(
      'Failed to parse existing MCP configuration, creating new one.'
    );
  }

  // Handle both possible structures: { servers: {} } or { mcp: { servers: {} } }
  if (config.mcp?.servers !== undefined) {
    config.mcp.servers['trivy'] = trivyServer;
  } else if (config.servers !== undefined) {
    config.servers['trivy'] = trivyServer;
  } else {
    config.servers = { trivy: trivyServer };
  }

  const newContent = JSON.stringify(config, null, '\t');

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(text.length)
  );

  try {
    await editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, newContent);
    });
    await document.save();
  } catch (error) {
    Output.getInstance().appendLineWithTimestamp(
      `Failed to update MCP configuration: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }
  Output.getInstance().appendLineWithTimestamp(
    'Trivy MCP server has been successfully installed and configured.'
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
