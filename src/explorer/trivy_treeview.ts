import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Misconfiguration, processResult, Secret, TrivyResult, Vulnerability } from './trivy_result';
import { TrivyTreeItem, TrivyTreeItemType } from './trivy_treeitem';
import { sortBySeverity } from './utils';

export class TrivyTreeViewProvider implements vscode.TreeDataProvider<TrivyTreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<TrivyTreeItem | undefined | void> = new vscode.EventEmitter<TrivyTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TrivyTreeItem | undefined | void> = this._onDidChangeTreeData.event;
	public resultData: TrivyResult[] = [];
	private taintResults: boolean = true;
	private storagePath: string = "";
	public readonly resultsStoragePath: string = "";

	constructor(context: vscode.ExtensionContext) {
		if (context.storageUri) {
			this.storagePath = context.storageUri.fsPath;
			console.log(`storage path is ${this.storagePath}`);
			if (!fs.existsSync(this.storagePath)) {
				fs.mkdirSync(this.storagePath);
			}
			this.resultsStoragePath = path.join(this.storagePath, '/.trivy/');
			if (!fs.existsSync(this.resultsStoragePath)) {
				fs.mkdirSync(this.resultsStoragePath);
			}
		}
	}

	refresh(): void {
		this.taintResults = true;
		this.loadResultData();
	}

	// when there is trivy output file, load the results
	async loadResultData() {
		var _self = this;
		_self.resultData = [];
		if (this.resultsStoragePath !== "" && vscode.workspace && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
			var files = fs.readdirSync(this.resultsStoragePath).filter(fn => fn.endsWith('_results.json') || fn.endsWith('_results.json.json'));
			Promise.resolve(files.forEach(file => {
				const resultFile = path.join(this.resultsStoragePath, file);
				if (fs.existsSync(resultFile)) {
					let content = fs.readFileSync(resultFile, 'utf8');
					try {
						const data = JSON.parse(content);
						if (data === null || data.results === null) {
							return;
						}
						let results = data.Results;
						for (let i = 0; i < results.length; i++) {
							const element = results[i];
							const trivyResults = processResult(element);
							_self.resultData.push(...trivyResults);
						}
					}
					catch (error) {
						console.debug(`Error loading results file ${file}: ${error}`);
					}
				}
			})).then(() => {
				_self.taintResults = !_self.taintResults;
				_self._onDidChangeTreeData.fire();
			});
		} else {
			vscode.window.showInformationMessage("No workspace detected to load Trivy results from");
		}
		this.taintResults = false;
	}

	getTreeItem(element: TrivyTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TrivyTreeItem): Thenable<TrivyTreeItem[]> {
		// if this is refresh then get the top level codes
		let items: TrivyTreeItem[] = [];
		if (!element) {
			items = this.getTopLevelNodes();
		} else {
			items = this.getChildNodes(element);
		}
		return Promise.resolve(items);
	}


	private getVulnerabilityChildren(element: TrivyTreeItem): TrivyTreeItem[] {

		let results: TrivyTreeItem[] = [];
		const filtered = this.resultData.filter(c => c.extraData instanceof Vulnerability
			&& c.extraData.pkgName === element.title);

		for (let index = 0; index < filtered.length; index++) {
			const result = filtered[index];

			if (result === undefined) {
				continue;
			}

			const title = `${result.id}`;
			const collapsedState = vscode.TreeItemCollapsibleState.None;

			var item = new TrivyTreeItem(title, result, collapsedState, TrivyTreeItemType.vulnerabilityCode, this.createFileOpenCommand(result));
			results.push(item);
		}

		return results;
	}

	getSecretInstances(element: TrivyTreeItem): TrivyTreeItem[] {
		let results: TrivyTreeItem[] = [];
		const filtered = this.resultData.filter(c => c.filename === element.filename);

		for (let index = 0; index < filtered.length; index++) {
			const result = filtered[index];

			if (result === undefined) {
				continue;
			}

			const title = result.id;
			const collapsedState = vscode.TreeItemCollapsibleState.None;

			var item = new TrivyTreeItem(title, result, collapsedState, TrivyTreeItemType.secretInstance, this.createFileOpenCommand(result));
			results.push(item);
		}

		return results;
	}

	getMisconfigurationInstances(element: TrivyTreeItem): TrivyTreeItem[] {
		let results: TrivyTreeItem[] = [];
		const filtered = this.resultData.filter(c => c.id === element.code && c.filename === element.filename);

		for (let index = 0; index < filtered.length; index++) {
			const result = filtered[index];

			if (result === undefined) {
				continue;
			}

			const title = `${result.filename}:[${result.startLine}-${result.endLine}]`;
			const collapsedState = vscode.TreeItemCollapsibleState.None;

			var item = new TrivyTreeItem(title, result, collapsedState, TrivyTreeItemType.misconfigInstance, this.createFileOpenCommand(result));
			results.push(item);
		}

		return results;
	}

	private getChildNodes(element: TrivyTreeItem): TrivyTreeItem[] {
		let trivyResults: TrivyTreeItem[] = [];
		var filtered: TrivyResult[];
		switch (element.itemType) {
			case TrivyTreeItemType.vulnerablePackage:
				return this.getVulnerabilityChildren(element);
			case TrivyTreeItemType.misconfigCode:
				return this.getMisconfigurationInstances(element);
			case TrivyTreeItemType.secretFile:
				return this.getSecretInstances(element);
		}


		switch (element.itemType) {
			case TrivyTreeItemType.misconfigFile:
				filtered = this.resultData.filter(c => c.filename === element.filename);
				filtered.sort(sortBySeverity);
				break;
			default:
				filtered = this.resultData.filter(c => c.filename === element.filename);
		}




		var resolvedNodes: string[] = [];
		for (let index = 0; index < filtered.length; index++) {
			const result = filtered[index];

			if (result === undefined) {
				continue;
			}

			switch (element.itemType) {
				case TrivyTreeItemType.misconfigFile:
					if (resolvedNodes.includes(result.id)) {
						continue;
					}

					resolvedNodes.push(result.id);
					if (result.extraData instanceof Secret) {
						trivyResults.push(new TrivyTreeItem(result.id, result, vscode.TreeItemCollapsibleState.None, TrivyTreeItemType.secretInstance,  this.createFileOpenCommand(result)));
					} else {
						trivyResults.push(new TrivyTreeItem(result.id, result, vscode.TreeItemCollapsibleState.Collapsed, TrivyTreeItemType.misconfigCode));
					}
					
					break;
				case TrivyTreeItemType.vulnerabilityFile:
					const extraData = result.extraData;

					if (extraData instanceof Vulnerability) {
						if (resolvedNodes.includes(extraData.pkgName)) {
							continue;
						}
						resolvedNodes.push(extraData.pkgName);
						trivyResults.push(new TrivyTreeItem(extraData.pkgName, result, vscode.TreeItemCollapsibleState.Collapsed, TrivyTreeItemType.vulnerablePackage));
					}
					break;
			}
		
		}
		return trivyResults;
	}

	private getTopLevelNodes(): TrivyTreeItem[] {
		var results: TrivyTreeItem[] = [];
		var resolvedNodes: string[] = [];
		for (let index = 0; index < this.resultData.length; index++) {
			const result = this.resultData[index];
			if (result === undefined) {
				continue;
			}

			if (resolvedNodes.includes(result.filename)) {
				continue;
			}

			resolvedNodes.push(result.filename);

			const itemType = result.extraData instanceof Vulnerability ? TrivyTreeItemType.vulnerabilityFile :
				result.extraData instanceof Misconfiguration ? TrivyTreeItemType.misconfigFile : TrivyTreeItemType.secretFile;
			results.push(new TrivyTreeItem(result.filename, result, vscode.TreeItemCollapsibleState.Collapsed, itemType));
		}
		return results;
	}


	private createFileOpenCommand(result: TrivyResult): vscode.Command | undefined {
		const issueRange = new vscode.Range(new vscode.Position(result.startLine - 1, 0), new vscode.Position(result.endLine, 0));
		if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length < 1) {
			return;
		}
		const wsFolder = vscode.workspace.workspaceFolders[0];
		if (!wsFolder) {
			return;
		}

		let fileUri = path.join(wsFolder.uri.fsPath, result.filename);

		if (!fs.existsSync(fileUri)) {
			return;
		}


		return {
			command: "vscode.open",
			title: "",
			arguments: [
				vscode.Uri.file(fileUri),
				{
					selection: (result.startLine === result.endLine && result.startLine === 0) ? null : issueRange,
				}
			]
		};
	}
}
