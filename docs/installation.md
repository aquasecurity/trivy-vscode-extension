# Installation

The Aqua Trivy VS Code Extension can be installed directly from the VS Code Marketplace or through the command line.

## Prerequisites

Before installing the extension, ensure you have:

- **VS Code**: Version 1.56.0 or higher
- **Operating System**: Windows, macOS, or Linux

## Install from VS Code Marketplace

### Method 1: Through VS Code

1. Open VS Code
2. Click on the Extensions icon in the Activity Bar
3. Search for "Aqua Trivy"
4. Click **Install** on the extension by AquaSecurityOfficial

### Method 2: Through VS Code Quick Open

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P` to open Quick Open
3. Type `ext install AquaSecurityOfficial.trivy-vulnerability-scanner`
4. Press Enter to install

## Install from Command Line

You can also install the extension using the VS Code command line:

```bash
code --install-extension AquaSecurityOfficial.trivy-vulnerability-scanner
```

## Trivy Binary Installation

The extension requires the Trivy binary to function. When you first activate the extension:

### Automatic Installation (Recommended)

1. If Trivy is not found on your system PATH, you'll see an installation prompt
2. Click **Install** to automatically download and install Trivy
3. The extension will install Trivy to its own directory and manage it automatically
4. This version will be removed when you uninstall the extension

![Installation Prompt](../.github/images/install.png)

### Manual Installation

If you prefer to install Trivy manually:

#### macOS (using Homebrew)

```bash
brew install trivy
```

#### Linux

```bash
# Download and install the latest release
sudo apt-get update
sudo apt-get install wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy
```

#### Windows

```powershell
# Using Chocolatey
choco install trivy
```

#### Custom Location

If you install Trivy to a custom location:

1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "trivy binary path"
3. Set the **Binary Path** to the full path of your Trivy executable

## Verification

After installation:

1. Open a project in VS Code
2. Look for the Trivy icon in the Activity Bar
3. The extension should be ready to scan your project

## Next Steps

- [Quick Start Guide](./quick-start.md) - Get started with your first scan
- [Configuration](./settings.md) - Customize the extension to your needs
- [Running Scans](./scanning.md) - Learn how to scan your projects
