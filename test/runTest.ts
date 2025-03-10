import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    const developmentPath = path.resolve(__dirname, '../');
    const testsPath = path.resolve(__dirname, './suite/index');

    await runTests({
      extensionDevelopmentPath: developmentPath,
      extensionTestsPath: testsPath,
      launchArgs: ['--wait'], // Ensure process waits
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();
