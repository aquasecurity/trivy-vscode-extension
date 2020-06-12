import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as trivyExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');
	
	test('Not a vulnerable project', () => {
		var got = trivyExtension.runCommand("trivy filesystem --quiet --exit-code=10", "src/test/golden/not-vulnerable");
		assert.strictEqual(got, ``, "should be equal and no vulnerablities found");
	});

	test('Vulnerable project', () => {
		var got = trivyExtension.runCommand("trivy filesystem --quiet --exit-code=10", "src/test/golden/vulnerable");
		assert.strictEqual(got, `
package-lock.json
=================
Total: 9 (UNKNOWN: 0, LOW: 1, MEDIUM: 5, HIGH: 3, CRITICAL: 0)

+---------+------------------+----------+-------------------+---------------+--------------------------------+
| LIBRARY | VULNERABILITY ID | SEVERITY | INSTALLED VERSION | FIXED VERSION |             TITLE              |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| jquery  | CVE-2019-11358   | MEDIUM   | 3.3.9             | 3.4.0         | js-jquery: prototype pollution |
|         |                  |          |                   |               | in object's prototype leading  |
|         |                  |          |                   |               | to denial of service or...     |
+         +------------------+          +                   +               +--------------------------------+
|         | CVE-2019-5428    |          |                   |               | Modification of                |
|         |                  |          |                   |               | Assumed-Immutable Data (MAID)  |
+         +------------------+          +                   +---------------+--------------------------------+
|         | CVE-2020-11022   |          |                   | 3.5.0         | jquery: Cross-site             |
|         |                  |          |                   |               | scripting due to improper      |
|         |                  |          |                   |               | injQuery.htmlPrefilter method  |
+         +------------------+          +                   +               +--------------------------------+
|         | CVE-2020-11023   |          |                   |               | Potential XSS vulnerability in |
|         |                  |          |                   |               | jQuery                         |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
| lodash  | CVE-2018-16487   | HIGH     | 4.17.4            | 4.17.11       | lodash: Prototype pollution in |
|         |                  |          |                   |               | utilities function             |
+         +------------------+          +                   +---------------+--------------------------------+
|         | CVE-2019-10744   |          |                   | 4.17.12       | nodejs-lodash: prototype       |
|         |                  |          |                   |               | pollution in defaultsDeep      |
|         |                  |          |                   |               | function leading to modifying  |
|         |                  |          |                   |               | properties                     |
+         +------------------+          +                   +---------------+--------------------------------+
|         | NSWG-ECO-516     |          |                   |               | Allocation of Resources        |
|         |                  |          |                   |               | Without Limits or Throttling   |
+         +------------------+----------+                   +---------------+--------------------------------+
|         | CVE-2019-1010266 | MEDIUM   |                   | 4.17.11       | Moderate severity              |
|         |                  |          |                   |               | vulnerability that affects     |
|         |                  |          |                   |               | lodash                         |
+         +------------------+----------+                   +---------------+--------------------------------+
|         | CVE-2018-3721    | LOW      |                   | 4.17.5        | lodash: Prototype pollution in |
|         |                  |          |                   |               | utilities function             |
+---------+------------------+----------+-------------------+---------------+--------------------------------+
`, "should be equal and vulnerablities found");
	});
});
