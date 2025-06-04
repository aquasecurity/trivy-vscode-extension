# Problems Panel Integration

The Trivy VS Code Extension integrates seamlessly with VS Code's Problems panel to display security findings alongside other code issues.

## Problems Panel Overview

### What is the Problems Panel?

The Problems panel is VS Code's standard interface for displaying:

- **Compiler errors**: TypeScript, JavaScript, etc.
- **Linting issues**: ESLint, TSLint warnings
- **Security findings**: Trivy vulnerabilities and misconfigurations
- **Other diagnostics**: Custom analyzers and tools

### Accessing the Problems Panel

- **Menu**: View → Problems
- **Keyboard**: `Ctrl+Shift+M` / `Cmd+Shift+M`
- **Command Palette**: `F1` → "View: Toggle Problems"
- **Status Bar**: Click error/warning counts

## Trivy Integration

### Diagnostic Types

Trivy findings appear as VS Code diagnostics:

#### Vulnerability Diagnostics

- **Type**: Error or Warning (based on severity)
- **Source**: "Trivy"
- **Message**: CVE ID and description
- **Location**: File and line (when applicable)

#### Misconfiguration Diagnostics

- **Type**: Warning or Information
- **Source**: "Trivy"
- **Message**: Configuration issue description
- **Location**: Specific configuration line

#### Secret Diagnostics

- **Type**: Error (always high severity)
- **Source**: "Trivy"
- **Message**: Secret type and location
- **Location**: Exact secret position

### Severity Mapping

Trivy severities map to VS Code diagnostic levels:

| Trivy Severity | VS Code Level | Icon |
| -------------- | ------------- | ---- |
| CRITICAL       | Error         | ❌   |
| HIGH           | Error         | ❌   |
| MEDIUM         | Warning       | ⚠️   |
| LOW            | Information   | ℹ️   |
| UNKNOWN        | Information   | ℹ️   |

## Problems Panel Features

### Filtering and Sorting

#### Built-in Filters

- **By severity**: Errors, Warnings, Info
- **By source**: Show only "Trivy" findings
- **By file**: Filter to specific files
- **By text**: Search within messages

#### Custom Filters

Create saved filter presets:

1. Apply desired filters
2. Save filter configuration
3. Quick access to common views

### Grouping Options

Organize problems by:

- **File**: Group by source file
- **Severity**: Group by error level
- **Source**: Group by diagnostic source
- **Type**: Group by problem category

### Navigation Features

- **Double-click**: Jump to problem location
- **F8**: Go to next problem
- **Shift+F8**: Go to previous problem
- **Ctrl+Click**: Open in new editor

## Integration Benefits

### Unified Experience

- **Single interface**: All code issues in one place
- **Consistent navigation**: Standard VS Code behavior
- **Tool integration**: Works with other analyzers
- **Familiar workflow**: Uses existing VS Code patterns

### Enhanced Productivity

- **Quick fixes**: Jump directly to issues
- **Batch operations**: Handle multiple issues
- **Context awareness**: See related problems
- **Progress tracking**: Monitor fix progress

## Next Steps

- [Views Overview](./views.md) - Complete views documentation
- [Tree View](./tree-view.md) - Tree view explorer details
- [CodeLens Integration](./codelens.md) - Inline code annotations
- [Commands Reference](./commands.md) - All available commands
