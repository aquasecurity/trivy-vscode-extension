![Deploy Extension](https://github.com/aquasecurity/trivy-vscode-extension/workflows/Deploy%20Extension/badge.svg)

# Aqua Trivy

Trivy Vulnerability Scanner is a VS Code extension that helps you find vulnerabilities in your software projects
without leaving the comfort of your VS Code window.

## Requirements

Trivy is required for the plugin - if it is available on the `PATH` then the extension will use that version. If it can't be found, you will be presented with the choice of specifying where it is or installing.

![install](.github/images/install.png)

If you choose to install, the output window will open with the details of what is being installed and where, it will be installed to the extensions directory and be removed when the extension is uninstalled.

## Usage

The Aqua Trivy extension comes with a walkthrough quick start to show you the key areas, we recommend you look at that the first time you use it.

When the extension is opened and Trivy is installed, you can run a scan of the current project or workspaces and it will generate a list of issues broken down by file.

![findings](.github/images/scan_results.png)

The menu allows you to turn on workspace specific options as part of the scan.

![menu](.github/images/menu.png)

## Aqua Plugin

If you are an Aqua customer, you can use your `AQUA_KEY` and `AQUA_SECRET` to get additional assurance policy results.

### Configure for Aqua Platform

From the menu, select `Trivy Aqua Platform Integration` and provide your Aqua details.

![integration](media/platform.png)

Now run a scan as normal and you will have additional policy results.

## Installing the Trivy MCP Server

Trivy has an MCP Server that is compatible with VS Code. The MCP Server can be configured from this extension by pressing `F1` then searching for `Install Trivy MCP Server`

The version of VS Code must be at least v1.99.0 - this was when MCP Server support was added.

The installation process will:

- install the `mcp` plugin for Trivy using `trivy plugin install mcp`
- ensure that `chat.agent.enabled` and `chat.mcp.discovery.enabled` are both `true` in the settings
- add a `trivy` mcp server if it isn't already present in the settings
- open the `settings.json` to show the changes that have been made

For more details about the Trivy MCP Server, check the MCP repo [README.md](https://github.com/aquasecurity/trivy-mcp/blob/main/README.md)

## Known Issues

If you find one, please file a GitHub Issue [here](https://github.com/aquasecurity/trivy-vscode-extension/issues/new).

## Feature Requests

Have a feature you desire? Please let us know by filing an issue [here](https://github.com/aquasecurity/trivy-vscode-extension/issues/new).

## Release Notes

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

### 1.2.0

- Make order by type and severity available to all users

### 1.1.0

- Configure Scanners to use for scan
- Update the Treeview when using Aqua Platform

### 1.0.4

- Fixes the Trivy installer for Windows and Linux
- Correctly handle spaces in directories

### 1.0.3

- Validate Aqua Platform settings before setting

### 1.0.2

- Remove hard coded links to dev env

### 1.0.1

- Fix issue with required resources and node_modules for webview

### 1.0.0

- Add support for installing and updating a built in version of Trivy
- Add support for the Aqua plugin
  - Use Aqua Key and Secret to get Assurance results
- Rework the Tree view to be more informative
- Only allow single runs to happen at anyone time
- Rework the icons to be more consistent
- Switch to using webpack to package vsix and streamline significantly

### 0.9.0

- Add Trivy findings to the Problems view

### 0.8.0

- Add support for managing the config through the UI
- Add support for multiple workspaces in the explorer
- Add tests and process around the code

### 0.6.1

Handle findings inside tarballs

### 0.6.0

Add support for secrets - turn on in the extension settings

### 0.5.1

Fix json check

### 0.5.0

Add support for newer format of json results

### 0.4.1

Fix typo in the configuration settings

### 0.4.0

Add additional settings for offline and minimum severity

### 0.3.0

Add Findings viewer and help

### 0.2.0

Automatic detection of old Trivy versions.

### 0.1.1

Initial release with basic project scanning.
