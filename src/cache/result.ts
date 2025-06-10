/* eslint-disable @typescript-eslint/no-explicit-any */

import { prettifyName } from '../utils';

import { Ignorer } from './ignorer';

/*
 * Represents a Trivy result
 */
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

/*
 * Represents a vulnerability
 */
export class Vulnerability {
  public pkgName: string;
  public installedVersion: string;
  public fixedVersion: string;
  public indirect: boolean;
  public rootPackage: string;
  constructor(vulnerability: any) {
    this.pkgName = vulnerability.PkgName;
    this.installedVersion = vulnerability.InstalledVersion;
    this.fixedVersion = vulnerability.FixedVersion;
    this.indirect = vulnerability.Indirect;
    this.rootPackage = vulnerability.RootPackage;
  }
}

/*
 * Represents a misconfiguration
 */
export class Misconfiguration {
  public code: string;
  public message: string;
  public resolution: string;
  public status: string;
  public startline: number = 0;
  public endline: number = 0;
  occurrences: any;
  constructor(misconfiguration: any) {
    this.code = misconfiguration.AVDID ?? misconfiguration.ID;
    this.message = misconfiguration.Message;
    this.resolution = misconfiguration.Resolution;
    this.status = misconfiguration.Status;
    this.occurrences = misconfiguration.CauseMetadata.Occurrences;
  }
}

/*
 * Represents a secret
 */
export class Secret {
  public category: string;
  public match: string;
  constructor(secret: any) {
    this.category = secret.Category;
    this.match = secret.Match;
  }
}

/*
 * Represents a policy result
 */
export class PolicyResult {
  public avdId: string;
  public id: string;
  public title: string;
  public pkgName: string;
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
    pkgName: string,
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
    this.pkgName = pkgName;
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

/*
 * Represents a policy result
 */
type Location = {
  StartLine: number;
  EndLine: number;
};

/*
 * Represents a package identifier
 */
type PkgIdentifier = {
  PURL: string;
  UID: string;
};

/*
 * Represents a package
 */
type Package = {
  ID: string;
  Name: string;
  Locations: Location[];
  Identifier: PkgIdentifier;
  Version: string;
};

/*
 * Represents a policy result
 * @param results The results to extract policy results from
 * @param report The report to extract policy results from
 * @param workspaceName The name of the workspace
 * @returns The extracted policy results
 */
export function extractPolicyResults(
  results: any,
  report: any,
  workspaceName: string
): PolicyResult[] {
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
      const pkgName = element.PkgName;
      const reason = policyResult.Reason;
      const severity = element.Severity;
      const description = element.Message;
      const filename = element.Filename;
      const fix =
        element.ExtraData?.Fix?.Resolution || element.FixedVersion
          ? `Fixed in version ${element.FixedVersion}`
          : '';
      const references = element.ExtraData?.References || [];

      let location: Location = {
        StartLine: element.StartLine,
        EndLine: element.EndLine,
      };
      if (!location.StartLine) {
        const matchingResult = report.Results.find(
          (r: any) => r.Target === element.Filename
        );
        if (matchingResult) {
          location = getPolicyPkgLocation(element, matchingResult.Packages);
        }
      }
      for (let k = 0; k < policyResult.Controls.length; k++) {
        try {
          const controlResult = policyResult.ControlResult[k];

          const matchCode = pkgName
            ? `${controlResult?.matched_data} [${pkgName}]`
            : controlResult?.matched_data;
          const matchLocation = controlResult?.location;
          const category = prettifyName(controlResult.type);

          policyResults.push(
            new PolicyResult(
              avdId,
              id,
              name,
              pkgName,
              failed,
              reason,
              category,
              description,
              severity,
              filename,
              location.StartLine,
              location.EndLine,
              matchCode,
              matchLocation,
              fix,
              references,
              workspaceName
            )
          );
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
  return policyResults;
}

/*
 * Processes the results from Trivy
 * @param result The result to process
 * @param workspaceName The name of the workspace
 * @param ignorer The ignorer to use
 * @returns The processed results
 */
export function processResult(
  result: any,
  workspaceName: string,
  ignorer: Ignorer
): TrivyResult[] {
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

      const id = element.AVDID ?? element.ID;
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

      const location = getLocation(element, result.Packages);

      element.Indirect = false;
      if (Object.prototype.hasOwnProperty.call(element, 'Custom')) {
        const custom = element.Custom;
        if (
          custom &&
          Object.prototype.hasOwnProperty.call(custom, 'pkgRoots')
        ) {
          element.RootPackage = custom.pkgRoots[0];
          if (Object.prototype.hasOwnProperty.call(custom, 'indirect')) {
            element.Indirect = custom.indirect;
          }
        }
      }

      const extra = new Vulnerability(element);

      try {
        results.push(
          new TrivyResult(
            id,
            title,
            description,
            target,
            location.StartLine,
            location.EndLine,
            severity,
            references,
            extra,
            workspaceName
          )
        );
      } catch (e) {
        console.log(e);
      }
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
}

/*
 * Extracts the results from Trivy
 * @param trivyResults The results to extract from
 * @param workspaceName The name of the workspace
 * @param ignorer The ignorer to use
 * @returns The extracted results
 */
function getPolicyPkgLocation(e: any, packages: Package[]): Location {
  const element = e;

  if (element && packages) {
    const matchingPackage = packages.find(
      (pkg) =>
        pkg.Name === element.PkgName && pkg.Version === element.InstalledVersion
    );
    if (matchingPackage && matchingPackage.Locations) {
      return matchingPackage.Locations[0];
    }
  }
  return { StartLine: 1, EndLine: 1 };
}

/*
 * Gets the location of a result
 * @param e The result to get the location of
 * @param packages The packages to use
 * @returns The location of the result
 */
function getLocation(e: any, packages: Package[]): Location {
  const element = e;

  if (element && Object.prototype.hasOwnProperty.call(element, 'Custom')) {
    const custom = element.Custom;
    if (custom && Object.prototype.hasOwnProperty.call(custom, 'lineNumber')) {
      return {
        StartLine: custom.lineNumber,
        EndLine: custom.lineNumber,
      };
    }
  }

  if (element && packages) {
    const matchingPackage = packages.find(
      (pkg) => pkg.Identifier?.PURL === element.PkgIdentifier?.PURL
    );
    if (matchingPackage && matchingPackage.Locations) {
      if (matchingPackage.Locations.length > 1) {
        return matchingPackage.Locations[0];
      } else {
        return matchingPackage.Locations[0];
      }
    }
  }

  return { StartLine: 1, EndLine: 1 };
}
