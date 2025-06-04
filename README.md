![Deploy Extension](https://github.com/aquasecurity/trivy-vscode-extension/workflows/Deploy%20Extension/badge.svg)

# Aqua Trivy

Trivy Vulnerability Scanner is a VS Code extension that helps you find vulnerabilities in your software projects
without leaving the comfort of your VS Code window.

# Documentation

Check the [Documentation](./docs/README.md) for all the information on using the Aqua Trivy VS Code extension.

For installing the Trivy MCP Server, see the [MCP Server Setup Guide](./docs/mcp-server.md).

## Known Issues

If you find one, please file a GitHub Issue [here](https://github.com/aquasecurity/trivy-vscode-extension/issues/new).

## Feature Requests

Have a feature you desire? Please let us know by filing an issue [here](https://github.com/aquasecurity/trivy-vscode-extension/issues/new).

## Release Notes

Check the [Changelog](./CHANGELOG.md) for a more thorough history of changes

### 1.6.0

- Add support for installing the Trivy MCP Server from the extension

### 1.5.0

- Add support for the aqua platform settings

### 1.4.0

- Switch to using a cache for the results
- Remove Aqua Platform URL and use a region selector

### 1.3.0

- Add codelens for transitive dependencies
- Remove the option to upload the results to the Aqua Platform

### 1.2.1

- Make order by severity the default view
