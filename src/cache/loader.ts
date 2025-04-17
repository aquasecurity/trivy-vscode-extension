import * as fs from 'fs';

import * as vscode from 'vscode';

import { Ignorer } from './ignorer';
import { extractPolicyResults, processResult, TrivyResult } from './result';
import { ResultCache } from './result_cache';

export async function loader(
  workspaceName: string,
  resultsFilePath: string
): Promise<void> {
  const config = vscode.workspace.getConfiguration('trivy');
  const ig = new Ignorer(config);
  const isAssurance = config.get<boolean>('useAquaPlatform', false);
  const content = fs.readFileSync(resultsFilePath, 'utf8');
  try {
    const data = JSON.parse(content);
    if (
      data === null ||
      data.Results === null ||
      (data.Report === null && isAssurance)
    ) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let results: any;
    if (isAssurance) {
      results = data.Report.Results;
    } else {
      results = data.Results;
    }

    const trivyResults: TrivyResult[] = [];
    for (let i = 0; i < results.length; i++) {
      const element = results[i];
      trivyResults.push(...processResult(element, workspaceName, ig));
    }
    ResultCache.instance.setTrivyResults(workspaceName, trivyResults);

    // process assurance polcies
    if (isAssurance) {
      const policyResults =
        extractPolicyResults(data.Results, data.Report, workspaceName) || [];

      ResultCache.instance.setPolicyResults(workspaceName, policyResults);
    }
  } catch (error) {
    console.debug(`Error parsing JSON file ${resultsFilePath}: ${error}`);
    return;
  }
}
