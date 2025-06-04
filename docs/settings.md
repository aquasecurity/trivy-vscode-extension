# Extension Settings

Configure the Aqua Trivy VS Code Extension through VS Code's settings interface.

## Accessing Settings

### Settings UI

1. Open VS Code Settings: `Ctrl+,` / `Cmd+,`
2. Search for "trivy" to find all Trivy-related settings
3. Modify settings using the graphical interface

### Settings JSON

1. Open Command Palette: `F1` or `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Preferences: Open Settings (JSON)"
3. Add Trivy settings to your JSON configuration

## Core Settings

### Binary Configuration

#### Trivy Binary Path

- **Setting**: `trivy.binaryPath`
- **Default**: `"trivy"`
- **Description**: Path to Trivy binary if not in PATH
- **Example**:
  ```json
  "trivy.binaryPath": "/usr/local/bin/trivy"
  ```

#### Debug Mode

- **Setting**: `trivy.debug`
- **Default**: `false`
- **Description**: Enable verbose logging for troubleshooting
- **Example**:
  ```json
  "trivy.debug": true
  ```

## Scan Configuration

### Scanner Types

#### Vulnerability Scanning

- **Setting**: `trivy.vulnScanning`
- **Default**: `true`
- **Description**: Enable vulnerability scanning
- **Scope**: Window

#### Misconfiguration Scanning

- **Setting**: `trivy.misconfigScanning`
- **Default**: `true`
- **Description**: Enable misconfiguration scanning
- **Scope**: Window

#### Secret Scanning

- **Setting**: `trivy.secretScanning`
- **Default**: `false`
- **Description**: Enable secret scanning (requires Trivy ≥v0.27.0)
- **Scope**: Window

### Package Scanning

#### Package.json Scanning

- **Setting**: `trivy.packageJsonScanning`
- **Default**: `true`
- **Description**: Scan package.json without lock files
- **Scope**: Window

#### Gradle Scanning

- **Setting**: `trivy.gradleScanning`
- **Default**: `true`
- **Description**: Scan Gradle projects without lock files
- **Scope**: Window

#### .NET Project Scanning

- **Setting**: `trivy.dotnetProjScanning`
- **Default**: `true`
- **Description**: Scan .NET projects without lock files
- **Scope**: Window

### Scan Behavior

#### Offline Scanning

- **Setting**: `trivy.offlineScan`
- **Default**: `false`
- **Description**: Run scans without internet connectivity
- **Scope**: Window

#### Fixed Issues Only

- **Setting**: `trivy.fixedOnly`
- **Default**: `false`
- **Description**: Only show vulnerabilities with available fixes
- **Scope**: Window

#### Minimum Severity

- **Setting**: `trivy.minimumReportedSeverity`
- **Default**: `"UNKNOWN"`
- **Options**: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`
- **Description**: Filter results by minimum severity level
- **Scope**: Window

#### Ignore Files in Git Ignore

- **Setting**: `trivy.ignoreFilesInGitIgnore`
- **Default**: `false`
- **Description**: Skip files listed in .gitignore
- **Scope**: Window

## File Configuration

### Ignore File Settings

#### Use Ignore File

- **Setting**: `trivy.useIgnoreFile`
- **Default**: `false`
- **Description**: Enable .trivyignore.yaml file usage
- **Scope**: Window

#### Ignore File Path

- **Setting**: `trivy.ignoreFilePath`
- **Default**: `""`
- **Description**: Custom path to ignore file
- **Scope**: Window
- **Example**:
  ```json
  "trivy.ignoreFilePath": "./config/.trivyignore.yaml"
  ```

### Config File Settings

#### Use Config File

- **Setting**: `trivy.useConfigFile`
- **Default**: `false`
- **Description**: Enable trivy.yaml config file usage
- **Scope**: Window

#### Only Use Config File

- **Setting**: `trivy.onlyUseConfigFile`
- **Default**: `false`
- **Description**: Use only config file, ignore other settings
- **Scope**: Window

#### Config File Path

- **Setting**: `trivy.configFilePath`
- **Default**: `""`
- **Description**: Custom path to config file
- **Scope**: Window
- **Example**:
  ```json
  "trivy.configFilePath": "./config/trivy.yaml"
  ```

## Display Settings

### Result Organization

#### Order Results by Type

- **Setting**: `trivy.orderResultsByType`
- **Default**: `true`
- **Description**: Group results by type and severity instead of by file
- **Scope**: Window

## Aqua Platform Settings

### Platform Integration

#### Use Aqua Platform

- **Setting**: `trivy.useAquaPlatform`
- **Default**: `false`
- **Description**: Enable Aqua Platform integration
- **Scope**: Window

#### Aqua API URL

- **Setting**: `trivy.aquaApiUrl`
- **Default**: `""`
- **Description**: Aqua Platform API endpoint
- **Example**:
  ```json
  "trivy.aquaApiUrl": "https://api.cloudsploit.com"
  ```

#### Aqua Authentication URL

- **Setting**: `trivy.aquaAuthenticationUrl`
- **Default**: `""`
- **Description**: Aqua Platform authentication endpoint

## Example Complete Configuration

```json
{
  // Core settings
  "trivy.binaryPath": "trivy",
  "trivy.debug": false,

  // Scan types
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,

  // Package scanning
  "trivy.packageJsonScanning": true,
  "trivy.gradleScanning": true,
  "trivy.dotnetProjScanning": true,

  // Scan behavior
  "trivy.offlineScan": false,
  "trivy.fixedOnly": false,
  "trivy.minimumReportedSeverity": "MEDIUM",
  "trivy.ignoreFilesInGitIgnore": true,

  // File configuration
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./.trivyignore.yaml",
  "trivy.useConfigFile": true,
  "trivy.configFilePath": "./trivy.yaml",

  // Display
  "trivy.orderResultsByType": true,

  // Aqua Platform (for customers)
  "trivy.useAquaPlatform": false
}
```

## Settings Scope

Most Trivy settings are scoped to the **window level**, meaning:

- Settings apply to the current VS Code window
- Each workspace can have different settings
- Settings are saved per-workspace when using multi-root workspaces

## Quick Settings Access

### Menu-Based Configuration

1. Select the `...` Menu from the Trivy Explorer
2. Select from available toggles:
   - Scan types (vulnerabilities, misconfigurations, secrets)
   - Offline scanning
   - Fixed issues only
   - Ignore file usage
   - Config file usage
   - Result ordering

## Settings Validation

The extension validates certain settings:

- **File paths**: Checked for existence when specified
- **Severity levels**: Must be valid enum values
- **Aqua Platform URLs**: Validated when platform integration is enabled

Invalid settings will show warnings in the Output panel.

## Resetting Settings

To reset all Trivy settings to defaults:

1. Open Settings JSON
2. Remove all entries starting with `"trivy."`
3. Restart VS Code or reload the window

## Next Steps

- [JSON Configuration](./json-config.md) - Advanced configuration with JSON files
- [Trivy Configuration Files](./trivy-config.md) - Using trivy.yaml and ignore files
- [Aqua Platform Setup](./aqua-platform.md) - Configure platform integration
