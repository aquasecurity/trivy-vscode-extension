# Contributing to Trivy VS Code Extension

Thank you for your interest in contributing to the Trivy VS Code Extension! This guide will help you get started with development, testing, and submitting contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Structure](#code-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **VS Code**: Latest version
- **Git**: Version control
- **Trivy**: Latest version for testing

### Development Environment

1. **Fork the Repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/trivy-vscode-extension.git
   cd trivy-vscode-extension
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

## Development Setup

### Project Structure

```
trivy-vscode-extension/
├── src/                    # Source code
│   ├── extension.ts        # Main extension entry point
│   ├── activate_commands.ts # Command registration
│   ├── command/            # Trivy command handling
│   ├── ui/                 # User interface components
│   ├── cache/              # Result caching
│   └── commercial/         # Aqua Platform integration
├── test/                   # Test files
├── docs/                   # Documentation
├── resources/              # Extension resources
├── package.json            # Extension manifest
└── webpack.config.js       # Build configuration
```

### Key Files

- **`package.json`**: Extension manifest with commands, settings, and contributions
- **`src/extension.ts`**: Main extension activation and lifecycle
- **`src/activate_commands.ts`**: Command registration and handling
- **`src/command/command.ts`**: Trivy execution and wrapper
- **`src/ui/treeview/`**: Tree view providers and UI components

### VS Code Development

1. **Open Extension in Development Host**

   - Press `F5` to launch Extension Development Host
   - Or use "Run Extension" debug configuration

2. **Debug Extension**

   - Set breakpoints in TypeScript code
   - Use VS Code debugger
   - Check Debug Console for output

3. **Reload Extension**
   - `Ctrl+R` / `Cmd+R` in Extension Development Host
   - Or use "Developer: Reload Window"

## Code Structure

### Extension Architecture

#### Main Components

1. **Extension Activation** (`extension.ts`)

   - Extension lifecycle management
   - Configuration synchronization
   - Provider registration

2. **Command System** (`activate_commands.ts`)

   - Command registration
   - Configuration updates
   - Context management

3. **Trivy Integration** (`command/`)

   - Trivy execution wrapper
   - Command option handling
   - Output processing

4. **User Interface** (`ui/`)
   - Tree view providers
   - Help view webview
   - CodeLens provider
   - Notification system

#### Data Flow

```
User Action → Command → Trivy Wrapper → Trivy Binary → Results → UI Update
```

### Key Interfaces

#### TrivyWrapper

Main interface for Trivy execution:

```typescript
export class TrivyWrapper {
  run(secrets: vscode.SecretStorage): Promise<void>;
  showCurrentTrivyVersion(): Promise<void>;
  // ... other methods
}
```

#### Tree View Provider

Provides data for tree views:

```typescript
export class TrivyTreeViewProvider
  implements vscode.TreeDataProvider<TrivyTreeItem>
{
  getTreeItem(element: TrivyTreeItem): vscode.TreeItem;
  getChildren(element?: TrivyTreeItem): Thenable<TrivyTreeItem[]>;
  // ... other methods
}
```

#### Configuration Options

Type-safe configuration handling:

```typescript
export interface TrivyCommandOption {
  apply(command: string[], config?: vscode.WorkspaceConfiguration): string[];
}
```

## Development Workflow

### Feature Development

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Feature**

   - Write TypeScript code
   - Add necessary tests
   - Update documentation

3. **Test Locally**

   - Run in Extension Development Host
   - Test with various workspaces
   - Verify all scan types work

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Bug Fix Workflow

1. **Reproduce Issue**

   - Create minimal test case
   - Document expected vs actual behavior
   - Identify root cause

2. **Implement Fix**

   - Write focused fix
   - Add regression tests
   - Verify fix works

3. **Test Thoroughly**
   - Test original issue
   - Run full test suite
   - Check for side effects

### Code Guidelines

#### TypeScript Best Practices

- Use strict type checking
- Prefer interfaces over types
- Use async/await over Promises
- Handle errors appropriately

```typescript
// ✅ Good
async function scanWorkspace(): Promise<ScanResult> {
  try {
    const result = await trivyWrapper.scan();
    return result;
  } catch (error) {
    showErrorMessage(`Scan failed: ${error.message}`);
    throw error;
  }
}

// ❌ Avoid
function scanWorkspace() {
  return trivyWrapper
    .scan()
    .then((result) => {
      return result;
    })
    .catch((error) => {
      console.log(error);
    });
}
```

#### VS Code API Usage

- Use appropriate VS Code APIs
- Handle disposables properly
- Respect configuration scopes
- Follow VS Code UX guidelines

```typescript
// ✅ Register disposables
const disposable = vscode.commands.registerCommand('trivy.scan', () => {
  // command implementation
});
context.subscriptions.push(disposable);

// ✅ Handle configuration changes
const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('trivy')) {
    // handle configuration change
  }
});
context.subscriptions.push(configListener);
```

## Testing

### Test Structure

```
test/
├── suite/                  # Test suites
│   ├── extension.test.ts   # Extension tests
│   ├── command/            # Command tests
│   └── explorer/           # UI tests
├── golden/                 # Golden file tests
└── runTest.ts             # Test runner
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "TrivyWrapper"

# Run with coverage
npm run test:coverage
```

### Writing Tests

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { TrivyWrapper } from '../../src/command/command';

suite('TrivyWrapper Tests', () => {
  test('Should execute trivy scan', async () => {
    const wrapper = new TrivyWrapper();
    const result = await wrapper.run();
    assert.strictEqual(result.success, true);
  });
});
```

### Test Guidelines

- Write unit tests for new functionality
- Include integration tests for complex features
- Use mocks for external dependencies
- Test error conditions and edge cases

## Code Style

### ESLint Configuration

The project uses ESLint for code quality:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

Use Prettier for consistent formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Code Style Rules

- Use 2 spaces for indentation
- Single quotes for strings
- Trailing commas in objects and arrays
- Semicolons required
- Max line length: 100 characters

### Commit Messages

Follow Conventional Commits:

```bash
# Feature
git commit -m "feat: add secret scanning support"

# Bug fix
git commit -m "fix: resolve tree view refresh issue"

# Documentation
git commit -m "docs: update installation guide"

# Refactor
git commit -m "refactor: simplify command handling"
```

## Documentation

### Documentation Types

1. **Code Documentation**

   - JSDoc comments for public APIs
   - Inline comments for complex logic
   - README updates for new features

2. **User Documentation**

   - Feature documentation in `docs/`
   - Configuration examples
   - Troubleshooting guides

3. **API Documentation**
   - Interface documentation
   - Command documentation
   - Settings documentation

### Writing Guidelines

- Clear, concise language
- Include code examples
- Provide troubleshooting information
- Keep documentation up-to-date

```typescript
/**
 * Executes a Trivy scan on the workspace
 * @param secrets VS Code secret storage for API keys
 * @param target Optional target directory (defaults to workspace root)
 * @returns Promise resolving to scan results
 * @throws Error if Trivy binary not found or scan fails
 */
async function runScan(
  secrets: vscode.SecretStorage,
  target?: string
): Promise<ScanResult> {
  // Implementation
}
```

## Submitting Changes

### Pull Request Process

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/trivy-vscode-extension.git
   ```

2. **Create Branch**

   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Changes**

   - Implement feature/fix
   - Add tests
   - Update documentation

4. **Test Changes**

   ```bash
   npm test
   npm run lint
   npm run compile
   ```

5. **Submit Pull Request**
   - Clear title and description
   - Reference related issues
   - Include testing instructions

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings/errors
```

### Review Process

1. **Automated Checks**

   - CI/CD pipeline runs
   - Tests must pass
   - Linting must pass
   - Build must succeed

2. **Code Review**

   - Maintainer reviews code
   - Feedback addressed
   - Approval granted

3. **Merge**
   - Squash and merge
   - Update changelog
   - Tag release if needed

## Release Process

### Version Management

Follow semantic versioning (SemVer):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Release Steps

1. **Update Version**

   ```bash
   npm version patch|minor|major
   ```

2. **Update Changelog**

   - Document new features
   - List bug fixes
   - Note breaking changes

3. **Create Release**
   - Tag release in Git
   - Publish to VS Code Marketplace
   - Update GitHub release notes

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow project guidelines

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Questions and community help
- **Slack**: Real-time community chat

### Recognition

Contributors are recognized through:

- GitHub contributor graphs
- Release notes mentions
- Community acknowledgments

## Development Tips

### Debugging

```typescript
// Use VS Code debug output
console.log('Debug info:', data);

// Use extension output channel
const output = vscode.window.createOutputChannel('Trivy Debug');
output.appendLine('Debug message');
output.show();
```

### Performance

- Use async/await for non-blocking operations
- Cache expensive computations
- Debounce frequent operations
- Profile with VS Code Performance Profiler

### VS Code Best Practices

- Use appropriate activation events
- Dispose of resources properly
- Respect user preferences
- Follow accessibility guidelines

Thank you for contributing to the Trivy VS Code Extension! Your contributions help make security scanning more accessible and effective for developers worldwide.

## Next Steps

- [Troubleshooting](./troubleshooting.md) - Debug common issues
- [Commands Reference](./commands.md) - All available commands
- [Extension Settings](./settings.md) - Configuration options
- [GitHub Repository](https://github.com/aquasecurity/trivy-vscode-extension) - Source code and issues
