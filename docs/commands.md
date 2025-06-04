# Commands Reference

Complete reference of all commands available in the Trivy VS Code Extension, accessible through the Command Palette, context menus, and keyboard shortcuts.

## Installation Commands

### trivy.install

**Description**: Install or update Trivy binary  
**Usage**: Downloads and installs the latest Trivy binary  
**Access**: Command Palette, Welcome screen  
**Requirements**: Internet connection

### trivy.update

**Description**: Update Trivy to latest version  
**Usage**: Updates existing Trivy installation  
**Access**: Command Palette, Status bar  
**Requirements**: Existing Trivy installation

### trivy.installMcpServer

**Description**: Install Trivy MCP server  
**Usage**: Sets up MCP server for AI integration  
**Access**: Command Palette  
**Requirements**: VS Code 1.99+

## Scanning Commands

### trivy.scan

**Description**: Run complete Trivy scan  
**Usage**: Executes scan with current configuration  
**Access**: Command Palette, Tree view toolbar, Status bar  
**Shortcut**: `Ctrl+Shift+T` / `Cmd+Shift+T`

### trivy.scanFile

**Description**: Scan specific file  
**Usage**: Scans only the currently active file  
**Access**: Command Palette, Editor context menu  
**Context**: Requires active editor

### trivy.version

**Description**: Show Trivy version  
**Usage**: Displays installed Trivy version information  
**Access**: Command Palette, Help view  
**Output**: Shows version in Output panel

## View Commands

### trivy.refresh

**Description**: Refresh tree views  
**Usage**: Updates tree view content without re-scanning  
**Access**: Command Palette, Tree view toolbar  
**Shortcut**: `F5` (when tree view focused)

### trivy.reset

**Description**: Clear all results  
**Usage**: Clears tree views and help view content  
**Access**: Command Palette, Tree view toolbar  
**Effect**: Removes all displayed scan results

### trivy.showHelp

**Description**: Open help view  
**Usage**: Opens integrated help documentation  
**Access**: Command Palette, Welcome screen  
**Result**: Opens help webview panel

## Configuration Commands

### Scan Type Configuration

#### trivy.scanForVulns

**Description**: Enable vulnerability scanning  
**Usage**: Turns on vulnerability detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.vulnScanning = true`

#### trivy.disableScanForVulns

**Description**: Disable vulnerability scanning  
**Usage**: Turns off vulnerability detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.vulnScanning = false`

#### trivy.scanForMisconfigs

**Description**: Enable misconfiguration scanning  
**Usage**: Turns on configuration issue detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.misconfigScanning = true`

#### trivy.disableScanForMisconfigs

**Description**: Disable misconfiguration scanning  
**Usage**: Turns off configuration issue detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.misconfigScanning = false`

#### trivy.scanForSecrets

**Description**: Enable secret scanning  
**Usage**: Turns on secret detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.secretScanning = true`

#### trivy.disableScanForSecrets

**Description**: Disable secret scanning  
**Usage**: Turns off secret detection  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.secretScanning = false`

### Package Scanning Configuration

#### trivy.setPackageJsonScanning

**Description**: Enable package.json scanning  
**Usage**: Scans Node.js dependencies without lock files  
**Access**: Command Palette  
**Setting**: `trivy.packageJsonScanning = true`

#### trivy.disablePackageJsonScanning

**Description**: Disable package.json scanning  
**Usage**: Skips Node.js dependency scanning  
**Access**: Command Palette  
**Setting**: `trivy.packageJsonScanning = false`

#### trivy.setGradleScanning

**Description**: Enable Gradle scanning  
**Usage**: Scans Gradle projects without lock files  
**Access**: Command Palette  
**Setting**: `trivy.gradleScanning = true`

#### trivy.disableGradleScanning

**Description**: Disable Gradle scanning  
**Usage**: Skips Gradle dependency scanning  
**Access**: Command Palette  
**Setting**: `trivy.gradleScanning = false`

#### trivy.setDotnetProjScanning

**Description**: Enable .NET project scanning  
**Usage**: Scans .NET projects without lock files  
**Access**: Command Palette  
**Setting**: `trivy.dotnetProjScanning = true`

#### trivy.disableDotnetProjScanning

**Description**: Disable .NET project scanning  
**Usage**: Skips .NET dependency scanning  
**Access**: Command Palette  
**Setting**: `trivy.dotnetProjScanning = false`

### Scan Behavior Configuration

#### trivy.offlineScan

**Description**: Enable offline scanning  
**Usage**: Performs scans without internet connectivity  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.offlineScan = true`

#### trivy.disableOfflineScan

**Description**: Disable offline scanning  
**Usage**: Allows internet-based vulnerability updates  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.offlineScan = false`

#### trivy.onlyFixedIssues

**Description**: Show only fixed issues  
**Usage**: Displays vulnerabilities with available fixes  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.fixedOnly = true`

#### trivy.disableOnlyFixedIssues

**Description**: Show all issues  
**Usage**: Displays all vulnerabilities regardless of fix status  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.fixedOnly = false`

### File Configuration Commands

#### trivy.useIgnoreFile

**Description**: Enable ignore file usage  
**Usage**: Applies .trivyignore.yaml exclusions  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.useIgnoreFile = true`

#### trivy.disableUseIgnoreFile

**Description**: Disable ignore file usage  
**Usage**: Ignores .trivyignore.yaml file  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.useIgnoreFile = false`

#### trivy.setIgnoreFilePath

**Description**: Set custom ignore file path  
**Usage**: Opens file picker to select ignore file  
**Access**: Command Palette  
**Dialog**: File picker for .yaml files

#### trivy.unsetIgnoreFilePath

**Description**: Reset ignore file path  
**Usage**: Clears custom ignore file path  
**Access**: Command Palette  
**Setting**: `trivy.ignoreFilePath = undefined`

#### trivy.useConfigFile

**Description**: Enable config file usage  
**Usage**: Applies trivy.yaml configuration  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.useConfigFile = true`

#### trivy.disableUseConfigFile

**Description**: Disable config file usage  
**Usage**: Ignores trivy.yaml configuration  
**Access**: Command Palette, Tree view context menu  
**Setting**: `trivy.useConfigFile = false`

#### trivy.onlyUseConfigFile

**Description**: Use only config file settings  
**Usage**: Ignores VS Code settings, uses only trivy.yaml  
**Access**: Command Palette  
**Setting**: `trivy.onlyUseConfigFile = true`

#### trivy.setConfigFilePath

**Description**: Set custom config file path  
**Usage**: Opens file picker to select config file  
**Access**: Command Palette  
**Dialog**: File picker for .yaml files

#### trivy.unsetConfigFilePath

**Description**: Reset config file path  
**Usage**: Clears custom config file path  
**Access**: Command Palette  
**Setting**: `trivy.configFilePath = undefined`

## Display Commands

#### trivy.setOrderResultsByType

**Description**: Order results by issue type  
**Usage**: Groups findings by vulnerability type  
**Access**: Command Palette  
**Setting**: `trivy.orderResultsByType = true`  
**Scope**: Global

#### trivy.unsetOrderResultsByType

**Description**: Order results by file  
**Usage**: Groups findings by file location  
**Access**: Command Palette  
**Setting**: `trivy.orderResultsByType = false`  
**Scope**: Global

## Platform Integration Commands

#### trivy.setupCommercial

**Description**: Configure Aqua Platform integration  
**Usage**: Opens Aqua Platform setup wizard  
**Access**: Command Palette, Settings  
**Result**: Webview configuration panel

#### trivy.enableAquaPlatform

**Description**: Enable Aqua Platform features  
**Usage**: Activates platform integration  
**Access**: Setup wizard  
**Requirements**: Valid API credentials

#### trivy.disableAquaPlatform

**Description**: Disable Aqua Platform features  
**Usage**: Deactivates platform integration  
**Access**: Command Palette  
**Setting**: `trivy.useAquaPlatform = false`

## Command Categories

### Essential Commands

Most frequently used commands:

1. `trivy.scan` - Run security scan
2. `trivy.refresh` - Update results
3. `trivy.install` - Install Trivy
4. `trivy.showHelp` - Access documentation

## Next Steps

- [Troubleshooting](./troubleshooting.md) - Detailed problem solving
- [Contributing](./contributing.md) - Contribute to the extension
- [Settings Reference](./settings.md) - Complete settings documentation
- [Views Overview](./views.md) - Understanding the interface
