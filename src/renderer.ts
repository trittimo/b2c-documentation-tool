import * as fs from 'fs';
import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { PolicyMap, Policy } from './policy-map';
import * as path from 'path';


let templater = require('es6-template-strings');

type PathResolver = (file: string) => string;

export class Renderer {
	config: Configuration;
	policies: Map<string, Policy> | undefined;
	pathResolver: PathResolver;
	outPath: string;

	constructor(config: Configuration, pathResolver: PathResolver) {
		this.config = config;
		this.pathResolver = pathResolver;
		this.outPath = path.join(vscode.workspace.rootPath as string, config.out);
	}

	withPolicies(policies: Map<string, Policy>): Renderer {
		this.policies = policies;
		return this;
	}

	save() {
		if (!fs.existsSync(this.outPath)) {
			fs.mkdirSync(this.outPath);
		} else if (fs.statSync(this.outPath).isFile()) {
			vscode.window.showErrorMessage("Documentation folder could not be created because a file by the same name exists at that location");
			return;
		}

		let mainTemplatePath = this.pathResolver("main.html");
		let mainTemplate = fs.readFileSync(mainTemplatePath, "utf8");

		let stylesPath = this.pathResolver("styles.css");
		let styles = fs.readFileSync(stylesPath, "utf8");

		fs.writeFileSync(path.join(this.outPath, "index.html"), mainTemplate);
		fs.writeFileSync(path.join(this.outPath, "styles.css"), styles);
	}
}