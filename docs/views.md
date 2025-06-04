# Understanding Views

Learn about the different views and panels provided by the Aqua Trivy VS Code Extension and how they work together to help you manage security findings.

## Overview of Views

The Trivy extension provides several integrated views that work together:

1. **Findings Explorer** - Main security findings organized by file or type
2. **Assurance Explorer** - Aqua Platform policy results (for Aqua customers)
3. **Help View** - Detailed information about selected findings
4. **Problems Panel** - Integration with VS Code's built-in diagnostics
5. **CodeLens** - Inline vulnerability indicators

## Findings Explorer

The primary view for reviewing security findings in your projects.

### Access

- Click the Trivy icon in the Activity Bar
- The Findings Explorer is the top panel labeled "Trivy Issues"

### View Modes

#### By File Organization (Default)

```
📁 Workspace
  📄 package.json (3 issues)
    🔴 lodash@4.17.19 (Critical)
    🟠 express@4.17.1 (High)
    🟡 cors@2.8.5 (Medium)
  📄 Dockerfile (2 issues)
    🟠 Missing USER instruction (High)
    🟡 COPY with wildcard (Medium)
  📄 src/config.js (1 issue)
    🔴 Exposed API key (Critical)
```

#### By Type and Severity

```
🛡️ Vulnerabilities
  🔴 Critical (2)
    📄 package.json: lodash vulnerability
    📄 src/config.js: exposed credential
  🟠 High (2)
    📄 package.json: express vulnerability
    📄 Dockerfile: missing USER instruction

🔧 Misconfigurations
  🟠 High (1)
    📄 Dockerfile: missing USER instruction
  🟡 Medium (1)
    📄 Dockerfile: COPY with wildcard

🔑 Sensitive Data
  🔴 Critical (1)
    📄 src/config.js: API key exposure
```

### Toggle View Mode

- Right-click in the explorer
- Select "Order results by type and severity" to toggle between modes

### Interaction

#### Expanding Items

- Click the arrow (▶️) to expand file or severity groups
- Double-click to expand and focus on an item

#### Navigating to Issues

- Click any finding to open the file at the specific line
- Issues show line numbers when available: `[line 15-20]`

#### Severity Indicators

- 🔴 **Critical**: Immediate attention required
- 🟠 **High**: Important security issues
- 🟡 **Medium**: Moderate security concerns
- 🔵 **Low**: Minor issues
- ⚪ **Unknown**: Unclassified issues

## Assurance Explorer

Shows Aqua Platform policy results for customers using Aqua's security platform.

### Access

- Available below the Findings Explorer when Aqua Platform is configured
- Labeled "Trivy Assurance"

### Structure

```
📋 Security Policy
  🛡️ CIS Kubernetes Benchmark
    ⚙️ Control 1.1.1
      📄 deployment.yaml
        ❌ Failed check: Container security context
  🔒 NIST Framework
    ⚙️ Control AC-3
      📄 rbac.yaml
        ❌ Failed check: Excessive permissions
```

### Policy Organization

- **Policies**: Top-level security frameworks (CIS, NIST, etc.)
- **Controls**: Specific security controls within policies
- **Results**: Individual files that failed controls
- **Checks**: Specific violations found

## Help View

Provides detailed information about selected findings and recommendations.

### Access

- Located below the explorers when a finding is selected
- Automatically updates when you click different findings

### Content Types

#### Vulnerability Details

- **CVE Information**: CVE ID, description, severity
- **Package Details**: Name, installed version, fixed version
- **CVSS Scores**: Base score and vector when available
- **References**: Links to vulnerability databases and advisories

#### Misconfiguration Details

- **Rule Information**: Rule ID, description, severity
- **Impact**: What security risk this creates
- **Remediation**: How to fix the misconfiguration
- **Best Practices**: Additional security recommendations

#### Secret Exposure Details

- **Detection Rule**: What type of secret was detected
- **Location**: Exact location in file
- **Risk Level**: Potential impact of exposure
- **Remediation**: Steps to secure the exposed secret

### Interactive Elements

- **Links**: Click to open external references
- **Copy Actions**: Copy CVE IDs or other identifiers
- **Navigation**: Links to related documentation

## Problems Panel

Integrates Trivy findings with VS Code's built-in Problems panel.

### Access

- `View > Problems` or `Ctrl+Shift+M` / `Cmd+Shift+M`
- Shows Trivy findings alongside other VS Code diagnostics

### Features

- **Source Filtering**: Filter by "trivy" source
- **Severity Icons**: Standard VS Code error/warning/info icons
- **Quick Navigation**: Click to jump to issue location
- **File Grouping**: Issues grouped by file
- **Search**: Use VS Code's built-in problem search

### Benefits

- Familiar VS Code interface
- Integration with other tools and extensions
- Keyboard navigation support
- Export capabilities

## CodeLens Integration

Shows inline vulnerability information directly in your code.

### Features

- **Transitive Dependencies**: Shows vulnerabilities in indirect dependencies

## Multi-Workspace Support

When working with multiple workspace folders:

### Workspace Organization

```
📁 Frontend Workspace (5 issues)
  📄 package.json
  📄 src/components/...

📁 Backend Workspace (3 issues)
  📄 go.mod
  📄 Dockerfile

📁 Infrastructure Workspace (7 issues)
  📄 terraform/
  📄 k8s/
```

### Workspace-Specific Features

- Each workspace scanned independently
- Separate result counts and organization
- Individual refresh controls
- Workspace-specific settings support

## View Customization

### Result Filtering

#### By Severity

- Configure minimum severity in settings
- Focus on actionable high-priority issues
- Reduce noise from low-priority findings

#### By Type

- Enable/disable specific scanners
- Customize which file types to scan
- Use ignore files for known exceptions

### Display Options

#### Collapse/Expand Behavior

- **Auto-expand**: Critical and High severity items
- **Manual control**: Click arrows to expand/collapse
- **Remember state**: Expansion state persists between scans

#### Sorting and Ordering

- **By severity**: Most critical issues first
- **By file**: Organized by source file
- **By type**: Grouped by vulnerability/misconfiguration/secret

## View Synchronization

All views work together and stay synchronized:

### Selection Sync

- Select in Findings Explorer → Help View updates
- Select in Problems Panel → Corresponding item highlights
- Navigate via CodeLens → Views update accordingly

### State Management

- Expansion states preserved during refresh
- Selected items remain selected after rescans
- View modes persist across VS Code sessions

## Performance Considerations

### Large Projects

- Views load incrementally for better performance
- Expansion states help manage large result sets
- Filtering reduces display overhead

### Memory Usage

- Views only load visible items
- Background caching improves responsiveness
- Refresh clears old data to prevent memory leaks

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between views
- **Arrow keys**: Navigate within trees
- **Enter**: Activate selected items
- **Space**: Toggle expansion

## Best Practices

### Effective View Usage

1. **Start with Overview**: Use type/severity view for big picture
2. **Drill Down**: Switch to file view for specific remediation
3. **Use Help View**: Read details before making changes
4. **Monitor Problems**: Keep Problems panel open during development
5. **Leverage CodeLens**: Quick checks during code review

### Workflow Integration

1. **Regular Scanning**: Keep views updated with fresh scans
2. **Prioritize Critical**: Focus on red (critical) items first
3. **Batch Similar**: Group similar fixes together
4. **Document Decisions**: Use ignore files for accepted risks
5. **Track Progress**: Monitor issue counts over time

## Next Steps

- [Tree View Details](./tree-view.md) - Deep dive into tree navigation
- [Problems Integration](./problems-view.md) - VS Code Problems panel features
- [CodeLens Features](./codelens.md) - Inline vulnerability indicators
