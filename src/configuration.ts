import * as fs from 'fs';
import * as vscode from 'vscode';

export class Configuration {
	exclude: Array<string>;
	include: Array<string>;

	constructor() {
		this.exclude = [];
		this.include = [];
	}

	tryLoad(path: string) {
		if (fs.existsSync(path)) {
			let settings = fs.readFileSync(path, "utf8");
			try {
				let config = JSON.parse(settings);
				if ("exclude" in config && typeof(config["exclude"]) === "object") {
					config["exclude"].forEach((e: string) => {
						this.exclude.push(e);
					});
				}
				if ("include" in config && typeof(config["include"]) === "object") {
					config["include"].forEach((i: string) => {
						this.include.push(i);
					});
				}
			} catch {
				vscode.window.showErrorMessage(`${path} is not a valid JSON file or it has invalid properties for configuration`);
			}
		} else {
			vscode.window.showErrorMessage(`Missing ${path} in root directory`);
		}
	}
}