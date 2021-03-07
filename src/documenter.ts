import * as vscode from 'vscode';
import { Configuration } from './configuration';

import * as util from './util';
import { PolicyTree } from './policy-tree';

export class Documenter {
	config: Configuration;

	constructor(config: Configuration) {
		this.config = config;
	}

	run() {
		if (vscode.workspace.rootPath) {
			let files = util.walk(vscode.workspace.rootPath, this.config.include, this.config.exclude);
			let tree = PolicyTree.fromFiles(files);
			let extensions = tree.policies.get("B2C_1A_TrustFrameworkExtensions{Settings:ENV_TAG}");
			if (extensions) {
				console.log(extensions.claims);
			} else {
				console.log(`Could not load extensions`);
			}
		}
	}
}