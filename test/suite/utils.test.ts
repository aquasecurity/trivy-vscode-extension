import * as assert from 'assert';
import { getSeverityPosition, sortBySeverity } from '../../src/utils';
import { TrivyResult } from '../../src/explorer/trivy_result';

suite('utils', function (): void {
  test('get severity position', () => {
    assert.strictEqual(getSeverityPosition('CRITICAL'), 0);
    assert.strictEqual(getSeverityPosition('HIGH'), 1);
    assert.strictEqual(getSeverityPosition('MEDIUM'), 2);
    assert.strictEqual(getSeverityPosition('LOW'), 3);
    assert.strictEqual(getSeverityPosition('UNKNOWN'), -1);
  })

  test('sort by severity', () => {
    const a = {
      severity: 'CRITICAL',
      extraData: null
    } as unknown as TrivyResult
    const b = {
      severity: 'MEDIUM',
      extraData: null
    } as unknown as TrivyResult

    const sorted = sortBySeverity(a, b);
    assert.strictEqual(sorted, -1);
  });

});