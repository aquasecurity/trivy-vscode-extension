/* eslint-disable @typescript-eslint/no-explicit-any */

import * as vscode from 'vscode';
import { TrivyWrapper } from './command/command';
import { TrivyTreeViewProvider } from './explorer/treeview';

function register(
  context: vscode.ExtensionContext,
  commandName: string,
  handler: (...args: any[]) => any
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(commandName, handler)
  );
}

async function getFilePath(
  config: vscode.WorkspaceConfiguration,
  purpose: string,
  key: string,
  extensions: string[]
) {
  const paths = await vscode.window.showOpenDialog({
    openLabel: `Select ${purpose}`,
    canSelectMany: false,

    filters: {
      key: extensions,
    },
  });

  if (paths && paths.length > 0) {
    config.update(key, paths[0]?.fsPath);
  }
}

export function registerCommands(
  context: vscode.ExtensionContext,
  trivyWrapper: TrivyWrapper,
  misconfigProvider: TrivyTreeViewProvider,
  config: vscode.WorkspaceConfiguration
) {
  register(context, 'trivy.scan', () => trivyWrapper.run());
  register(context, 'trivy.version', () =>
    trivyWrapper.showCurrentTrivyVersion()
  );
  register(context, 'trivy.refresh', () => misconfigProvider.refresh());
  register(context, 'trivy.useIgnoreFile', () =>
    updateConfigAndContext(config, 'useIgnoreFile', true)
  );
  register(context, 'trivy.disableUseIgnoreFile', () =>
    updateConfigAndContext(config, 'useIgnoreFile', false)
  );
  register(context, 'trivy.unsetIgnoreFilePath', () =>
    config.update('ignoreFilePath', undefined)
  );
  register(context, 'trivy.offlineScan', () =>
    updateConfigAndContext(config, 'offlineScan', true)
  );
  register(context, 'trivy.disableOfflineScan', () =>
    updateConfigAndContext(config, 'offlineScan', false)
  );
  register(context, 'trivy.scanForSecrets', () =>
    updateConfigAndContext(config, 'secretScanning', true)
  );
  register(context, 'trivy.disableScanForSecrets', () =>
    updateConfigAndContext(config, 'secretScanning', false)
  );
  register(context, 'trivy.onlyFixedIssues', () =>
    updateConfigAndContext(config, 'fixedOnly', true)
  );
  register(context, 'trivy.disableOnlyFixedIssues', () =>
    updateConfigAndContext(config, 'fixedOnly', false)
  );
  register(context, 'trivy.useConfigFile', () =>
    updateConfigAndContext(config, 'useConfigFile', true)
  );
  register(context, 'trivy.unsetConfigFilePath', () =>
    config.update('configFilePath', undefined)
  );
  register(context, 'trivy.disableUseConfigFile', () => {
    updateConfigAndContext(config, 'useConfigFile', false);
    updateConfigAndContext(config, 'onlyUseConfigFile', false);
  });
  register(context, 'trivy.onlyUseConfigFile', () => {
    updateConfigAndContext(config, 'onlyUseConfigFile', true);
    updateConfigAndContext(config, 'useConfigFile', true);
  });
  register(context, 'trivy.disableOnlyUseConfigFile', () =>
    updateConfigAndContext(config, 'onlyUseConfigFile', false)
  );

  register(context, 'trivy.setIgnoreFilePath', async () => {
    await getFilePath(config, 'Ignore file', 'ignoreFilePath', ['.yaml', '*']);
  });
  register(context, 'trivy.setConfigFilePath', async () => {
    await getFilePath(config, 'Config file', 'configFilePath', ['*']);
  });
}

function updateConfigAndContext(
  config: vscode.WorkspaceConfiguration,
  key: string,
  value: string | boolean
) {
  config.update(key, value);
}
