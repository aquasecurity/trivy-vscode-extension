/* eslint-disable @typescript-eslint/no-explicit-any */

import { Ignorer } from '../ignorer';

export class TrivyResult {
  public extraData: Vulnerability | Misconfiguration | Secret | string;
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public filename: string,
    public startLine: number,
    public endLine: number,
    public severity: string,
    public references: string[],
    extra: Vulnerability | Misconfiguration | Secret,
    public workspaceName: string
  ) {
    this.extraData = extra;
  }
}

export class Vulnerability {
  public pkgName: string;
  public installedVersion: string;
  public fixedVersion: string;
  constructor(vulnerabitlity: any) {
    this.pkgName = vulnerabitlity.PkgName;
    this.installedVersion = vulnerabitlity.InstalledVersion;
    this.fixedVersion = vulnerabitlity.FixedVersion;
  }
}

export class Misconfiguration {
  public code: string;
  public message: string;
  public resolution: string;
  public status: string;
  public startline: number = 0;
  public endline: number = 0;
  occurrences: any;
  constructor(misconfiguration: any) {
    this.code = misconfiguration.ID;
    this.message = misconfiguration.Message;
    this.resolution = misconfiguration.Resolution;
    this.status = misconfiguration.Status;
    this.occurrences = misconfiguration.CauseMetadata.Occurrences;
  }
}

export class Secret {
  public category: string;
  public match: string;
  constructor(secret: any) {
    this.category = secret.Category;
    this.match = secret.Match;
  }
}

export const processResult = (
  result: any,
  workspaceName: string,
  ignorer: Ignorer
): TrivyResult[] => {
  const results: TrivyResult[] = [];


  if (result.Misconfigurations) {
    for (let i = 0; i < result.Misconfigurations.length; i++) {
      if (ignorer.isFileIgnored(result.Target, workspaceName)) {
        continue;
      }

      const element = result.Misconfigurations[i];

      let startLine = element.CauseMetadata
        ? element.CauseMetadata.StartLine
        : element.IacMetadata
          ? element.IacMetadata.StartLine
          : 1;
      let endLine = element.CauseMetadata
        ? element.CauseMetadata.EndLine
        : element.IacMetadata
          ? element.IacMetadata.StartLine
          : 1;

      startLine = startLine && startLine > 0 ? startLine : 1;
      endLine = endLine && endLine > 0 ? endLine : 1;

      const id = element.ID;
      const title = element.Title;
      const description = element.Description;
      const target = result.Target;
      const severity = element.Severity;
      const references = element.References;
      const extra = new Misconfiguration(element);
      results.push(
        new TrivyResult(
          id,
          title,
          description,
          target,
          startLine,
          endLine,
          severity,
          references,
          extra,
          workspaceName
        )
      );
    }
  }

  if (result.Vulnerabilities) {
    for (let i = 0; i < result.Vulnerabilities.length; i++) {
      if (ignorer.isFileIgnored(result.Target, workspaceName)) {
        continue;
      }
      const element = result.Vulnerabilities[i];
      const id = element.VulnerabilityID;
      const title = element.Title;
      const description = element.Description;
      const target = result.Target;
      const severity = element.Severity;
      const references = element.References;
      const extra = new Vulnerability(element);
      const startLine = 1;
      const endLine = 1;
      results.push(
        new TrivyResult(
          id,
          title,
          description,
          target,
          startLine,
          endLine,
          severity,
          references,
          extra,
          workspaceName
        )
      );
    }
  }

  if (result.Secrets) {
    for (let i = 0; i < result.Secrets.length; i++) {
      if (ignorer.isFileIgnored(result.Target, workspaceName)) {
        continue;
      }
      const element = result.Secrets[i];
      const id = element.RuleID;
      const title = element.Title;
      const description = element.Description;
      const target = result.Target;
      const severity = element.Severity;
      const references = element.References;
      const extra = new Secret(element);
      const startLine = element.StartLine;
      const endLine = element.EndLine;
      results.push(
        new TrivyResult(
          id,
          title,
          description,
          target,
          startLine,
          endLine,
          severity,
          references,
          extra,
          workspaceName
        )
      );
    }
  }

  return results;
};
