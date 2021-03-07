import * as xmldom from 'xmldom';
import * as xpath from 'xpath';
import { NodeType } from './util';

export interface PolicyNode {
	comments: Array<string>;
	populate(node: ChildNode, selector: xpath.XPathSelect): void;
}

abstract class AbstractPolicyNode implements PolicyNode {
	comments: string[];

	constructor() {
		this.comments = [];
	}

	abstract populate(node: ChildNode, selector: xpath.XPathSelect): void;
}

export function populateChildNodes<T extends PolicyNode>(baseNode: Element, selector: xpath.XPathSelect, type: (new () => T)): Array<T> {
	if (!baseNode) {
		return [];
	}

	let items = [];
	let comments: Array<string> = [];
	for (let i = 0; i < baseNode.childNodes.length; i++) {
		let node = baseNode.childNodes[i];
		if (node.nodeType === NodeType.COMMENT_NODE) {
			comments.push((node as any).data.trim());
		} else if (node.nodeType === NodeType.ELEMENT_NODE) {
			let result = new type();
			result.comments = comments;
			result.populate(node, selector);
			items.push(result);
		}
	}
	return items;
}

export class Claim extends AbstractPolicyNode {
	id: string | undefined;
	dataType: string | undefined;
	userHelpText: string | undefined;
	userInputType: string | undefined;
	predicateValidationReference: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.id = selector("string(./@Id)", node, true) as string;
		this.dataType = selector("string(./n:DataType/text())", node, true) as string;
		this.userHelpText = selector("string(./n:UserHelpText/text())", node, true) as string;
		this.userInputType = selector("string(./n:UserInputType/text())", node, true) as string;
		this.predicateValidationReference = selector("string(./n:PredicateValidationReference/@Id)", node, true) as string;
	}
}

export class ClaimsProviderSelections extends AbstractPolicyNode {
	validationClaimsExchangeId: string | undefined;
	targetClaimsExchangeId: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		// TODO
	}
}

export class ClaimsExchange extends AbstractPolicyNode {
	id: string | undefined;
	technicalProfileReferenceId: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		// TODO
	}
}

export class Precondition extends AbstractPolicyNode {
	type: string | undefined;
	executeActionsIf: string | undefined;
	values: Array<string>;
	action: string | undefined;

	constructor() {
		super();
		this.values = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		// TODO
	}
}

export class OrchestrationStep extends AbstractPolicyNode {
	type: string | undefined;
	contentDefinitionReferenceId: string | undefined;
	claimsProviderSelections: Array<ClaimsProviderSelections>;
	claimsExchanges: Array<ClaimsExchange>;
	preconditions: Array<Precondition>;

	constructor() {
		super();
		this.claimsProviderSelections = [];
		this.claimsExchanges = [];
		this.preconditions = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		// TODO
	}
}

export class UserJourney extends AbstractPolicyNode {
	id: string | undefined;
	orchestrationSteps: Array<OrchestrationStep>;
	
	constructor() {
		super();
		this.orchestrationSteps = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		// TODO
	}
}