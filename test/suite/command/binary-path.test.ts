/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as child from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as vscode from 'vscode';

import { TrivyWrapper } from '../../../src/command/command';

const maliciousBinaryPath = 'trivy"; id #';

suite('trivy binaryPath command execution', function (): void {
  let originalExecFileSync: typeof child.execFileSync;
  let originalSpawn: typeof child.spawn;
  let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
  let execFileSyncCalls: Array<{
    binary: string;
    args: string[];
    options: child.ExecFileSyncOptions;
  }>;
  let spawnCalls: Array<{
    binary: string;
    args: string[];
    options: child.SpawnOptions;
    process: child.ChildProcess;
  }>;

  setup(() => {
    execFileSyncCalls = [];
    spawnCalls = [];

    originalExecFileSync = child.execFileSync;
    originalSpawn = child.spawn;
    originalGetConfiguration =
      vscode.workspace.getConfiguration.bind(vscode.workspace);

    (child as any).execFileSync = (
      binary: string,
      args: string[],
      options: child.ExecFileSyncOptions
    ) => {
      execFileSyncCalls.push({ binary, args, options });
      return Buffer.from('');
    };

    (child as any).spawn = (
      binary: string,
      args: string[],
      options: child.SpawnOptions
    ) => {
      const process = new EventEmitter() as child.ChildProcess;
      (process as any).stdout = new EventEmitter();
      (process as any).stderr = new EventEmitter();
      process.kill = () => true;
      spawnCalls.push({ binary, args, options, process });
      return process;
    };

    vscode.workspace.getConfiguration = ((section?: string) => {
      if (section === 'trivy') {
        return {
          get: <T>(key: string, defaultValue?: T) =>
            key === 'binaryPath'
              ? (maliciousBinaryPath as T)
              : defaultValue,
        } as vscode.WorkspaceConfiguration;
      }
      return originalGetConfiguration(section);
    }) as typeof vscode.workspace.getConfiguration;
  });

  teardown(() => {
    (child as any).execFileSync = originalExecFileSync;
    (child as any).spawn = originalSpawn;
    vscode.workspace.getConfiguration = originalGetConfiguration;
  });

  test('isInstalled uses execFileSync with argument array, not shell interpolation', async () => {
    const wrapper = new TrivyWrapper('/tmp/results', '/ext');

    const installed = await wrapper.isInstalled();

    assert.strictEqual(installed, true);
    assert.strictEqual(execFileSyncCalls.length, 1);
    assert.strictEqual(execFileSyncCalls[0].binary, maliciousBinaryPath);
    assert.deepStrictEqual(execFileSyncCalls[0].args, ['--help']);
    assert.deepStrictEqual(execFileSyncCalls[0].options, { stdio: 'ignore' });
  });

  test('getInstalledTrivyVersion uses spawn with shell disabled', async () => {
    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    const versionPromise = wrapper.getInstalledTrivyVersion();

    const spawnCall = spawnCalls.find((call) =>
      call.args.includes('--version')
    );
    assert.ok(spawnCall, 'expected spawn call for --version');
    assert.strictEqual(spawnCall.binary, maliciousBinaryPath);
    assert.deepStrictEqual(spawnCall.args, ['--version']);
    assert.strictEqual(spawnCall.options.shell, false);

    spawnCall.process.stdout?.emit('data', 'Version: 0.50.0\n');
    (spawnCall.process as EventEmitter).emit('exit', 0);

    const version = await versionPromise;
    assert.strictEqual(version, '0.50.0');
  });

  test('updateAquaPluginVersion uses spawn with shell disabled', async () => {
    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    const updatePromise = wrapper.updateAquaPluginVersion();

    const spawnCall = spawnCalls.find((call) =>
      call.args.includes('plugin')
    );
    assert.ok(spawnCall, 'expected spawn call for plugin upgrade');
    assert.strictEqual(spawnCall.binary, maliciousBinaryPath);
    assert.deepStrictEqual(spawnCall.args, ['plugin', 'upgrade', 'aqua']);
    assert.strictEqual(spawnCall.options.shell, false);

    spawnCall.process.stderr?.emit('data', 'Plugin upgraded successfully\n');

    await updatePromise;
  });
});

suite('trivy binaryPath injection regression', function (): void {
  test('execFileSync does not execute shell metacharacters in binary path', () => {
    const marker = path.join(
      os.tmpdir(),
      `trivy-injection-${process.pid}-${Date.now()}.txt`
    );
    const injectedBinary = `trivy"; touch "${marker}" #`;

    try {
      fs.unlinkSync(marker);
    } catch {
      // marker may not exist
    }

    try {
      child.execFileSync(injectedBinary, ['--help'], { stdio: 'ignore' });
      assert.fail('expected execFileSync to throw for invalid executable');
    } catch (error) {
      assert.ok(error instanceof Error);
    }

    assert.strictEqual(
      fs.existsSync(marker),
      false,
      'shell metacharacters in binary path must not execute commands'
    );
  });
});
