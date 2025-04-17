import { PolicyResult, TrivyResult } from './result';

/*
 * Cache class to store and retrieve results
 * @class ResultCache
 */
export class ResultCache {
  public static instance: ResultCache = new ResultCache();

  private constructor() {
    // Private constructor to prevent instantiation
  }

  private trivyResultData: Map<string, TrivyResult[]> = new Map();
  private policyResultData: Map<string, PolicyResult[]> = new Map();

  /**
   * Clear the cache
   * @returns {void}
   * @memberof ResultCache
   */
  public clear(): void {
    this.trivyResultData.clear();
    this.policyResultData.clear();
  }

  /**
   * Set the Trivy results in the cache for a specific workspace
   * @param workspaceName The name of the workspace
   * @param results The Trivy results to store
   */
  public setTrivyResults(workspaceName: string, results: TrivyResult[]): void {
    if (this.trivyResultData.has(workspaceName)) {
      this.trivyResultData.get(workspaceName)?.push(...results);
    } else {
      this.trivyResultData.set(workspaceName, results);
    }
  }

  /**
   * Set the Policy results in the cache for a specific workspace
   * @param workspaceName The name of the workspace
   * @param results The Policy results to store
   */
  public setPolicyResults(
    workspaceName: string,
    results: PolicyResult[]
  ): void {
    if (this.policyResultData.has(workspaceName)) {
      this.policyResultData.get(workspaceName)?.push(...results);
    } else {
      this.policyResultData.set(workspaceName, results);
    }
  }

  /**
   * Get the Trivy results from the cache
   * @param workspaceName The name of the workspace
   * @returns The Trivy results for the specified workspace
   */
  public getTrivyResults(workspaceName?: string): TrivyResult[] {
    if (!workspaceName) {
      const allResults: TrivyResult[] = [];
      this.trivyResultData.forEach((results) => {
        allResults.push(...results);
      });
      return allResults;
    }

    return this.trivyResultData.get(workspaceName) || [];
  }

  /**
   * Get the Policy results from the cache
   * @param workspaceName The name of the workspace
   * @returns The Policy results for the specified workspace
   */
  public getPolicyResults(workspaceName: string): PolicyResult[] {
    return this.policyResultData.get(workspaceName) || [];
  }
}
