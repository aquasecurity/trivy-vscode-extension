
import * as assert from 'assert';
import * as vscode from 'vscode'
import { getTrivyCommandOptions } from '../../../src/command/options';

class mockConfig{
  private values: { [key: string]: boolean | string } = {
    'debug': true,
    'offlineScan': true,
    'fixedOnly': true,
    'ignoreFilePath': '.trivyignore.yaml',
    'useIgnoreFile': true,
  }


  get<T>(section: string): T | undefined {
    return this.values[section] as T || undefined;
  }

  update(section: string, value: string | boolean) {
    this.values[section] = value;
  }
}

suite('trivy command options', function (): void {

  vscode.window.showInformationMessage('Start trivy command options tests.');

  test('Trivy debug command option', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    let command : string[] = []

    const commandOption = getTrivyCommandOptions('debug');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--debug');
  });

  test('Trivy scanners command option', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    let command : string[] = []

    const commandOption = getTrivyCommandOptions('scanners');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--scanners=misconfig,vuln'); 
  });

  test('Trivy scanners command option with secretScan enabled', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    config.update('secretScanning', true)


    let command : string[] = []

    const commandOption = getTrivyCommandOptions('scanners');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--scanners=misconfig,vuln,secret');
  });


  test('Trivy offline scan command option', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    let command : string[] = []

    const commandOption = getTrivyCommandOptions('offlineScan');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--offline-scan');
  });

  test('Trivy fixed only command option', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    let command : string[] = []

    const commandOption = getTrivyCommandOptions('fixedOnly');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--ignore-unfixed');
  });

  test('Trivy ignore file option', () => {
    const config = new mockConfig() as unknown as vscode.WorkspaceConfiguration;
    let command : string[] = []

    const commandOption = getTrivyCommandOptions('useTrivyIgnoreFile');
    command = commandOption.apply(command, config);

    assert.strictEqual(command.join(' '), '--ignorefile=.trivyignore.yaml');
  });

});