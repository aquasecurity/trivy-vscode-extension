import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as trivyExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	test('Not a vulnerable project', () => {
		var got = trivyExtension.runCommand("trivy --quiet filesystem --exit-code=10", "src/test/golden/not-vulnerable");
		assert.strictEqual(got, ``, "should be equal and no vulnerabilities found");
	});

	test('Vulnerable project', () => {
		var got = trivyExtension.runCommand("trivy --quiet filesystem --exit-code=10", "src/test/golden/vulnerable");
		assert.strictEqual(got, `
package-lock.json
=================
Total: 8 (UNKNOWN: 0, LOW: 1, MEDIUM: 4, HIGH: 2, CRITICAL: 1)

+---------+------------------+----------+-------------------+---------------+-----------------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |                  TITLE                  |
+---------+------------------+----------+-------------------+---------------+-----------------------------------------+
| jquery  | CVE-2019-11358   | MEDIUM   | 3.3.9             | 3.4.0         | jquery: Prototype pollution in          |
|         |                  |          |                   |               | object's prototype leading to           |
|         |                  |          |                   |               | denial of service, remote...            |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2019-11358   |
+         +------------------+          +                   +---------------+-----------------------------------------+
|         | CVE-2020-11022   |          |                   | 3.5.0         | jquery: Cross-site                      |
|         |                  |          |                   |               | scripting due to improper               |
|         |                  |          |                   |               | injQuery.htmlPrefilter method           |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2020-11022   |
+         +------------------+          +                   +               +-----------------------------------------+
|         | CVE-2020-11023   |          |                   |               | jquery: Passing HTML containing         |
|         |                  |          |                   |               | <option> elements to manipulation       |
|         |                  |          |                   |               | methods could result in...              |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2020-11023   |
+---------+------------------+----------+-------------------+---------------+-----------------------------------------+
| lodash  | CVE-2019-10744   | CRITICAL | 4.17.4            | 4.17.12       | nodejs-lodash: prototype                |
|         |                  |          |                   |               | pollution in defaultsDeep function      |
|         |                  |          |                   |               | leading to modifying properties         |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2019-10744   |
+         +------------------+----------+                   +---------------+-----------------------------------------+
|         | CVE-2018-16487   | HIGH     |                   | 4.17.11       | lodash: Prototype pollution             |
|         |                  |          |                   |               | in utilities function                   |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2018-16487   |
+         +------------------+          +                   +---------------+-----------------------------------------+
|         | CVE-2020-8203    |          |                   | 4.17.19       | nodejs-lodash: prototype pollution      |
|         |                  |          |                   |               | in zipObjectDeep function               |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2020-8203    |
+         +------------------+----------+                   +---------------+-----------------------------------------+
|         | CVE-2019-1010266 | MEDIUM   |                   | 4.17.11       | Prototype pollution in lodash           |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2019-1010266 |
+         +------------------+----------+                   +---------------+-----------------------------------------+
|         | CVE-2018-3721    | LOW      |                   | 4.17.5        | lodash: Prototype pollution             |
|         |                  |          |                   |               | in utilities function                   |
|         |                  |          |                   |               | -->avd.aquasec.com/nvd/cve-2018-3721    |
+---------+------------------+----------+-------------------+---------------+-----------------------------------------+
`, "should be equal and vulnerablities found");
	});
});
