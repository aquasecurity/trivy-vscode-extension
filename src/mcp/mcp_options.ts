import { TrivyCommandOption } from '../command/options';

/**
 * Option to set the scanners outside of the config file
 */
export class ScannersOption implements TrivyCommandOption {
  private requiredScanners: Array<string>;

  constructor(requiredScanners: Array<string>) {
    this.requiredScanners = requiredScanners;
  }

  public apply(command: string[]): string[] {
    command.push(`--scanners=${this.requiredScanners.join(',')}`);
    command.push('--list-all-pkgs');

    return command;
  }
}

export class SeverityOption implements TrivyCommandOption {
  private severity: string;

  constructor(severity: string) {
    this.severity = severity;
  }

  public apply(command: string[]): string[] {
    if (!this.severity) {
      return command;
    }
    command.push(`--severity=${this.severity}`);
    return command;
  }
}
