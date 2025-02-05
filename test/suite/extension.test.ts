import * as assert from 'assert';
import * as fs from 'fs';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import path from 'path';
import *  as trivyExtension from  '../../src/extension'; // Adjust the import path as necessary

const testsRoot = path.resolve(__dirname, '..');
  
suite('Extension Test Suite', function (): void {
  this.timeout(10000); // Give the test 10 seconds to allow for the CI vscode to download
  vscode.window.showInformationMessage('Start all tests.');

  test('Not a vulnerable project', () => {
    const got = trivyExtension.runCommand(
      'trivy --quiet filesystem --exit-code=10',
      testsRoot + '/golden/not-vulnerable'
    );
    const expected = '';
    assert.strictEqual(
      got,
      expected,
      'should be equal and no vulnerabilities found'
    );
  });

  test('Vulnerable project', () => {
    const got = trivyExtension.runCommand(
      'trivy --quiet filesystem --exit-code=10',
      testsRoot + '/golden/vulnerable'
    );
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
