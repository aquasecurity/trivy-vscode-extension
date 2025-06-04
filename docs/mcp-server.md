# Model Context Protocol (MCP) Server

The Trivy VS Code Extension includes an integrated Model Context Protocol (MCP) server that enables AI assistants to access Trivy security data and provide intelligent security recommendations.

## MCP Overview

### What is Model Context Protocol?

MCP is a standard for connecting AI assistants with external data sources and tools:

- **Standardized interface**: Common protocol for AI integration
- **Real-time data**: Access to live security scan results
- **Contextual assistance**: AI recommendations based on current findings
- **Tool integration**: Execute Trivy commands through AI

### Trivy MCP Capabilities

- **Security data access**: Query vulnerability and misconfiguration data
- **Intelligent recommendations**: AI-powered security advice
- **Automated scanning**: Trigger scans through AI commands
- **Report generation**: Create security reports via AI

## Requirements

### VS Code Version

MCP server requires VS Code 1.99 or later:

- Check version: Help → About
- Update if needed: VS Code will prompt for updates
- Extension compatibility: Automatic detection

### AI Assistant Integration

Compatible AI assistants that support MCP:

- **GitHub Copilot**: With MCP extension
- **Claude**: Via official MCP integration
- **Custom assistants**: Using MCP client libraries

## Installation

## Installing the Trivy MCP Server

Trivy has an MCP Server that is compatible with VS Code. The MCP Server can be configured from this extension by pressing `F1` then searching for `Install Trivy MCP Server`

The version of VS Code must be at least v1.99.0 - this was when MCP Server support was added.

The installation process will:

- install the `mcp` plugin for Trivy using `trivy plugin install mcp`
- ensure that `chat.agent.enabled` and `chat.mcp.discovery.enabled` are both `true` in the settings
- add a `trivy` mcp server if it isn't already present in the settings
- open the `settings.json` to show the changes that have been made

For more details about the Trivy MCP Server, check the MCP repo [README.md](https://github.com/aquasecurity/trivy-mcp/blob/main/README.md)

## Available MCP Tools

### Security Data Access

#### Get Vulnerabilities

Query vulnerability data:

```
AI: "What vulnerabilities were found in package.json?"
MCP Response: [Vulnerability list with details]
```

#### Get Misconfigurations

Access configuration issues:

```
AI: "Show me Dockerfile security misconfigurations"
MCP Response: [Misconfiguration findings]
```

#### Get Secrets

Query secret detection results:

```
AI: "Are there any exposed secrets in the codebase?"
MCP Response: [Secret detection results]
```

### Scan Operations

#### Trigger Scans

Execute Trivy scans via AI:

```
AI: "Run a vulnerability scan on the current workspace"
MCP Action: Executes trivy scan command
```

#### Scan Specific Files

Target specific files or directories:

```
AI: "Scan the Dockerfile for security issues"
MCP Action: Runs targeted Trivy scan
```

### Analysis Tools

#### Security Summary

Generate security overviews:

```
AI: "Give me a security summary of this project"
MCP Response: [Aggregated security metrics]
```

#### Risk Assessment

Evaluate security posture:

```
AI: "What are the highest risk issues in this codebase?"
MCP Response: [Prioritized risk analysis]
```

#### Remediation Advice

Get fix recommendations:

```
AI: "How can I fix the critical vulnerabilities?"
MCP Response: [Specific remediation steps]
```

## AI Assistant Integration Examples

### GitHub Copilot Integration

#### Security-Aware Code Suggestions

Copilot uses Trivy data for:

- **Vulnerability-aware suggestions**: Avoid vulnerable patterns
- **Secure alternatives**: Suggest safer code patterns
- **Configuration recommendations**: Improve security configs
- **Dependency suggestions**: Recommend secure packages

#### Interactive Security Chat

```
User: @trivy What security issues are in my Dockerfile?
Copilot: Based on Trivy scan results, I found 3 issues:
1. Running as root user (HIGH severity)
2. Using outdated base image (MEDIUM severity)
3. Exposed sensitive port (LOW severity)

Would you like me to suggest fixes?
```

### Claude Integration

#### Security Code Review

```
User: Review this code for security issues
Claude: [Analyzes code using Trivy MCP data]
- Found 2 vulnerabilities in dependencies
- Detected potential SQL injection in line 45
- Recommends input validation improvements
```

#### Infrastructure Security Analysis

````
User: Analyze my Kubernetes manifests for security
Claude: [Uses Trivy MCP for comprehensive analysis]
- Pod security context missing
- Excessive permissions in RBAC
- Suggests security policy improvements


Check Output panel > "Trivy MCP Server" for detailed logs.

## Advanced Configuration

### Custom Tool Development
Extend MCP server with custom tools:

```typescript
// Custom tool registration
interface CustomTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (input: any) => Promise<any>;
}
````

## Best Practices

### AI Assistant Usage

- **Context awareness**: Provide relevant context to AI
- **Iterative improvement**: Refine queries based on results
- **Verification**: Always verify AI recommendations
- **Learning**: Use AI insights to improve security knowledge

### Security Hygiene

- **Regular updates**: Keep MCP server and AI assistants updated
- **Access review**: Periodically review MCP access permissions
- **Data handling**: Understand how AI assistants handle security data
- **Compliance**: Ensure MCP usage meets organizational policies

## Next Steps

- [Commands Reference](./commands.md) - All available commands
- [Troubleshooting](./troubleshooting.md) - Detailed problem solving
- [Contributing](./contributing.md) - Contribute to the extension
- [Trivy Documentation](https://aquasecurity.github.io/trivy/) - Official Trivy docs
