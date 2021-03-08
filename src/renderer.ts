import * as fs from 'fs';
import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { PolicyMap, Policy } from './policy-map';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { UserJourney } from './policy-nodes';


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

function addPsuedoCode(policy: Policy) {
	if (!policy.userJourneys) {
		return;
	}

	for (let journey of policy.userJourneys) {
		if (!journey.orchestrationSteps) {
			continue;
		}
		for (let step of journey.orchestrationSteps) {
			let code = "if ";
			if (!step.preconditions) {
				continue;
			}
			for (let i = 0; i < step.preconditions.length; i++) {
				let precondition = step.preconditions[i];
				if (i !== 0) {
					code += "&emsp;";
				}

				if (precondition.executeActionsIf !== "true") {
					code += "not ";
				}

				if (precondition.type === "ClaimsExist") {
					code += precondition.values[0] + " exists";
				} else {
					code += precondition.values[0] + " ==" + precondition.values[1];
				}
				if (step.preconditions.length === 1) {
					code += " then skip step";
				} else if ((i + 1) === step.preconditions.length) {
					code += "\nthen skip step";
				} else {
					code += " and\n";
				}
			}
			(step as any)["pseudoCode"] = code;
		}
	}
}

function addDataHelpers(policy: any) {
	policy["safeId"] = idPrettify(policy.policyId);
	addPsuedoCode(policy);
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