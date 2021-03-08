import * as fs from 'fs';
import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { PolicyMap, Policy } from './policy-map';
import * as handlebars from 'handlebars';
import * as path from 'path';


type PathResolver = (file: string) => string;

function indexer(this: any, index: string): any {
	try {
		if (index in this) {
			return this[index];
		}
	} catch {
		throw new Error(`Object does not contain index: ${index}`);
	}
}

function idEscape(this: any, item: string): any {
	try {
		item = item.replace(/B2C_1A_/g, "");
		item = item.replace(/\{.*?\}/g, "");
		item = item.replace(/\s/g, "");
		return item;
	} catch {
		throw new Error("Unable to escape the given string");
	}
}

function idPrettify(this: any, item: string): any {
	try {
		item = item.replace(/B2C_1A_/g, "");
		item = item.replace(/\{.*?\}/g, "");
		return item;
	} catch {
		throw new Error(`Unable to escape the given string: ${item}`);
	}
}

function mapGet(this: any, map: Map<string, any>, key: string) {
	try {
		if (map.has(key)) {
			return map.get(key);
		} else {
			throw new Error(`'${key}' does not exist in map`);
		}
	} catch {
		throw new Error(`Invalid map object for key: ${key}`);
	}
}

function addDataHelpers(policy: any) {
	policy["safeId"] = idPrettify(policy.policyId);
}

function mapIterKeys(this: any, map: Map<string, any>) {
	return map.keys();
}

export class Renderer {
	config: Configuration;
	policies: Map<string, Policy>;
	pathResolver: PathResolver;
	outPath: string;
	templateContext: any;

	constructor(config: Configuration, pathResolver: PathResolver) {
		this.config = config;
		this.pathResolver = pathResolver;
		this.outPath = path.join(vscode.workspace.rootPath as string, config.out);
		this.templateContext = {};
		this.policies = new Map();
	}

	withPolicies(policies: Map<string, Policy>): Renderer {
		this.policies = policies;
		return this;
	}

	private getBlob(templatePath: string): string {
		return fs.readFileSync(this.pathResolver(templatePath), "utf8");
	}

	save() {
		if (!fs.existsSync(this.outPath)) {
			fs.mkdirSync(this.outPath);
		} else if (fs.statSync(this.outPath).isFile()) {
			vscode.window.showErrorMessage("Documentation folder could not be created because a file by the same name exists at that location");
			return;
		}

		let policiesArr = [];
		for (let id of this.policies.keys()) {
			let policy = this.policies.get(id);
			addDataHelpers(policy);
			policiesArr.push(policy);
			
		}

		handlebars.registerHelper("indexer", indexer);
		handlebars.registerHelper("idEscape", idEscape);
		handlebars.registerHelper("mapGet", mapGet);
		handlebars.registerHelper("idPrettify", idPrettify);

		let template = handlebars.compile(this.getBlob("main.html"))({
			"policies": policiesArr
		}, {
			allowProtoMethodsByDefault: true,
			allowProtoPropertiesByDefault: true
		});
		let styles = this.getBlob("styles.css");

		fs.writeFileSync(path.join(this.outPath, "index.html"), template);
		fs.writeFileSync(path.join(this.outPath, "styles.css"), styles);
	}
}