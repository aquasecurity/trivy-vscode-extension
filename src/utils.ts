import { Secret, TrivyResult } from './explorer/result';
import { stripVTControlCharacters } from 'node:util';

export function getSeverityPosition(severity: string): number {
  switch (severity) {
    case 'CRITICAL':
      return 0;
    case 'HIGH':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 3;
    default:
      return -1;
  }
}

export const sortBySeverity = (a: TrivyResult, b: TrivyResult): number => {
  if (a.extraData instanceof Secret) {
    return 1;
  }
  if (getSeverityPosition(a.severity) > getSeverityPosition(b.severity)) {
    return 1;
  } else if (
    getSeverityPosition(a.severity) < getSeverityPosition(b.severity)
  ) {
    return -1;
  }

  return 0;
};

export function stripAnsi(str: string): string {
  return stripVTControlCharacters(str);
}
