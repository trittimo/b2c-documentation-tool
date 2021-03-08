import * as fs from 'fs';
import * as vscode from 'vscode';
import * as xmldom from 'xmldom';
import * as xpath from 'xpath';
import { Claim, UserJourney, populateChildNodes, RelyingParty, ClaimsProvider, ClaimsTransformation } from './policy-nodes';

export class Policy {
	private _node: Document;
	private _selector: xpath.XPathSelect;
	private _policyId: string | undefined | null;
	private _basePolicy: Policy | undefined;
	private _claims: Array<Claim>;
	private _userJourneys: Array<UserJourney>;
	private _relyingParty: RelyingParty | undefined;
	private _claimsProviders: Array<ClaimsProvider>;
	private _claimsTransformations: Array<ClaimsTransformation>;
	fileName: string;
	policies: Map<string, Policy>;

	constructor(node: Document, fileName: string, policies: Map<string, Policy>) {
		this._node = node;
		this._selector = xpath.useNamespaces({"n": "http://schemas.microsoft.com/online/cpim/schemas/2013/06"});
		this.fileName = fileName;
		this.policies = policies;
		this._claims = [];
		this._userJourneys = [];
		this._claimsProviders = [];
		this._claimsTransformations = [];
	}

	get claimsTransformations(): Array<ClaimsTransformation> {
		if (this._claimsTransformations.length === 0) {
			let claimsTransformationsNode = this._selector("//n:TrustFrameworkPolicy/n:BuildingBlocks/n:ClaimsTransformations", this._node, true) as Element;
			this._claimsTransformations = populateChildNodes(claimsTransformationsNode, this._selector, ClaimsTransformation);
		}
		return this._claimsTransformations;
	}

	get claimsProviders(): Array<ClaimsProvider> {
		if (this._claimsProviders.length === 0) {
			let claimsProvidersNode = this._selector("//n:TrustFrameworkPolicy/n:ClaimsProviders", this._node, true) as Element;
			this._claimsProviders = populateChildNodes(claimsProvidersNode, this._selector, ClaimsProvider);
		}
		return this._claimsProviders;
	}

	get relyingParty(): RelyingParty | undefined {
		if (!this._relyingParty) {
			let relyingPartyNode = this._selector("//n:TrustFrameworkPolicy/n:RelyingParty", this._node, true) as Element;
			if (!relyingPartyNode) {
				return this._relyingParty;
			}
			this._relyingParty = new RelyingParty();
			this._relyingParty.populate(relyingPartyNode, this._selector);
		}
		return this._relyingParty;
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

export class PolicyMap {
	static fromFiles(files: Array<string>): Map<string, Policy> {
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
		return policies;
	}
}