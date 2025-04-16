/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as child from 'child_process';
import * as fs from 'fs';
import path from 'path';

import { ExtensionContext } from 'vscode';

import { ScanType, TrivyWrapper } from '../../src/command/command';
import { ExitCodeOption, QuietOption } from '../../src/command/options';
import {
  showErrorMessage,
  showInformationMessage,
} from '../../src/notification/notifications';

const testsRoot = path.resolve(__dirname, '..');

suite('extension', function (): void {
  this.timeout(10000); // Give the test 10 seconds to allow for the CI vscode to download
  showInformationMessage('Start all tests.');

  const executeTrivyCommand = function (projectPath: string): string {
    const targetDir = fs.mkdtempSync(projectPath);
    const extensionDir = path.resolve(__dirname, '../../');
    const context = {
      extensionPath: extensionDir,
    };
    const wrapper = new TrivyWrapper(targetDir, context as ExtensionContext);

    const commandArgs = wrapper.buildCommand(
      projectPath,
      'workspace1',
      ScanType.FilesystemScan,
      [new QuietOption(), new ExitCodeOption(10)]
    );
    const command = `trivy ${commandArgs.join(' ')}`;

    console.log('Running command: ' + command);

    try {
      return child.execSync(command).toString();
    } catch (result: any) {
      switch (result.status) {
        case 10: {
          showErrorMessage(
            'Trivy: Vulnerabilities found, check logs for details.'
          );
          return result.stdout.toString();
        }
        default: {
          showErrorMessage(
            'Failed to run Trivy scan, error: ' +
              result.status +
              ' check logs for details.'
          );
          return result.stdout.toString();
        }
      }
    }
    return '';
  };

  test('Sample test', () => {
    console.log('Running sample test...');
    assert.strictEqual(1, 1);
  });

  test('Not a vulnerable project', () => {
    const got = executeTrivyCommand(testsRoot + '/golden/not-vulnerable');
    fs.writeFileSync(testsRoot + '/golden/expected/not-vulnerable.out', got);

    const expected = fs.readFileSync(
      testsRoot + '/golden/expected/not-vulnerable.out',
      'utf8'
    );
    assert.strictEqual(
      got,
      expected,
      'should be equal and no vulnerabilities found'
    );
  });

  test('Vulnerable project', () => {
    const got = executeTrivyCommand(testsRoot + '/golden/vulnerable');
    fs.writeFileSync(testsRoot + '/golden/expected/vulnerable.out', got);

    const expected = fs.readFileSync(
      testsRoot + '/golden/expected/vulnerable.out',
      'utf8'
    );
    assert.strictEqual(
      got,
      expected,
      'should be equal and vulnerablities found'
    );
  });
});
