import {
	hasName,
	isIdentifierName,
	isJsxIdentifier,
	isPropertyNode,
	isStringLiteral,
	isVariableDeclarator,
} from "@utilities/ast-utilities";
import {
	ANOTHER_NAME_MESSAGE,
	MESSAGE_ID_REPLACE,
	MESSAGE_ID_SUGGESTION,
} from "@utilities/prevent-abbreviations/constants";
import { isValidIdentifier } from "@utilities/prevent-abbreviations/identifier";
import {
	getMessage,
	getNameReplacements,
	isDiscouragedReplacementName,
	isUpperFirst,
	prepareOptions,
} from "@utilities/prevent-abbreviations/replacements";
import {
	getAvailableVariableName,
	getScopes,
	getVariableIdentifiers,
	isClassVariable,
	isDefaultOrNamespaceImportName,
	isObjectPropertyKey,
	isShorthandImportLocal,
	isShorthandPropertyValue,
	shouldCheckImport,
	shouldFix,
	shouldReportIdentifierAsProperty,
} from "@utilities/prevent-abbreviations/scope";

import { defineRule } from "#src";

import type { IsSafe, MessageIds, PreparedOptions, VariableLike } from "@utilities/prevent-abbreviations/types";

import type { Definition, Diagnostic, ESTree, Fix, Fixer, Scope, Variable, Visitor } from "#src";

function createIsSafeGeneratedName(scopeToNamesGeneratedByFixer: WeakMap<Scope, Set<string>>): IsSafe {
	return (name, scopes) =>
		scopes.every((scope) => {
			const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
			return generatedNames === undefined || !generatedNames.has(name);
		});
}

function shouldSkipVariable(
	definition: Definition,
	definitionName: ESTree.IdentifierName,
	options: PreparedOptions,
): boolean {
	if (
		(isDefaultOrNamespaceImportName(definitionName) &&
			!shouldCheckImport(options.checkDefaultAndNamespaceImports, definition)) ||
		(isShorthandImportLocal(definitionName) && !shouldCheckImport(options.checkShorthandImports, definition))
	) {
		return true;
	}

	return !options.checkShorthandProperties && isShorthandPropertyValue(definitionName);
}

interface SafeSamplesResult {
	readonly droppedDiscouraged: number;
	readonly safeSamples: Array<string>;
}

function computeSafeSamples(
	samples: ReadonlyArray<string>,
	scopes: ReadonlyArray<Scope>,
	isSafeNameForVariable: IsSafe,
	options: PreparedOptions,
): SafeSamplesResult {
	const safeSamples = new Array<string>();
	let safeSamplesSize = 0;
	let droppedDiscouraged = 0;

	for (const name of samples) {
		const safeName = getAvailableVariableName(name, scopes, isSafeNameForVariable);
		if (safeName === undefined) continue;
		if (safeName !== name && isDiscouragedReplacementName(name, options)) {
			droppedDiscouraged += 1;
			continue;
		}
		if (safeName.length > 0) safeSamples[safeSamplesSize++] = safeName;
	}

	return { droppedDiscouraged, safeSamples };
}

function createIsSafeNameForVariable(
	definition: Definition,
	variable: VariableLike,
	isSafeGeneratedName: IsSafe,
): IsSafe {
	const avoidArgumentsReplacement =
		definition.type === "Variable" && isVariableDeclarator(definition.node) && definition.node.init === null;
	const avoidArgumentsInArrowParameter =
		definition.type === "Parameter" &&
		variable.scope.type === "function" &&
		variable.scope.block.type === "ArrowFunctionExpression";
	const shouldAvoidArguments = avoidArgumentsReplacement || avoidArgumentsInArrowParameter;

	return (name, scopes) => {
		if (!isSafeGeneratedName(name, scopes)) return false;
		if (shouldAvoidArguments && name === "arguments") return false;
		return true;
	};
}

function tryReportFix(
	report: (diagnostic: Diagnostic<MessageIds>) => void,
	message: { data: Record<string, string>; messageId: MessageIds },
	variable: VariableLike,
	replacement: string,
	scopes: ReadonlyArray<Scope>,
	scopeToNamesGeneratedByFixer: WeakMap<Scope, Set<string>>,
	definitionName: ESTree.IdentifierName,
): void {
	for (const scope of scopes) {
		if (!scopeToNamesGeneratedByFixer.has(scope)) {
			scopeToNamesGeneratedByFixer.set(scope, new Set());
		}
		const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
		generatedNames?.add(replacement);
	}

	const variableIdentifiers = getVariableIdentifiers(variable);
	report({
		...message,
		fix(fixer: Fixer): Array<Fix> {
			const fixes = new Array<Fix>();
			let size = 0;
			for (const identifier of variableIdentifiers) {
				fixes[size++] = fixer.replaceText(identifier, replacement);
			}
			return fixes;
		},
		node: definitionName,
	});
}

function checkVariable(
	variable: VariableLike,
	options: PreparedOptions,
	scopeToNamesGeneratedByFixer: WeakMap<Scope, Set<string>>,
	isSafeGeneratedName: IsSafe,
	report: (diagnostic: Diagnostic<MessageIds>) => void,
): void {
	if (variable.defs.length === 0) return;

	const [definition] = variable.defs;
	if (definition === undefined) return;

	const definitionName = definition.name;
	if (!isIdentifierName(definitionName)) return;
	if (shouldSkipVariable(definition, definitionName, options)) return;

	const isSafeNameForVariable = createIsSafeNameForVariable(definition, variable, isSafeGeneratedName);

	const variableReplacements = getNameReplacements(variable.name, options);
	if (variableReplacements.total === 0 || !variableReplacements.samples) return;

	const { references } = variable;
	const scopes = [...references.map((reference) => reference.from), variable.scope];

	const { safeSamples, droppedDiscouraged } = computeSafeSamples(
		variableReplacements.samples,
		scopes,
		isSafeNameForVariable,
		options,
	);

	const baseSamples = safeSamples.length > 0 ? safeSamples : variableReplacements.samples;
	const hasCompleteSamples =
		typeof variableReplacements.samples.length === "number" &&
		variableReplacements.samples.length === variableReplacements.total;
	const effectiveTotal = hasCompleteSamples
		? Math.max(0, variableReplacements.total - droppedDiscouraged)
		: variableReplacements.total;
	const messageSamples =
		variable.name === "fn" && effectiveTotal > 1
			? baseSamples.map((name) => (name === "function_" ? "function" : name))
			: baseSamples;

	const message = getMessage(definitionName.name, { samples: messageSamples, total: effectiveTotal }, "variable");

	if (effectiveTotal === 1 && safeSamples.length === 1 && shouldFix(variable)) {
		const [replacement] = safeSamples;
		if (replacement !== undefined) {
			tryReportFix(report, message, variable, replacement, scopes, scopeToNamesGeneratedByFixer, definitionName);
			return;
		}
	}

	report({ ...message, node: definitionName });
}

function checkPossiblyWeirdClassVariable(variable: Variable, variableChecker: (variable: VariableLike) => void): void {
	if (!isClassVariable(variable)) {
		variableChecker(variable);
		return;
	}

	if (variable.scope.type === "class") {
		const [definition] = variable.defs;
		if (definition === undefined) {
			variableChecker(variable);
			return;
		}
		const definitionName = definition.name;
		if (!isIdentifierName(definitionName)) {
			variableChecker(variable);
			return;
		}
		variableChecker(variable);
	}
}

function checkScope(scope: Scope, variableChecker: (variable: VariableLike) => void): void {
	for (const scopeItem of getScopes(scope)) {
		for (const variable of scopeItem.variables) checkPossiblyWeirdClassVariable(variable, variableChecker);
	}
}

const preventAbbreviations = defineRule<Record<string, never>, MessageIds>({
	create(context): Visitor {
		const options = prepareOptions();
		const filenameWithExtension = context.physicalFilename;
		const scopeToNamesGeneratedByFixer = new WeakMap<Scope, Set<string>>();
		const isSafeGeneratedName = createIsSafeGeneratedName(scopeToNamesGeneratedByFixer);
		const { report } = context;

		function variableChecker(variable: VariableLike): void {
			checkVariable(variable, options, scopeToNamesGeneratedByFixer, isSafeGeneratedName, report);
		}

		return {
			Identifier(node): void {
				if (!options.checkProperties || !hasName(node) || node.name === "__proto__") return;

				const replacements = getNameReplacements(node.name, options);
				if (replacements.total === 0 || !shouldReportIdentifierAsProperty(node)) return;

				const message = getMessage(node.name, replacements, "property");

				if (replacements.total === 1 && replacements.samples && isObjectPropertyKey(node)) {
					const [replacement] = replacements.samples;
					const { parent } = node;
					if (
						replacement !== undefined &&
						isPropertyNode(parent) &&
						isStringLiteral(parent.value) &&
						isValidIdentifier(replacement)
					) {
						report({
							...message,
							fix(fixer: Fixer): Fix {
								return fixer.replaceText(node, replacement);
							},
							node,
						});
						return;
					}
				}

				report({ ...message, node });
			},
			JSXOpeningElement(node): void {
				if (!options.checkVariables || !isJsxIdentifier(node.name) || !isUpperFirst(node.name.name)) return;

				const replacements = getNameReplacements(node.name.name, options);
				if (replacements.total === 0) return;

				const message = getMessage(node.name.name, replacements, "variable");
				report({ ...message, node: node.name });
			},
			"Program:exit"(program): void {
				if (
					options.checkFilenames &&
					filenameWithExtension !== "<input>" &&
					filenameWithExtension !== "<text>"
				) {
					const lastSeparator = Math.max(
						filenameWithExtension.lastIndexOf("/"),
						filenameWithExtension.lastIndexOf("\\"),
					);
					const filename = filenameWithExtension.slice(lastSeparator + 1);
					const lastDot = filename.lastIndexOf(".");
					const extension = lastDot === -1 ? "" : filename.slice(lastDot);
					const basename = lastDot === -1 ? filename : filename.slice(0, lastDot);
					const filenameReplacements = getNameReplacements(basename, options);
					if (filenameReplacements.total > 0 && filenameReplacements.samples) {
						const samples = filenameReplacements.samples.map((replacement) => `${replacement}${extension}`);
						report({
							...getMessage(filename, { samples, total: filenameReplacements.total }, "filename"),
							node: program,
						});
					}
				}

				if (!options.checkVariables) return;
				const scope = context.sourceCode.getScope(program);
				checkScope(scope, variableChecker);
			},
		} satisfies Visitor;
	},
	meta: {
		docs: {
			description: "Prevent abbreviations.",
			recommended: false,
		},
		fixable: "code",
		messages: {
			[MESSAGE_ID_REPLACE]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${ANOTHER_NAME_MESSAGE}`,
			[MESSAGE_ID_SUGGESTION]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${ANOTHER_NAME_MESSAGE}`,
		},
		type: "suggestion",
	},
});

export default preventAbbreviations;
