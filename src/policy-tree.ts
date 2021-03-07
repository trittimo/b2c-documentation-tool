import * as fs from 'fs';
import * as vscode from 'vscode';
import * as xmldom from 'xmldom';
import * as xpath from 'xpath';
import { Claim, UserJourney, populateChildNodes } from './policy-nodes';

export class Policy {
	private _node: Document;
	private _selector: xpath.XPathSelect;
	private _policyId: string | undefined | null;
	private _basePolicy: Policy | undefined;
	private _claims: Array<Claim>;
	private _userJourneys: Array<UserJourney>;
	fileName: string;
	policies: Map<string, Policy>;

	constructor(node: Document, fileName: string, policies: Map<string, Policy>) {
		this._node = node;
		this._selector = xpath.useNamespaces({"n": "http://schemas.microsoft.com/online/cpim/schemas/2013/06"});
		this.fileName = fileName;
		this.policies = policies;
		this._claims = [];
		this._userJourneys = [];
	}

	get policyId(): string | undefined | null {
		if (!this._policyId) {
			let id = this._selector("//n:TrustFrameworkPolicy/@PolicyId", this._node, true);
			this._policyId = (id as Attr).nodeValue;
		}
		return this._policyId;
	}

	get basePolicy(): Policy | undefined {
		if (!this._basePolicy) {
			let baseId = this._selector("//n:TrustFrameworkPolicy/n:BasePolicy/n:PolicyId/text()", this._node, true);
			if (!baseId) {
				return this._basePolicy;
			}
			let data = (baseId as Text).data;
			this._basePolicy = this.policies.get(data);
		}
		return this._basePolicy;
	}

	get userJourneys(): Array<UserJourney> {
		if (this._userJourneys.length === 0) {
			let userJourneys = this._selector("//n:TrustFrameworkPolicy/n:UserJourneys", this._node, true) as Element;

			this._userJourneys = populateChildNodes(userJourneys, this._selector, UserJourney);
		}
		return this._userJourneys;
	}

	get claims(): Array<Claim> {
		if (this._claims.length === 0) {
			let claimsSchema = this._selector("//n:TrustFrameworkPolicy/n:BuildingBlocks/n:ClaimsSchema", this._node, true) as Element;

			this._claims = populateChildNodes(claimsSchema, this._selector, Claim);
		}
		return this._claims;
	}
}

export class PolicyTree {
	policies: Map<string, Policy>;
	constructor(policies: Map<string, Policy>) {
		this.policies = policies;
	}

	static fromFiles(files: Array<string>): PolicyTree {
		let parser = new xmldom.DOMParser();
		let policies: Map<string, Policy> = new Map();
		for (let i = 0; i < files.length; i++) {
			try {
				let node = parser.parseFromString(fs.readFileSync(files[i], "utf8"));
				let policy = new Policy(node, files[i], policies);
				if (!policy.policyId) {
					vscode.window.showErrorMessage(`Policy is not valid: ${files[i]}`);
				} else {
					policies.set(policy.policyId, policy);
				}
			} catch (e) {
				vscode.window.showErrorMessage(e.message);
			}
		}
		return new PolicyTree(policies);
	}
}