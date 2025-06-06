import * as path from 'path';

import glob from 'glob-promise';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000, // give the test 10 seconds
  });

  const testsRoot = path.resolve(__dirname, '../');
  console.log(`testsRoot: ${testsRoot}`);

  return new Promise((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot })
      .then((files) => {
        files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

        try {
          mocha.run((failures) => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      })
      .catch((err) => reject(err));
  });
}
