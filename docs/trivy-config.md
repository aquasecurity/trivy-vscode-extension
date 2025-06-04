# Trivy Configuration Files

Learn how to use `trivy.yaml` configuration files and `.trivyignore.yaml` ignore files to customize Trivy scanning behavior within the VS Code extension.

## Overview

Trivy supports two main types of configuration files:

1. **trivy.yaml** - Main configuration file for scan settings
2. **.trivyignore.yaml** - File to specify what findings to ignore

These files provide more granular control than VS Code settings and can be version-controlled with your project.

## trivy.yaml Configuration File

### Basic Setup

Create a `trivy.yaml` file in your project root:

```yaml
# Basic trivy.yaml configuration
scanners:
  - vuln
  - misconfig
  - secret

vulnerability:
  type:
    - os
    - library
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

misconfig:
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

secret:
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM
```

### Enabling in VS Code

#### Method 1: Extension Settings

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "trivy config"
3. Enable **Use Config File**
4. Optionally set **Config File Path** for custom location

#### Method 2: Menu Toggle

1. Right-click in Trivy Explorer
2. Select "Use config override"

#### Method 3: JSON Settings

```json
{
  "trivy.useConfigFile": true,
  "trivy.configFilePath": "./config/trivy.yaml"
}
```

### Configuration Options

#### Scanner Selection

```yaml
# Specify which scanners to run
scanners:
  - vuln # Vulnerability scanning
  - misconfig # Misconfiguration scanning
  - secret # Secret scanning
  - license # License scanning (if supported)
```

#### Vulnerability Settings

```yaml
vulnerability:
  # Vulnerability types to detect
  type:
    - os # Operating system vulnerabilities
    - library # Library/package vulnerabilities

  # Severity levels to report
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM
    - LOW
    - UNKNOWN

  # Skip files without fixes
  skip-files:
    - 'test/**'
    - '*.test.js'
```

#### Misconfiguration Settings

```yaml
misconfig:
  # Severity levels for misconfigurations
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

  # Include specific checks
  include-non-failures: false

  # Skip certain file types
  skip-files:
    - '**/*_test.yaml'
    - 'examples/**'
```

#### Secret Detection Settings

```yaml
secret:
  # Severity levels for secrets
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

  # Skip certain paths
  skip-files:
    - '.git/**'
    - 'node_modules/**'
    - '**/*.md'
```

#### File and Path Configuration

```yaml
# Files and directories to skip
skip-files:
  - '**/*_test.go'
  - '**/testdata/**'
  - 'vendor/**'
  - 'node_modules/**'

# Directories to skip entirely
skip-dirs:
  - 'test'
  - 'tests'
  - '.git'
  - 'node_modules'

# File patterns to skip
file-patterns:
  - '*.test.js'
  - '*.spec.ts'
  - '*_test.py'
```

### Advanced Configuration

#### Custom Policies

```yaml
# Use custom policy files
misconfig:
  policy:
    - './policies/custom-k8s.rego'
    - './policies/docker-security.rego'

  # Policy namespaces
  policy-namespaces:
    - 'custom.kubernetes'
    - 'custom.docker'
```

#### Cache Configuration

```yaml
# Cache settings for better performance
cache:
  # Cache directory (relative to project root)
  dir: '.trivy-cache'

  # Clear cache before scanning
  clear: false

  # Cache backend (redis, fs)
  backend: 'fs'
```

#### Output Configuration

```yaml
# Output format and options
format: json
output: 'trivy-results.json'

# Include specific information
trace: false
quiet: false
debug: false
```

## .trivyignore.yaml Ignore File

### Basic Ignore File

Create a `.trivyignore.yaml` file in your project root:

```yaml
# Ignore specific vulnerabilities
vulnerabilities:
  # Ignore by CVE ID
  - id: 'CVE-2021-12345'
    paths:
      - 'package.json'
    reason: 'False positive - not applicable to our use case'
    expires: '2024-12-31'

  # Ignore by package
  - id: 'CVE-2021-67890'
    paths:
      - '**/node_modules/lodash/**'
    reason: 'Waiting for upstream fix'

# Ignore misconfigurations
misconfigurations:
  - id: 'DS002'
    paths:
      - 'Dockerfile'
    reason: 'Intentional design decision'

  - id: 'KSV001'
    paths:
      - 'k8s/development/**'
    reason: 'Development environment only'

# Ignore secrets
secrets:
  - id: 'generic-api-key'
    paths:
      - 'examples/**'
    reason: 'Example/demo data only'

  - id: 'aws-access-key-id'
    paths:
      - 'docs/setup.md'
    reason: 'Documentation example'
```

### Enabling Ignore Files

#### Method 1: Extension Settings

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "trivy ignore"
3. Enable **Use Ignore File**
4. Optionally set **Ignore File Path** for custom location

#### Method 2: Menu Toggle

1. Right-click in Trivy Explorer
2. Select "Use ignore file"

#### Method 3: JSON Settings

```json
{
  "trivy.useIgnoreFile": true,
  "trivy.ignoreFilePath": "./security/.trivyignore.yaml"
}
```

### Ignore File Patterns

#### By Vulnerability ID

```yaml
vulnerabilities:
  - id: 'CVE-2021-12345'
    paths:
      - 'package.json'
      - 'yarn.lock'
```

#### By Path Patterns

```yaml
vulnerabilities:
  - id: '*' # All vulnerabilities
    paths:
      - 'test/**'
      - 'examples/**'
      - '**/testdata/**'
```

#### By Package Name

```yaml
vulnerabilities:
  - package: 'lodash'
    paths:
      - '**/package.json'
    reason: 'Accepted risk for development dependency'
```

#### With Expiration Dates

```yaml
vulnerabilities:
  - id: 'CVE-2021-12345'
    paths:
      - 'package.json'
    expires: '2024-06-30'
    reason: 'Temporary exception until next major release'
```

#### By Severity Level

```yaml
vulnerabilities:
  - severity: 'LOW'
    paths:
      - '**/test/**'
    reason: 'Low severity issues acceptable in test code'
```

## Configuration Examples

### Frontend Project Configuration

```yaml
# trivy.yaml for React/Node.js project
scanners:
  - vuln
  - secret

vulnerability:
  type:
    - library
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

secret:
  severity:
    - CRITICAL
    - HIGH

skip-files:
  - 'node_modules/**'
  - 'build/**'
  - 'dist/**'
  - '**/*.test.js'
  - '**/*.spec.js'
```

```yaml
# .trivyignore.yaml for React project
vulnerabilities:
  - id: '*'
    paths:
      - '**/@types/**'
    reason: "Type definitions don't pose runtime risk"

secrets:
  - id: '*'
    paths:
      - '**/*.md'
      - '**/README*'
    reason: 'Documentation examples'
```

### Backend API Configuration

```yaml
# trivy.yaml for Go API project
scanners:
  - vuln
  - misconfig
  - secret

vulnerability:
  type:
    - os
    - library
  severity:
    - CRITICAL
    - HIGH

misconfig:
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM

skip-files:
  - '**/*_test.go'
  - '**/testdata/**'
  - 'vendor/**'
```

### Infrastructure Configuration

```yaml
# trivy.yaml for Infrastructure as Code
scanners:
  - misconfig
  - secret

misconfig:
  severity:
    - CRITICAL
    - HIGH
    - MEDIUM
    - LOW

  # Include specific policy checks
  include-non-failures: false

secret:
  severity:
    - CRITICAL
    - HIGH

skip-files:
  - '**/*.tfvars.example'
  - '**/examples/**'
```

```yaml
# .trivyignore.yaml for Infrastructure
misconfigurations:
  - id: 'DS026'
    paths:
      - '**/development/**'
    reason: 'Development environment - relaxed security'
    expires: '2024-12-31'

  - id: 'KSV001'
    paths:
      - 'k8s/jobs/**'
    reason: 'Batch jobs run as root by design'
```

## File Location and Priority

### Default Locations

Trivy looks for configuration files in this order:

1. **Current Directory**: `./trivy.yaml`, `./.trivyignore.yaml`
2. **Home Directory**: `~/.trivy.yaml`, `~/.trivyignore.yaml`
3. **System Directory**: `/etc/trivy/trivy.yaml`

### Custom Locations

#### Extension Settings

```json
{
  "trivy.configFilePath": "./config/trivy.yaml",
  "trivy.ignoreFilePath": "./config/.trivyignore.yaml"
}
```

#### Environment Variables

```bash
export TRIVY_CONFIG_FILE="./config/trivy.yaml"
export TRIVY_IGNORE_FILE="./config/.trivyignore.yaml"
```

### Priority Order

Configuration is applied in this order (later overrides earlier):

1. **Default Trivy Settings**
2. **System Configuration File** (`/etc/trivy/trivy.yaml`)
3. **User Configuration File** (`~/.trivy.yaml`)
4. **Project Configuration File** (`./trivy.yaml`)
5. **Custom Configuration File** (specified in extension settings)
6. **VS Code Extension Settings**
7. **Command Line Arguments** (when running Trivy directly)

## Validation and Testing

### Validate Configuration

Test your configuration files:

```bash
# Test trivy.yaml
trivy config trivy.yaml

# Test with actual scan
trivy fs --config trivy.yaml .

# Dry run to see what would be scanned
trivy fs --config trivy.yaml --dry-run .
```

### Debug Configuration

Enable debug mode to see how configuration is applied:

```json
{
  "trivy.debug": true
}
```

Check the Output panel for:

- Configuration file loading messages
- Applied settings
- Ignore file processing
- Path matching details

## Best Practices

### Configuration Management

1. **Version Control**: Commit configuration files to your repository
2. **Documentation**: Document configuration choices in README
3. **Team Alignment**: Ensure team agrees on security standards
4. **Regular Review**: Update configurations as project evolves

### Security Considerations

1. **Least Privilege**: Only ignore what's absolutely necessary
2. **Expiration Dates**: Set expiration dates on temporary ignores
3. **Audit Trail**: Document reasons for all ignores
4. **Regular Review**: Periodically review and clean up ignore files

### Performance Optimization

1. **Skip Unnecessary Files**: Use skip-files to improve scan speed
2. **Target Scanners**: Only run needed scanners
3. **Appropriate Severity**: Set minimum severity to reduce noise
4. **Cache Configuration**: Use cache settings for better performance

## Troubleshooting

### Common Issues

#### Configuration Not Loading

- Check file path and name spelling
- Verify YAML syntax is valid
- Ensure file permissions are readable
- Check Output panel for loading errors

#### Ignores Not Working

- Verify file paths match exactly
- Check YAML syntax in ignore file
- Ensure ignore file is enabled in settings
- Use debug mode to see path matching

#### Performance Issues

- Review skip-files configuration
- Optimize scanner selection
- Check cache settings
- Consider splitting large ignore files

### Validation Tools

```bash
# Validate YAML syntax
yamllint trivy.yaml
yamllint .trivyignore.yaml

# Test configuration
trivy config trivy.yaml

# Preview scan results
trivy fs --dry-run --config trivy.yaml .
```

## Migration Guide

### From Legacy Ignore Files

If using older `.trivyignore` format:

```bash
# Old format (deprecated)
CVE-2021-12345
DS002

# New format (.trivyignore.yaml)
vulnerabilities:
  - id: "CVE-2021-12345"
misconfigurations:
  - id: "DS002"
```

### From Command Line Arguments

Convert CLI arguments to configuration file:

```bash
# CLI command
trivy fs --severity HIGH,CRITICAL --scanners vuln,misconfig .

# Equivalent trivy.yaml
scanners:
  - vuln
  - misconfig
vulnerability:
  severity:
    - HIGH
    - CRITICAL
misconfig:
  severity:
    - HIGH
    - CRITICAL
```

## Next Steps

- [Extension Settings](./settings.md) - VS Code-specific configuration
- [JSON Configuration](./json-config.md) - VS Code settings.json setup
- [Scanning Guide](./scanning.md) - Using configuration during scans
- [Aqua Platform Integration](./aqua-platform.md) - Platform-specific configuration
