// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Documenter } from './documenter';
import { Configuration } from './configuration';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('b2c-documentation-tool.run', () => {
		let config = new Configuration();
		config.tryLoad(`${vscode.workspace.rootPath}/documenter.json`);
		let documenter = new Documenter(config, context);
		documenter.run();
		vscode.window.showInformationMessage("Finished generating documentation");
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}