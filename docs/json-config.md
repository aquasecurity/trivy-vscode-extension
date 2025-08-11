# JSON Configuration

Advanced configuration of the Trivy VS Code Extension using JSON configuration files and VS Code's settings.json.

## VS Code Settings JSON

### Accessing Settings JSON

1. **Command Palette Method**:
   - Press `F1` or `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Preferences: Open Settings (JSON)"
   - Press Enter

2. **Settings UI Method**:
   - Open Settings (`Ctrl+,` / `Cmd+,`)
   - Click the "Open Settings (JSON)" icon in the top-right

3. **Direct File Access**:
   - **User Settings**: `~/.vscode/settings.json` (global)
   - **Workspace Settings**: `.vscode/settings.json` (project-specific)

### Configuration Examples

#### Basic Configuration

```json
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": false,
  "trivy.minimumReportedSeverity": "HIGH",
  "trivy.orderResultsByType": true
}
```

#### Development Environment

```json
{
  "trivy.debug": true,
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.minimumReportedSeverity": "MEDIUM",
  "trivy.offlineScan": false,
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./.trivyignore.yaml"
}
```

#### Production/CI Environment

```json
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.minimumReportedSeverity": "CRITICAL",
  "trivy.fixedOnly": true,
  "trivy.useConfigFile": true,
  "trivy.onlyUseConfigFile": true,
  "trivy.configFilePath": "./security/trivy.yaml"
}
```

#### Custom Binary Location

```json
{
  "trivy.binaryPath": "/opt/trivy/bin/trivy",
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.minimumReportedSeverity": "HIGH"
}
```

#### Multi-Language Project

```json
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.packageJsonScanning": true,
  "trivy.gradleScanning": true,
  "trivy.dotnetProjScanning": true,
  "trivy.ignoreFilesInGitIgnore": true,
  "trivy.minimumReportedSeverity": "MEDIUM"
}
```

## Workspace vs User Settings

### User Settings (Global)

- Apply to all VS Code instances
- Located in user profile directory
- Good for personal preferences like debug mode

```json
// User settings.json
{
  "trivy.debug": false,
  "trivy.binaryPath": "/usr/local/bin/trivy",
  "trivy.orderResultsByType": true
}
```

### Workspace Settings (Project-Specific)

- Apply only to specific project
- Located in `.vscode/settings.json` within project
- Good for project-specific security requirements
- Override user settings

```json
// .vscode/settings.json
{
  "trivy.minimumReportedSeverity": "HIGH",
  "trivy.secretScanning": true,
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./security/.trivyignore.yaml"
}
```

## Multi-Root Workspace Configuration

For projects with multiple root folders:

### .code-workspace File

```json
{
  "folders": [
    { "path": "./frontend" },
    { "path": "./backend" },
    { "path": "./infrastructure" }
  ],
  "settings": {
    "trivy.vulnScanning": true,
    "trivy.misconfigScanning": true,
    "trivy.minimumReportedSeverity": "MEDIUM"
  }
}
```

### Folder-Specific Settings

Each folder can have its own `.vscode/settings.json`:

```
project/
├── .code-workspace
├── frontend/
│   └── .vscode/
│       └── settings.json    # Frontend-specific settings
├── backend/
│   └── .vscode/
│       └── settings.json    # Backend-specific settings
└── infrastructure/
    └── .vscode/
        └── settings.json    # Infrastructure-specific settings
```

Example frontend settings:

```json
{
  "trivy.secretScanning": true,
  "trivy.packageJsonScanning": true,
  "trivy.minimumReportedSeverity": "HIGH"
}
```

Example infrastructure settings:

```json
{
  "trivy.misconfigScanning": true,
  "trivy.vulnScanning": false,
  "trivy.minimumReportedSeverity": "CRITICAL"
}
```

## Environment-Specific Configurations

### Development Profile

Create a development-specific configuration:

```json
{
  "trivy.debug": true,
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.minimumReportedSeverity": "LOW",
  "trivy.orderResultsByType": false,
  "trivy.useIgnoreFile": false
}
```

### Security Audit Profile

For comprehensive security reviews:

```json
{
  "trivy.debug": false,
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.minimumReportedSeverity": "UNKNOWN",
  "trivy.fixedOnly": false,
  "trivy.offlineScan": false,
  "trivy.orderResultsByType": true
}
```

### CI/CD Profile

Optimized for automated pipelines:

```json
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.minimumReportedSeverity": "HIGH",
  "trivy.fixedOnly": true,
  "trivy.useConfigFile": true,
  "trivy.onlyUseConfigFile": true
}
```

## Advanced JSON Patterns

### Conditional Settings

Use VS Code's language-specific settings:

```json
{
  "[dockerfile]": {
    "trivy.misconfigScanning": true,
    "trivy.vulnScanning": false
  },
  "[json]": {
    "trivy.packageJsonScanning": true,
    "trivy.secretScanning": true
  },
  "[yaml]": {
    "trivy.misconfigScanning": true,
    "trivy.secretScanning": true
  }
}
```

### Team Shared Settings

Create a shared configuration file for team consistency:

```json
// .vscode/settings.json (committed to repository)
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.minimumReportedSeverity": "MEDIUM",
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./security/.trivyignore.yaml",
  "trivy.useConfigFile": true,
  "trivy.configFilePath": "./security/trivy.yaml",
  "trivy.orderResultsByType": true
}
```

## Configuration Validation

### Schema Validation

VS Code provides IntelliSense and validation for Trivy settings:

```json
{
  "trivy.minimumReportedSeverity": "INVALID_VALUE" // ❌ Will show error
}
```

Valid severity values:

- `"CRITICAL"`
- `"HIGH"`
- `"MEDIUM"`
- `"LOW"`
- `"UNKNOWN"`

### Path Validation

File paths are validated when settings are applied:

```json
{
  "trivy.binaryPath": "/nonexistent/trivy", // ❌ Will show warning
  "trivy.ignoreFilePath": "./missing-file.yaml", // ❌ Will show warning
  "trivy.configFilePath": "./valid-config.yaml" // ✅ Valid if file exists
}
```

## Settings Hierarchy

Settings are applied in this order (later overrides earlier):

1. **Default Extension Settings**
2. **User Settings** (`~/.vscode/settings.json`)
3. **Workspace Settings** (`.code-workspace` file)
4. **Folder Settings** (`.vscode/settings.json` in project)

## Configuration Templates

### Minimal Security Setup

```json
{
  "trivy.vulnScanning": true,
  "trivy.minimumReportedSeverity": "HIGH"
}
```

### Comprehensive Security Setup

```json
{
  "trivy.vulnScanning": true,
  "trivy.misconfigScanning": true,
  "trivy.secretScanning": true,
  "trivy.packageJsonScanning": true,
  "trivy.gradleScanning": true,
  "trivy.dotnetProjScanning": true,
  "trivy.minimumReportedSeverity": "MEDIUM",
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./.trivyignore.yaml",
  "trivy.useConfigFile": true,
  "trivy.configFilePath": "./trivy.yaml",
  "trivy.orderResultsByType": true,
  "trivy.ignoreFilesInGitIgnore": true
}
```

## Backup and Migration

### Exporting Settings

1. Open settings JSON
2. Copy all `trivy.*` entries
3. Save to a backup file

### Importing Settings

1. Open settings JSON
2. Paste saved configuration
3. Adjust paths as needed for new environment

## Troubleshooting JSON Configuration

### Common Issues

1. **Invalid JSON Syntax**
   - Use JSON validators
   - Check for trailing commas
   - Ensure proper quoting

2. **Invalid Setting Names**
   - Use IntelliSense in VS Code
   - Check spelling of setting keys

3. **Invalid Values**
   - Check enum values for severity settings
   - Verify file paths exist

### Debugging Configuration

1. Enable debug mode: `"trivy.debug": true`
2. Check Output panel for configuration errors
3. Verify settings through Settings UI

## Next Steps

- [Trivy Configuration Files](./trivy-config.md) - Using trivy.yaml for advanced configuration
- [Extension Settings](./settings.md) - Complete settings reference
- [Aqua Platform Integration](./aqua-platform.md) - Platform-specific configuration
