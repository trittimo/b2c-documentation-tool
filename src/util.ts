/* eslint-disable @typescript-eslint/naming-convention */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class NodeType {
	static ELEMENT_NODE = 1;
	static ATTRIBUTE_NODE = 2;
	static TEXT_NODE = 3;
	static CDATA_SECTION_NODE = 4;
	static ENTITY_REFERENCE_NODE = 5;
	static ENTITY_NODE = 6;
	static PROCESSING_INSTRUCTION_NODE = 7;
	static COMMENT_NODE = 8;
	static DOCUMENT_NODE = 9;
	static DOCUMENT_TYPE_NODE = 10;
	static DOCUMENT_FRAGMENT_NODE = 11;
	static NOTATION_NODE = 12;
}

export function walk(dir: string, include: Array<string>, exclude: Array<string>): Array<string> {
	function populateQueue(queue: Array<string>, d: string): Array<string> {
		try {
			let files = fs.readdirSync(d);
			for (let i = 0; i < files.length; i++) {
				if (files[i]) {
					queue.push(files[i], d);
				}
			}
		} catch (e) {
			vscode.window.showErrorMessage(e.message);
		}
		return queue;
	}
	let results: Array<string> = [];
	let queue: Array<string> = populateQueue([], dir);
	
	while (queue.length > 0) {
		let file = path.resolve(queue.pop() as string, queue.pop() as string);
		let stop = false;
		for (let i = 0; i < exclude.length; i++) {
			if (file.match(exclude[i])) {
				stop = true;
				break;
			}
		}
		if (stop) {
			continue;
		}

		let stat = fs.statSync(file);
		if (stat && stat.isDirectory()) {
			populateQueue(queue, file);
		} else {
			for (let i = 0; i < include.length; i++) {
				if (file.match(include[i])) {
					results.push(file);
					break;
				}
			}
		}
	}
	return results;
}