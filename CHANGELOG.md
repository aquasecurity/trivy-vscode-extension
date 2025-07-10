# Change Log

## 1.8.2

- Add envvar to report to Aqua Platform the source of the request

## 1.8.1

- Fix bug to ensure that problems are cleared on every scan

## 1.8.0

- Add support for SAST when using the Aqua Platform scan
- Add option to use custom URLs for connecting to the Aqua Platform

## 1.7.0

- Add Context menu to issues to add them to the ignorefile if found, otherwise create a .trivyignore.yaml

## 1.6.1

- Update the way assurance policy tree items are lazy loaded to ensure child nodes get created correctly

## 1.6.0

- Add support for installing the Trivy MCP Server from the extension

## 1.5.0

- Add support for the aqua platform settings

## 1.4.0

- Switch to using a cache for the results
- Remove Aqua Platform URL and use a region selector

## 1.3.0

- Add codelens for transitive dependencies
- Remove the option to upload the results to the Aqua Platform

## 1.2.1

- Make order by severity the default view

## 1.2.0

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

### 0.8.2

- Add a basic walkthrough for new users

### 0.8.1

- Add support for ignoring files in the .gitignore file

### 0.8.0

- Add support for managing the config through the UI
- Add support for multiple workspaces in the explorer
- Add tests and process around the code

### 0.6.0

- Add support for secrets - turn on in the extension settings

### 0.5.1

- Fix json check

### 0.5.0

- Add support for newer format of json results

### 0.4.1

- Fix typo in the configuration settings

### 0.4.0

- Add additional settings for offline and minimum severity

### 0.3.0

- Add Findings viewer

### 0.2.0

- All notable changes to the "trivy-vulnerability-scanner" extension will be documented in this file.

- Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release
