# Troubleshooting

Comprehensive troubleshooting guide for common issues with the Trivy VS Code Extension.

## Quick Diagnostics

### Extension Health Check

Run these quick checks to identify common issues:

1. **Extension Status**: Ensure extension is active

   - Open Extensions view (`Ctrl+Shift+X`)
   - Search for "Trivy"
   - Verify extension is enabled and up-to-date

2. **Trivy Installation**: Check Trivy binary

   - Command Palette: "Show Version"
   - Expected: Version information in Output panel
   - If missing: Run "Install Trivy"

3. **Configuration**: Verify basic settings

   - Open Settings (`Ctrl+,`)
   - Search for "trivy"
   - Check `trivy.binaryPath` and scan settings

4. **Output Panel**: Check for error messages
   - View → Output → Select "Trivy"
   - Look for red error messages or warnings

## Installation Issues

### Trivy Binary Not Found

#### Symptoms

- "Trivy not found" error messages
- Scan commands fail immediately
- Version command shows no output

#### Solutions

1. **Automatic Installation**

   ```
   Command Palette → "Install Trivy"
   ```

2. **Manual Installation**

   ```bash
   # macOS (Homebrew)
   brew install trivy

   # Linux (apt)
   sudo apt-get install trivy

   # Windows (Chocolatey)
   choco install trivy
   ```

3. **Custom Binary Path**

   ```json
   {
     "trivy.binaryPath": "/usr/local/bin/trivy"
   }
   ```

4. **Verify Installation**
   ```bash
   trivy --version
   which trivy  # macOS/Linux
   where trivy  # Windows
   ```

### Permission Issues

#### Symptoms

- "Permission denied" errors
- Installation fails
- Binary exists but cannot execute

#### Solutions

1. **File Permissions** (macOS/Linux)

   ```bash
   chmod +x /path/to/trivy
   ```

2. **Security Settings** (macOS)

   ```bash
   xattr -d com.apple.quarantine /path/to/trivy
   ```

3. **Admin Rights** (Windows)
   - Run VS Code as Administrator
   - Check Windows Defender exclusions

### Network Issues

#### Symptoms

- Download failures during installation
- "Unable to connect" errors
- Timeout during vulnerability database updates

#### Solutions

1. **Proxy Configuration**

   ```json
   {
     "http.proxy": "http://proxy.company.com:8080",
     "trivy.offlineScan": true
   }
   ```

2. **Firewall Settings**

   - Allow VS Code through firewall
   - Allow Trivy binary internet access
   - Check corporate network restrictions

3. **Offline Mode**
   ```json
   {
     "trivy.offlineScan": true
   }
   ```

## Scanning Issues

### No Results Found

#### Symptoms

- Scan completes but shows no findings
- Tree view remains empty
- "No vulnerabilities found" but expected results

#### Troubleshooting Steps

1. **Check Scan Configuration**

   ```json
   {
     "trivy.vulnScanning": true,
     "trivy.misconfigScanning": true,
     "trivy.secretScanning": true
   }
   ```

2. **Verify File Types**

   - Ensure workspace contains scannable files
   - Check supported file formats
   - Verify files are not in .gitignore

3. **Check Severity Filter**

   ```json
   {
     "trivy.minimumReportedSeverity": "LOW"
   }
   ```

4. **Disable Ignore Files Temporarily**

   ```json
   {
     "trivy.useIgnoreFile": false
   }
   ```

5. **Debug Mode**
   ```json
   {
     "trivy.debug": true
   }
   ```

### Scan Failures

#### Symptoms

- Scan process crashes
- Error messages during scanning
- Incomplete scan results

#### Common Causes and Solutions

1. **Large Workspace**

   - **Problem**: Timeout or memory issues
   - **Solution**: Scan specific directories

   ```json
   {
     "trivy.scanTimeout": 600000,
     "trivy.maxFileSize": "50MB"
   }
   ```

2. **Corrupted Cache**

   - **Problem**: Stale or corrupted scan cache
   - **Solution**: Clear cache directory

   ```bash
   # Clear Trivy cache
   trivy clean --all
   ```

3. **Insufficient Resources**

   - **Problem**: System running out of memory
   - **Solution**: Close other applications, increase limits

4. **File System Issues**
   - **Problem**: Permission or access issues
   - **Solution**: Check file permissions and ownership

### Performance Issues

#### Symptoms

- Slow scan execution
- VS Code becomes unresponsive
- High CPU or memory usage

#### Optimization Strategies

1. **Exclude Unnecessary Files**

   ```yaml
   # .trivyignore.yaml
   node_modules/
   *.log
   .git/
   dist/
   build/
   ```

2. **Limit Scan Scope**

   ```json
   {
     "trivy.packageJsonScanning": false,
     "trivy.gradleScanning": false,
     "trivy.dotnetProjScanning": false
   }
   ```

3. **Adjust Severity Threshold**

   ```json
   {
     "trivy.minimumReportedSeverity": "HIGH"
   }
   ```

4. **Enable Offline Mode**
   ```json
   {
     "trivy.offlineScan": true
   }
   ```

## Configuration Issues

### Settings Not Applied

#### Symptoms

- Changes to settings don't take effect
- Scans ignore configuration
- Default behavior despite custom settings

#### Solutions

1. **Reload VS Code Window**

   ```
   Command Palette → "Developer: Reload Window"
   ```

2. **Check Settings Scope**

   - User vs Workspace settings
   - Multi-root workspace configuration
   - Setting precedence order

3. **Verify JSON Syntax**

   ```json
   {
     "trivy.vulnScanning": true,  // ✅ Correct
     "trivy.vulnScanning": True,  // ❌ Wrong (Python syntax)
   }
   ```

4. **Clear Extension Cache**
   - Restart VS Code
   - Clear extension host cache

### Configuration File Issues

#### Symptoms

- trivy.yaml not recognized
- .trivyignore.yaml not working
- Configuration file syntax errors

#### Solutions

1. **Verify File Location**

   ```
   project-root/
   ├── trivy.yaml           # ✅ Correct location
   ├── .trivyignore.yaml    # ✅ Correct location
   └── .vscode/
       └── settings.json
   ```

2. **Check File Syntax**

   ```yaml
   # trivy.yaml - Correct YAML syntax
   severity:
     - CRITICAL
     - HIGH

   scanners:
     - vuln
     - config
   ```

3. **Enable Config File Usage**

   ```json
   {
     "trivy.useConfigFile": true,
     "trivy.configFilePath": "./trivy.yaml"
   }
   ```

4. **Validate YAML Syntax**
   - Use YAML validator
   - Check indentation (spaces, not tabs)
   - Verify proper list syntax

## Platform Integration Issues

### Aqua Platform Connection

#### Symptoms

- Authentication failures
- "Unable to connect to platform"
- API key validation errors

#### Solutions

1. **Verify Credentials**

   - Check API key format
   - Verify API secret
   - Confirm region selection

2. **Network Connectivity**

   ```bash
   # Test API connectivity
   curl -H "X-API-Key: YOUR_API_KEY" \
        https://api.supply-chain.cloud.aquasec.com/v1/health
   ```

3. **Region Configuration**

   ```json
   {
     "trivy.aquaApiUrl": "https://api.eu-1.supply-chain.cloud.aquasec.com",
     "trivy.aquaAuthenticationUrl": "https://eu-1.api.cloudsploit.com"
   }
   ```

4. **Reconfigure Platform**
   ```
   Command Palette → "Configure Aqua Platform"
   ```

## UI and Display Issues

### Tree View Problems

#### Symptoms

- Empty tree view
- Tree view not loading
- Missing icons or formatting

#### Solutions

1. **Refresh Tree View**

   ```
   Command Palette → "Refresh Tree View"
   ```

2. **Reset Extension State**

   ```
   Command Palette → "Reset"
   ```

3. **Check Tree View Focus**

   - Ensure tree view is visible
   - Click to focus tree view panel
   - Check if collapsed/expanded

4. **Verify VS Code Theme**
   - Some themes may hide icons
   - Try default light/dark theme
   - Check icon font installation

### Problems Panel Issues

#### Symptoms

- Trivy issues not appearing in Problems panel
- Incorrect severity mapping
- Missing diagnostic information

#### Solutions

1. **Enable Diagnostics**

   ```json
   {
     "trivy.problems.enableDiagnostics": true
   }
   ```

2. **Check Problems Panel Filter**

   - Remove source filters
   - Show all severities
   - Clear text filters

3. **Restart Language Server**
   ```
   Command Palette → "TypeScript: Restart TS Server"
   ```

## Debug Mode and Logging

### Enable Debug Mode

Get detailed logging for troubleshooting:

```json
{
  "trivy.debug": true
}
```

### View Debug Logs

1. **Output Panel**: View → Output → "Trivy"
2. **Developer Console**: Help → Toggle Developer Tools
3. **Extension Host Log**: Check extension host console

### Log Analysis

Look for these patterns in logs:

#### Error Patterns

```
[ERROR] Failed to execute trivy: spawn ENOENT
[ERROR] Trivy scan failed with exit code 1
[ERROR] Unable to parse trivy output
[ERROR] Configuration file not found
```

#### Warning Patterns

```
[WARN] Trivy binary not found in PATH
[WARN] No scannable files found in workspace
[WARN] Ignore file contains invalid patterns
[WARN] API rate limit exceeded
```

### Diagnostic Commands

Run these commands for detailed diagnostics:

```bash
# Check Trivy installation
trivy --version

# Test basic scanning
trivy fs --format json .

# Check configuration
trivy config

# Verify database
trivy image --download-db-only
```

## Getting Help

### Self-Help Resources

1. **Built-in Help**: Command Palette → "Show Help"
2. **Documentation**: [Extension docs](./README.md)
3. **Trivy Documentation**: [Official Trivy docs](https://aquasecurity.github.io/trivy/)

### Community Support

1. **GitHub Issues**: [Report bugs and feature requests](https://github.com/aquasecurity/trivy-vscode-extension/issues)
2. **Discussions**: [Community discussions](https://github.com/aquasecurity/trivy-vscode-extension/discussions)
3. **Slack**: [Aqua Security Community](https://slack.aquasec.com)

### Bug Reports

When reporting issues, include:

1. **Environment Information**

   - VS Code version
   - Extension version
   - Operating system
   - Trivy version

2. **Reproduction Steps**

   - Exact steps to reproduce
   - Expected vs actual behavior
   - Minimal test case

3. **Logs and Output**

   - Debug mode logs
   - Error messages
   - Console output

4. **Configuration**
   - Relevant settings
   - Configuration files
   - Environment variables

### Template for Bug Reports

```markdown
## Environment

- VS Code Version:
- Extension Version:
- Trivy Version:
- OS:

## Description

Brief description of the issue

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Logs
```

Debug logs from Output panel

````

## Configuration
```json
{
  "relevant": "settings"
}
````

```

## Next Steps

- [Contributing](./contributing.md) - Contribute to the extension
- [Commands Reference](./commands.md) - All available commands
- [Settings Reference](./settings.md) - Complete settings documentation
- [Installation Guide](./installation.md) - Detailed installation instructions
```
