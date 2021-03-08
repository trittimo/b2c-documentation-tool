import * as vscode from 'vscode';
import { Configuration } from './configuration';
import * as path from 'path';

import * as util from './util';
import { PolicyMap } from './policy-map';
import { Renderer } from './renderer';

export class Documenter {
	config: Configuration;
	context: vscode.ExtensionContext;

	constructor(config: Configuration, context: vscode.ExtensionContext) {
		this.config = config;
		this.context = context;
	}

	run() {
		if (vscode.workspace.rootPath) {
			try {
				let files = util.walk(vscode.workspace.rootPath, this.config.include, this.config.exclude);
				let policies = PolicyMap.fromFiles(files);
				let pathResolver = (file: string) => vscode.Uri.file(this.context.asAbsolutePath(path.join("src/blob", file))).fsPath;
				let renderer = new Renderer(this.config, pathResolver);
				renderer.withPolicies(policies).save();
			} catch (e) {
				vscode.window.showErrorMessage(e.message);
			}
		}
	}
}