import * as vscode from 'vscode';
import * as child from 'child_process';
import * as semver from 'semver';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { unlinkSync, readdirSync } from 'fs';

export class TrivyWrapper {
    private workingPath: string[] = [];
    constructor(
        private outputChannel: vscode.OutputChannel,
        private readonly resultsStoragePath: string) {
        if (!vscode.workspace || !vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length <= 0) {
            return;
        }
        const folders = vscode.workspace.workspaceFolders;
        for (let i = 0; i < folders.length; i++) {
            if (folders[i]) {
                const workspaceFolder = folders[i];
                if (!workspaceFolder) {
                    continue;
                }
                this.workingPath.push(workspaceFolder.uri.fsPath);
            }
        }
    }

    run() {
        let outputChannel = this.outputChannel;
        this.outputChannel.appendLine("");
        this.outputChannel.appendLine("Running trivy to update results");

        if (!this.checkTrivyInstalled()) {
            return;
        }

        var files = readdirSync(this.resultsStoragePath).filter(fn => fn.endsWith('_results.json') || fn.endsWith('_results.json.json'));
        files.forEach(file => {
            let deletePath = path.join(this.resultsStoragePath, file);
            unlinkSync(deletePath);
        });

        const binary = this.getBinaryPath();

        this.workingPath.forEach(workingPath => {
            let command = this.buildCommand(workingPath);
            this.outputChannel.appendLine(`command: ${command}`);

            var execution = child.spawn(binary, command);

            execution.stdout.on('data', function (data) {
                outputChannel.appendLine(data.toString());
            });

            execution.stderr.on('data', function (data) {
                outputChannel.appendLine(data.toString());
            });

            execution.on('exit', function (code) {
                if (code !== 0) {
                    vscode.window.showErrorMessage("Trivy failed to run");
                    return;
                };
                vscode.window.showInformationMessage('Trivy ran successfully, updating results');
                outputChannel.appendLine('Reloading the Findings Explorer content');
                setTimeout(() => { vscode.commands.executeCommand("trivy.refresh"); }, 250);
            });
        });

    }


    updateBinary() {
        this.outputChannel.show();
        this.outputChannel.appendLine("");
        this.outputChannel.appendLine("Checking the current version");

        if (!this.checkTrivyInstalled()) {
            return;
        }

        const currentVersion = this.getInstalledTrivyVersion();
        if (currentVersion.includes("running a locally built version")) {
            this.outputChannel.appendLine("You are using a locally built version which cannot be updated");
        }

        if (semver.lt(currentVersion, "0.39.39")) {
            vscode.window.showInformationMessage(`Self updating was not introduced till v0.39.39 and you are running ${currentVersion}. Pleae update manually to at least v0.39.39`);
        }
        this.outputChannel.appendLine("Attempting to download the latest version");
        var binary = this.getBinaryPath();
        try {
            let result: Buffer = child.execSync(binary + " --update --verbose");
            this.outputChannel.appendLine(result.toLocaleString());
        } catch (err) {
            vscode.window.showErrorMessage("There was a problem with the update, check the output window");
            let errMsg = err as Error;
            this.outputChannel.appendLine(errMsg.message);
        }
    }

    showCurrentTfsecVersion() {
        const currentVersion = this.getInstalledTrivyVersion();
        if (currentVersion) {
            vscode.window.showInformationMessage(`Current tfsec version is ${currentVersion}`);
        }
    }

    private getBinaryPath() {
        const config = vscode.workspace.getConfiguration('trivy');
        var binary = config.get('binaryPath', 'trivy');
        if (binary === "") {
            binary = "trivy";
        }

        return binary;
    };

    private checkTrivyInstalled(): boolean {
        const binaryPath = this.getBinaryPath();

        var command = [];
        command.push(binaryPath);
        command.push('--help');
        try {
            child.execSync(command.join(' '));
        }
        catch (err) {
            this.outputChannel.show();
            this.outputChannel.appendLine(`trivy not found. Check the tfsec extension settings to ensure the path is correct. [${binaryPath}]`);
            return false;
        }
        return true;
    };

    private getInstalledTrivyVersion(): string {

        if (!this.checkTrivyInstalled) {
            vscode.window.showErrorMessage("tfsec could not be found, check Output window");
            return "";
        }

        let binary = this.getBinaryPath();

        var command = [];
        command.push(binary);
        command.push('--version');
        const getVersion = child.execSync(command.join(' '));
        return getVersion.toString();
    };


    private buildCommand(workingPath: string): string[] {
        const config = vscode.workspace.getConfiguration('trivy');
        var command = [];

        command.push("fs");
        command.push("--security-checks=config,vuln");

        if (config.get<boolean>('debug')) {
            command.push('--verbose');
        }

        command.push('--format=json');
        const resultsPath = path.join(this.resultsStoragePath, `${uuid()}_results.json`);
        command.push(`--output=${resultsPath}`);

        command.push(workingPath);
        return command;
    }

}


