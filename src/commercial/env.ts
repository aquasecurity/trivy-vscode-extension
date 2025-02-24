import * as vscode from 'vscode';

const AQUA_API_URL = 'https://api.aquasec.com';
const AQUA_AUTHENTICATION_URL = 'https://cloud.aquasec.com';

export async function updateEnvironment(
  config: vscode.WorkspaceConfiguration,
  secrets: vscode.SecretStorage,
  env: NodeJS.ProcessEnv,
  assuranceReportPath: string
): Promise<NodeJS.ProcessEnv> {
  if (!config.get<boolean>('useAquaPlatform')) {
    return env;
  }

  const apiKey = (await secrets.get('apiKey')) || '';
  const apiSecret = (await secrets.get('apiSecret')) || '';

  if (apiKey && apiSecret) {
    const newEnv = Object.assign({}, env);

    newEnv.AQUA_URL = config.get<string>('aquaApiUrl') || AQUA_API_URL;
    newEnv.CSPM_URL =
      config.get<string>('aquaAuthenticationUrl') || AQUA_AUTHENTICATION_URL;
    newEnv.AQUA_KEY = apiKey;
    newEnv.AQUA_SECRET = apiSecret;
    newEnv.TRIVY_RUN_AS_PLUGIN = 'aqua';
    newEnv.AQUA_ASSURANCE_EXPORT = assuranceReportPath;
    return newEnv;
  }

  return env;
}
