import * as vscode from 'vscode';

import { showErrorMessage } from '../notification/notifications';

/**
 * Default service URLs for Aqua Platform
 */
const AQUA_DEFAULTS = Object.freeze({
  API_URL: 'https://api.aquasec.com',
  AUTHENTICATION_URL: 'https://cloud.aquasec.com',
});

/**
 * Environment variable keys used by Aqua Platform integration
 */
const ENV_KEYS = Object.freeze({
  API_URL: 'AQUA_URL',
  AUTH_URL: 'CSPM_URL',
  API_KEY: 'AQUA_KEY',
  API_SECRET: 'AQUA_SECRET',
  RUN_MODE: 'TRIVY_RUN_AS_PLUGIN',
  ASSURANCE_EXPORT: 'AQUA_ASSURANCE_EXPORT',
});

/**
 * Secret storage keys
 */
export const SECRET_KEYS = Object.freeze({
  API_KEY: 'apiKey',
  API_SECRET: 'apiSecret',
});

/**
 * Update environment with Aqua Platform credentials and configuration
 * @param config VS Code configuration
 * @param secrets Secret storage for API credentials
 * @param env Current process environment
 * @param assuranceReportPath Path for exporting assurance reports
 * @returns Updated environment with Aqua Platform settings
 */
export async function updateEnvironment(
  config: vscode.WorkspaceConfiguration,
  secrets: vscode.SecretStorage,
  env: NodeJS.ProcessEnv,
  assuranceReportPath: string
): Promise<NodeJS.ProcessEnv> {
  try {
    if (!config.get<boolean>('useAquaPlatform')) {
      return env;
    }

    // Create a copy of the environment to avoid modifying the original
    const newEnv = { ...env };

    // Get API credentials from secret storage
    const apiKey = (await secrets.get(SECRET_KEYS.API_KEY)) || '';
    const apiSecret = (await secrets.get(SECRET_KEYS.API_SECRET)) || '';

    if (!apiKey || !apiSecret) {
      throw new Error('Aqua Platform credentials are missing or incomplete');
    }

    // Set environment variables for Aqua Platform integration
    newEnv[ENV_KEYS.API_URL] =
      config.get<string>('aquaApiUrl') || AQUA_DEFAULTS.API_URL;
    newEnv[ENV_KEYS.AUTH_URL] =
      config.get<string>('aquaAuthenticationUrl') ||
      AQUA_DEFAULTS.AUTHENTICATION_URL;
    newEnv[ENV_KEYS.API_KEY] = apiKey;
    newEnv[ENV_KEYS.API_SECRET] = apiSecret;
    newEnv[ENV_KEYS.RUN_MODE] = 'aqua';
    newEnv[ENV_KEYS.ASSURANCE_EXPORT] = assuranceReportPath;

    return newEnv;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showErrorMessage(
      `Failed to configure Aqua Platform environment: ${errorMessage}`
    );

    // Log the error but don't expose sensitive information
    console.error(
      'Error configuring Aqua Platform environment:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Set a context flag for authentication failure
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.aquaAuthFailed',
      true
    );

    // Return the original environment without modifications
    return env;
  }
}

/**
 * Clears Aqua Platform credentials from secret storage
 * @param secrets Secret storage to clear
 */
export async function clearCredentials(
  secrets: vscode.SecretStorage
): Promise<void> {
  try {
    await secrets.delete(SECRET_KEYS.API_KEY);
    await secrets.delete(SECRET_KEYS.API_SECRET);
    await vscode.commands.executeCommand(
      'setContext',
      'trivy.aquaAuthFailed',
      false
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    showErrorMessage(
      `Failed to clear Aqua Platform credentials: ${errorMessage}`
    );
  }
}

/**
 * Tests if the current Aqua Platform credentials are valid
 * @param config VS Code configuration
 * @param secrets Secret storage containing credentials
 * @returns True if credentials are valid, false otherwise
 */
export async function validateCredentials(
  config: vscode.WorkspaceConfiguration,
  secrets: vscode.SecretStorage
): Promise<boolean> {
  try {
    const apiKey = (await secrets.get(SECRET_KEYS.API_KEY)) || '';
    const apiSecret = (await secrets.get(SECRET_KEYS.API_SECRET)) || '';

    if (!apiKey || !apiSecret) {
      return false;
    }

    // Additional validation could be performed here by making a lightweight API call
    // This is a placeholder for future implementation

    return true;
  } catch (error) {
    console.error('Error validating Aqua Platform credentials:', error);
    return false;
  }
}
