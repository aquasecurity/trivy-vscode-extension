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

export class PolicyResult {
  public avdId: string;
  public id: string;
  public title: string;
  public failed: boolean;
  public reason: string;
  public category: string;
  public description: string;
  public severity: string;
  public filename: string;
  public startLine: number;
  public endLine: number;
  public matchCode: string;
  public matchLocation: string;
  public fix: string;
  public references: string[];
  public workspaceName: string;

  constructor(
    avdId: string,
    id: string,
    name: string,
    failed: boolean,
    reason: string,
    category: string,
    description: string,
    severity: string,
    filename: string,
    startLine: number,
    endLine: number,
    matchCode: string,
    matchLocation: string,
    fix: string,
    references: string[],
    workspaceName: string
  ) {
    this.avdId = avdId;
    this.id = id;
    this.title = name;
    this.failed = failed;
    this.reason = reason;
    this.category = category;
    this.description = description;
    this.filename = filename;
    this.severity = severity;
    this.startLine = startLine;
    this.endLine = endLine;
    this.matchCode = matchCode;
    this.matchLocation = matchLocation;
    this.fix = fix;
    this.references = references;
    this.workspaceName = workspaceName;
  }
}

export const extractPolicyResults = (
  results: any,
  workspaceName: string
): PolicyResult[] => {
  const policyResults: PolicyResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const element = results[i];
    if (!Object.prototype.hasOwnProperty.call(element, 'PolicyResults')) {
      // there are no policy results
      continue;
    }

    for (let j = 0; j < element.PolicyResults.length; j++) {
      const policyResult = element.PolicyResults[j];
      if (!Object.prototype.hasOwnProperty.call(policyResult, 'Failed')) {
        // there are no failed policies
        continue;
      }

      const avdId = element.AVDID;
      const id = policyResult.PolicyID;
      const failed = policyResult.Failed;
      const name = policyResult.policy_name;
      const reason = policyResult.Reason;
      const severity = element.Severity;
      const description = element.Message;
      const filename = element.Filename;
      const startLine = element.StartLine || 1;
      const endLine = element.EndLine || 1;

      const matchCode = policyResult.ControlResult[0]?.matched_data;
      const matchLocation = policyResult.ControlResult[0]?.location;
      const category = policyResult.Controls[0]?.toString();

      const fix = element.ExtraData?.Fix?.Resolution;
      const references = element.ExtraData?.References || [];

      policyResults.push(
        new PolicyResult(
          avdId,
          id,
          name,
          failed,
          reason,
          category,
          description,
          severity,
          filename,
          startLine,
          endLine,
          matchCode,
          matchLocation,
          fix,
          references,
          workspaceName
        )
      );
    }
  }
  return policyResults;
};

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
