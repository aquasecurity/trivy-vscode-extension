import * as assert from 'assert';
import * as child from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as vscode from 'vscode';

import { TrivyWrapper } from '../../../src/command/command';

function stubBinaryPath(binaryPath: string): () => void {
  const originalGetConfiguration = vscode.workspace.getConfiguration.bind(
    vscode.workspace
  );

  vscode.workspace.getConfiguration = ((section?: string) => {
    if (section === 'trivy') {
      return {
        get: <T>(key: string, defaultValue?: T) =>
          key === 'binaryPath' ? (binaryPath as T) : defaultValue,
      } as vscode.WorkspaceConfiguration;
    }
    return originalGetConfiguration(section);
  }) as typeof vscode.workspace.getConfiguration;

  return () => {
    vscode.workspace.getConfiguration =
      originalGetConfiguration as typeof vscode.workspace.getConfiguration;
  };
}

function createFakeTrivyBinary(argsFile: string): string {
  const scriptPath = path.join(
    os.tmpdir(),
    `fake-trivy-${process.pid}-${Date.now()}.sh`
  );
  const script = `#!/bin/sh
printf '%s\\n' "$@" >> "${argsFile}"
case "$1" in
  --help) exit 0 ;;
  --version) echo "Version: 0.50.0"; exit 0 ;;
esac
if [ "$1" = "plugin" ] && [ "$2" = "upgrade" ] && [ "$3" = "aqua" ]; then
  echo "Plugin upgraded" >&2
  exit 0
fi
exit 1
`;

  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  return scriptPath;
}

function readRecordedArgs(argsFile: string): string[] {
  if (!fs.existsSync(argsFile)) {
    return [];
  }

  return fs
    .readFileSync(argsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

suite('trivy binaryPath command execution', function (): void {
  let restoreConfiguration: (() => void) | undefined;
  let argsFile = '';
  let fakeBinary = '';

  teardown(() => {
    restoreConfiguration?.();
    restoreConfiguration = undefined;

    for (const file of [argsFile, fakeBinary]) {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }

    argsFile = '';
    fakeBinary = '';
  });

  test('isInstalled uses execFileSync with argument array, not shell interpolation', async () => {
    argsFile = path.join(
      os.tmpdir(),
      `trivy-args-${process.pid}-${Date.now()}.log`
    );
    fakeBinary = createFakeTrivyBinary(argsFile);
    restoreConfiguration = stubBinaryPath(fakeBinary);

    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    const installed = await wrapper.isInstalled();

    assert.strictEqual(installed, true);
    assert.deepStrictEqual(readRecordedArgs(argsFile), ['--help']);
  });

  test('isInstalled does not execute shell metacharacters in binaryPath', async () => {
    const marker = path.join(
      os.tmpdir(),
      `trivy-marker-${process.pid}-${Date.now()}.txt`
    );
    const injectedBinary = `trivy"; touch "${marker}" #`;

    try {
      fs.unlinkSync(marker);
    } catch {
      // marker may not exist
    }

    restoreConfiguration = stubBinaryPath(injectedBinary);

    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    const installed = await wrapper.isInstalled();

    assert.strictEqual(installed, false);
    assert.strictEqual(fs.existsSync(marker), false);
  });

  test('getInstalledTrivyVersion uses spawn with shell disabled', async () => {
    argsFile = path.join(
      os.tmpdir(),
      `trivy-args-${process.pid}-${Date.now()}.log`
    );
    fakeBinary = createFakeTrivyBinary(argsFile);
    restoreConfiguration = stubBinaryPath(fakeBinary);

    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    const version = await wrapper.getInstalledTrivyVersion();

    assert.strictEqual(version, '0.50.0');
    const recordedArgs = readRecordedArgs(argsFile);
    assert.ok(recordedArgs.includes('--help'));
    assert.ok(recordedArgs.includes('--version'));
  });

  test('updateAquaPluginVersion uses spawn with shell disabled', async () => {
    argsFile = path.join(
      os.tmpdir(),
      `trivy-args-${process.pid}-${Date.now()}.log`
    );
    fakeBinary = createFakeTrivyBinary(argsFile);
    restoreConfiguration = stubBinaryPath(fakeBinary);

    const wrapper = new TrivyWrapper('/tmp/results', '/ext');
    await wrapper.updateAquaPluginVersion();

    const recordedArgs = readRecordedArgs(argsFile);
    assert.ok(recordedArgs.includes('--help'));
    assert.ok(recordedArgs.includes('plugin'));
    assert.ok(recordedArgs.includes('upgrade'));
    assert.ok(recordedArgs.includes('aqua'));
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
