import * as fs from 'fs';

import * as vscode from 'vscode';

import { Ignorer } from './ignorer';
import { extractPolicyResults, processResult, TrivyResult } from './result';
import { ResultCache } from './result_cache';

export async function loader(
  workspaceName: string,
  resultsFilePath: string,
  assuranceFilePath?: string
): Promise<void> {
  const config = vscode.workspace.getConfiguration('trivy');
  const ig = new Ignorer(config);
  const isAssurance = config.get<boolean>('useAquaPlatform', false);
  const content = fs.readFileSync(resultsFilePath, 'utf8');

  try {
    const report = JSON.parse(content);
    if (
      report === null ||
      report.Results === null ||
      (report.Report === null && isAssurance)
    ) {
      return;
    }

    let assuranceReport = undefined;
    const assuranceContent =
      assuranceFilePath !== undefined
        ? fs.readFileSync(assuranceFilePath, 'utf8')
        : null;
    if (isAssurance && assuranceContent) {
      assuranceReport = JSON.parse(assuranceContent);
      if (assuranceReport === null || assuranceReport.Results === null) {
        return;
      }
    }

    const trivyResults: TrivyResult[] = [];
    for (let i = 0; i < report.Results.length; i++) {
      const element = report.Results[i];
      trivyResults.push(...processResult(element, workspaceName, ig));
    }

    ResultCache.instance.setTrivyResults(workspaceName, trivyResults);

    // process assurance policies
    if (isAssurance && assuranceReport && assuranceReport.Results) {
      const policyResults =
        extractPolicyResults(assuranceReport.Results, report, workspaceName) ||
        [];

      ResultCache.instance.setPolicyResults(workspaceName, policyResults);
    }
  } catch (error) {
    console.debug(`Error parsing JSON file ${resultsFilePath}: ${error}`);
    return;
  }
}
