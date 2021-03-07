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
			for (let key of tree.policies.keys()) {
				let policy = tree.policies.get(key);
				if (!policy) continue;
				console.log(key);
				console.log(policy.claimsTransformations);
				console.log("===");
			}
		}
	}
}