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
			comments = [];
		}
	}
	return items;
}

export class OutputClaim extends AbstractPolicyNode {
	claimTypeReferenceId: string | undefined;
	partnerClaimType: string | undefined;
	alwaysUseDefaultValue: string | undefined;
	defaultValue: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.claimTypeReferenceId = selector("string(./@ClaimTypeReferenceId)", node, true) as string;
		this.partnerClaimType = selector("string(./@PartnerClaimType)", node, true) as string;
		this.alwaysUseDefaultValue = selector("string(./@AlwaysUseDefaultValue)", node, true) as string;
		this.defaultValue = selector("string(./@DefaultValue)", node, true) as string;
	}
}

export class InputClaim extends OutputClaim {}
export class PersistedClaim extends OutputClaim {}

export class ClaimsTransformationOutputClaim extends AbstractPolicyNode {
	claimTypeReferenceId: string | undefined;
	transformationClaimType: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.claimTypeReferenceId = selector("string(./@ClaimTypeReferenceId)", node, true) as string;
		this.transformationClaimType = selector("string(./@TransformationClaimType)", node, true) as string;
	}	
}

export class ClaimsTransformationInputClaim extends ClaimsTransformationOutputClaim {}

export class InputParameter extends AbstractPolicyNode {
	id: string | undefined;
	dataType: string | undefined;
	value: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.id = selector("string(./@Id)", node, true) as string;
		this.dataType = selector("string(./@DataType)", node, true) as string;
		this.value = selector("string(./@Value)", node, true) as string;
	}

}


export class ClaimsTransformation extends AbstractPolicyNode {
	id: string | undefined;
	transformationMethod: string | undefined;
	inputClaims: Array<ClaimsTransformationInputClaim>;
	outputClaims: Array<ClaimsTransformationOutputClaim>;
	inputParameters: Array<InputParameter>;

	constructor() {
		super();
		this.inputClaims = [];
		this.outputClaims = [];
		this.inputParameters = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.id = selector("string(./@Id)", node, true) as string;
		this.transformationMethod = selector("string(./@TransformationMethod)", node, true) as string;
		let inputClaimsNode = selector("./n:InputClaims", node, true) as Element;
		let outputClaimsNode = selector("./n:OutputClaims", node, true) as Element;
		let inputParametersNode = selector("./n:InputParameters", node, true) as Element;

		this.inputClaims = populateChildNodes(inputClaimsNode, selector, ClaimsTransformationInputClaim);
		this.outputClaims = populateChildNodes(outputClaimsNode, selector, ClaimsTransformationOutputClaim);
		this.inputParameters = populateChildNodes(inputParametersNode, selector, InputParameter);
	}
}

export class TechnicalProfile extends AbstractPolicyNode {
	id: string | undefined;
	protocolName: string | undefined;
	protocolHandler: string | undefined;
	includeInSso: string | undefined;
	useTechnicalProfileForSessionManagementReferenceId: string | undefined;
	includeTechnicalProfileReferenceId: string | undefined;
	metadata: Map<string, string>;
	inputClaims: Array<InputClaim>;
	outputClaims: Array<OutputClaim>;
	persistedClaims: Array<PersistedClaim>;
	inputClaimsTransformationReferenceIds: Array<string>;
	outputClaimsTransformationReferenceIds: Array<string>;

	constructor() {
		super();
		this.metadata = new Map();
		this.inputClaims = [];
		this.outputClaims = [];
		this.persistedClaims = [];
		this.inputClaimsTransformationReferenceIds = [];
		this.outputClaimsTransformationReferenceIds = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.id = selector("string(./@Id)", node, true) as string;
		this.protocolName = selector("string(./n:Protocol/@Name)", node, true) as string;
		this.protocolHandler = selector("string(./n:Protocol/@Handler)", node, true) as string;
		this.includeInSso = selector("string(./n:IncludeInSso/text())", node, true) as string;
		this.useTechnicalProfileForSessionManagementReferenceId = selector("string(./n:UseTechnicalProfileForSessionManagement/@ReferenceId)", node, true) as string;
		this.includeTechnicalProfileReferenceId = selector("string(./n:IncludeTechnicalProfile/@ReferenceId)", node, true) as string;
		let metadataNodes = selector("./n:Metadata/n:Item", node) as Array<Element>;
		if (metadataNodes) {
			for (let metadataNode of metadataNodes) {
				let key = selector("string(./@Key)", metadataNode, true) as string;
				let value = selector("string(./text())", metadataNode, true) as string;
				this.metadata.set(key, value);
			}
		}
		let inputClaimsNode = selector("./n:InputClaims", node, true) as Element;
		let outputClaimsNode = selector("./n:OutputClaims", node, true) as Element;
		let persistedClaimsNode = selector("./n:PersistedClaims", node, true) as Element;

		this.inputClaims = populateChildNodes(inputClaimsNode, selector, InputClaim);
		this.outputClaims = populateChildNodes(outputClaimsNode, selector, OutputClaim);
		this.persistedClaims = populateChildNodes(persistedClaimsNode, selector, PersistedClaim);
		
		for (let referenceId of selector("./n:InputClaimsTransformations/n:InputClaimsTransformation/@ReferenceId", node) as Array<Element>) {
			if (referenceId.nodeValue) {
				this.inputClaimsTransformationReferenceIds.push(referenceId.nodeValue);
			}
		}
		for (let referenceId of selector("./n:OutputClaimsTransformations/n:OutputClaimsTransformation/@ReferenceId", node) as Array<Element>) {
			if (referenceId.nodeValue) {
				this.outputClaimsTransformationReferenceIds.push(referenceId.nodeValue);
			}
		}
	}
}

export class ClaimsProvider extends AbstractPolicyNode {
	displayName: string | undefined;
	technicalProfiles: Array<TechnicalProfile>;

	constructor() {
		super();
		this.technicalProfiles = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.displayName = selector("string(./n:DisplayName/text())", node, true) as string;
		let technicalProfilesNode = selector("./n:TechnicalProfiles", node, true) as Element;
		this.technicalProfiles = populateChildNodes(technicalProfilesNode, selector, TechnicalProfile);
	}

}

export class RelyingParty extends AbstractPolicyNode {
	defaultUserJourneyReferenceId: string | undefined;
	technicalProfileId: string | undefined;
	protocolName: string | undefined;
	subjectNamingInfoClaimType: string | undefined;
	outputClaims: Array<OutputClaim>;

	constructor() {
		super();
		this.outputClaims = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.defaultUserJourneyReferenceId = selector("string(./n:DefaultUserJourney/@ReferenceId)", node, true) as string;
		this.technicalProfileId = selector("string(./n:TechnicalProfile/@Id)", node, true) as string;
		this.protocolName = selector("string(./n:TechnicalProfile/n:Protocol/@Name)", node, true) as string;
		this.subjectNamingInfoClaimType = selector("string(./n:TechnicalProfile/n:SubjectNamingInfo/@ClaimType)", node, true) as string;
		this.outputClaims = populateChildNodes(selector("./n:TechnicalProfile/n:OutputClaims", node, true) as Element, selector, OutputClaim);
	}
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
		this.validationClaimsExchangeId = selector("string(./@ValidationClaimsExchangeId)", node, true) as string;
		this.targetClaimsExchangeId = selector("string(./@TargetClaimsExchangeId)", node, true) as string;
	}
}

export class ClaimsExchange extends AbstractPolicyNode {
	id: string | undefined;
	technicalProfileReferenceId: string | undefined;

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.id = selector("string(./@Id)", node, true) as string;
		this.technicalProfileReferenceId = selector("string(./@TechnicalProfileReferenceId)", node, true) as string;
	}
}

export class Precondition extends AbstractPolicyNode {
	type: string | undefined;
	executeActionsIf: string | undefined;
	values: Array<string>;
	action: string | undefined | null;

	constructor() {
		super();
		this.values = [];
	}

	populate(node: ChildNode, selector: xpath.XPathSelect): void {
		this.type = selector("string(./@Type)", node, true) as string;
		this.executeActionsIf = selector("string(./@ExecuteActionsIf)", node, true) as string;
		let valueNodes = selector("./n:Value", node);
		for (let i = 0; i < valueNodes.length; i++) {
			let val = (valueNodes[i] as Element).textContent;
			if (val) {
				this.values.push(val);
			}
		}
		let actionNode = selector("./n:Action", node, true) as Element;
		if (actionNode) {
			this.action = actionNode.textContent;
		}
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
		this.type = selector("string(./@Type)", node, true) as string;
		this.contentDefinitionReferenceId = selector("string(./@ContentDefinitionReferenceId)", node, true) as string;
		let claimsProviderSelectionsNode = selector("./n:ClaimsProviderSelections", node, true) as Element;
		this.claimsProviderSelections = populateChildNodes(claimsProviderSelectionsNode, selector, ClaimsProviderSelections);

		let claimsExchangesNode = selector("./n:ClaimsExchanges", node, true) as Element;
		this.claimsExchanges = populateChildNodes(claimsExchangesNode, selector, ClaimsExchange);

		let preconditionsNode = selector("./n:Preconditions", node, true) as Element;
		this.preconditions = populateChildNodes(preconditionsNode, selector, Precondition);
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
		this.id = selector("string(./@Id)", node, true) as string;
		let orchestrationStepsNode = selector("./n:OrchestrationSteps", node, true) as Element;
		this.orchestrationSteps = populateChildNodes(orchestrationStepsNode, selector, OrchestrationStep);
	}
}