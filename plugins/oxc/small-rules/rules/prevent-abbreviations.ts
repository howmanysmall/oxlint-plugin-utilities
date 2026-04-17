// oxlint-disable typescript/no-unnecessary-condition
// oxlint-disable max-lines-per-function
// oxlint-disable id-length

import { defineRule } from "../../../../src/index";
import { isRecord } from "../utilities/type-utilities";

import type { Definition, ESTree, Fix, Fixer, Reference, Scope, Variable, Visitor } from "../../../../src/index";

type MessageIds = "replace" | "suggestion";
type ImportCheckOption = "internal" | boolean;

interface PreparedOptions {
	readonly allowList: Map<string, boolean>;
	readonly checkDefaultAndNamespaceImports: ImportCheckOption;
	readonly checkFilenames: boolean;
	readonly checkProperties: boolean;
	readonly checkShorthandImports: ImportCheckOption;
	readonly checkShorthandProperties: boolean;
	readonly checkVariables: boolean;
	readonly ignore: ReadonlyArray<RegExp>;
	readonly replacements: Map<string, Map<string, boolean>>;
}

interface NameReplacements {
	samples?: ReadonlyArray<string>;
	total: number;
}

type NamedIdentifier = ESTree.BindingIdentifier | ESTree.IdentifierName | ESTree.IdentifierReference;
type BroadIdentifier = ESTree.LabelIdentifier | ESTree.TSIndexSignatureName | ESTree.TSThisParameter | NamedIdentifier;

interface VariableLike {
	readonly name: string;
	readonly defs: ReadonlyArray<Definition>;
	readonly identifiers: ReadonlyArray<BroadIdentifier>;
	readonly references: ReadonlyArray<Reference>;
	readonly scope: Scope;
}

const MESSAGE_ID_REPLACE = "replace";
const MESSAGE_ID_SUGGESTION = "suggestion";
const ANOTHER_NAME_MESSAGE = "A more descriptive name will do too.";

const DEFAULT_REPLACEMENTS: Record<string, Record<string, boolean>> = {
	acc: { accumulator: true },
	arg: { argument: true },
	args: { arguments: true },
	arr: { array: true },
	attr: { attribute: true },
	attrs: { attributes: true },
	btn: { button: true },
	cb: { callback: true },
	conf: { config: true },
	ctx: { context: true },
	cur: { current: true },
	curr: { current: true },
	db: { database: true },
	def: { defer: true, deferred: true, define: true, definition: true },
	dest: { destination: true },
	dev: { development: true },
	dir: { direction: true, directory: true },
	dirs: { directories: true },
	dist: { distance: true },
	doc: { document: true },
	docs: { documentation: true, documents: true },
	dst: { daylightSavingTime: true, destination: true, distribution: true },
	e: { error: true, event: true },
	el: { element: true },
	elem: { element: true },
	elems: { elements: true },
	env: { environment: true },
	envs: { environments: true },
	err: { error: true },
	ev: { event: true },
	evt: { event: true },
	ext: { extension: true },
	exts: { extensions: true },
	fn: { func: true, function: true },
	func: { function: true },
	i: { index: true },
	idx: { index: true },
	j: { index: true },
	len: { length: true },
	lib: { library: true },
	mod: { module: true },
	msg: { message: true },
	num: { number: true },
	obj: { object: true },
	opts: { options: true },
	param: { parameter: true },
	params: { parameters: true },
	pkg: { package: true },
	prev: { previous: true },
	prod: { production: true },
	prop: { property: true },
	props: { properties: true },
	ref: { reference: true },
	refs: { references: true },
	rel: { related: true, relationship: true, relative: true },
	req: { request: true },
	res: { resource: true, response: true, result: true },
	ret: { returnValue: true },
	retval: { returnValue: true },
	sep: { separator: true },
	src: { source: true },
	stdDev: { standardDeviation: true },
	str: { string: true },
	tbl: { table: true },
	temp: { temporary: true },
	tit: { title: true },
	tmp: { temporary: true },
	util: { utility: true },
	utils: { utilities: true },
	val: { value: true },
	var: { variable: true },
	vars: { variables: true },
	ver: { version: true },
};

const DEFAULT_ALLOW_LIST: Record<string, boolean> = {
	defaultProps: true,
	devDependencies: true,
	EmberENV: true,
	getDerivedStateFromProps: true,
	getInitialProps: true,
	getServerSideProps: true,
	getStaticProps: true,
	iOS: true,
	obj: true,
	propTypes: true,
	setupFilesAfterEnv: true,
};

const DEFAULT_IGNORE = ["i18n", "l10n"];

const WORD_SPLIT_PATTERN = /(?=[A-Z])|(?<=[_.-])/;

const TYPESCRIPT_RESERVED_WORDS = new Set([
	"any",
	"as",
	"boolean",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"constructor",
	"continue",
	"debugger",
	"declare",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"from",
	"function",
	"get",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"interface",
	"let",
	"module",
	"new",
	"null",
	"number",
	"of",
	"package",
	"private",
	"protected",
	"public",
	"require",
	"return",
	"set",
	"static",
	"string",
	"super",
	"switch",
	"symbol",
	"this",
	"throw",
	"true",
	"try",
	"type",
	"typeof",
	"var",
	"void",
	"while",
	"with",
	"yield",
]);

const IS_ALPHABETIC = /^[A-Za-z]+$/;

function isUpperCase(value: string): boolean {
	return value === value.toUpperCase();
}

function isUpperFirst(value: string): boolean {
	return isUpperCase(value.charAt(0));
}

function upperFirst(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowerFirst(value: string): string {
	return value.charAt(0).toLowerCase() + value.slice(1);
}

function hasName(
	node: unknown,
): node is (ESTree.BindingIdentifier | ESTree.IdentifierName | ESTree.IdentifierReference) & { name: string } {
	return isRecord(node) && "name" in node && typeof node.name === "string";
}

function isIdentifierName(node: unknown): node is ESTree.IdentifierName {
	return hasName(node) && node.type === "Identifier";
}

function isJsxIdentifier(node: unknown): node is ESTree.JSXIdentifier {
	return isRecord(node) && node.type === "JSXIdentifier" && "name" in node;
}

function isImportDeclaration(node: unknown): node is ESTree.ImportDeclaration {
	return isRecord(node) && node.type === "ImportDeclaration";
}

function isVariableDeclarator(node: unknown): node is ESTree.VariableDeclarator {
	return isRecord(node) && node.type === "VariableDeclarator";
}

function isStringLiteral(node: unknown): node is ESTree.StringLiteral {
	return isRecord(node) && node.type === "Literal" && typeof node.value === "string";
}

function isCallExpression(node: unknown): node is ESTree.CallExpression {
	return isRecord(node) && node.type === "CallExpression";
}

function isStaticRequire(node: unknown): node is ESTree.CallExpression {
	if (!isCallExpression(node)) return false;
	if (node.optional) return false;

	const { callee } = node;
	if (!isIdentifierName(callee) || callee.name !== "require" || node.arguments.length !== 1) return false;

	const [argument] = node.arguments;
	return argument !== undefined && isStringLiteral(argument);
}

function isValidIdentifier(name: string): boolean {
	if (name.length === 0 || TYPESCRIPT_RESERVED_WORDS.has(name)) return false;

	const firstCodePoint = name.codePointAt(0);
	if (firstCodePoint === undefined || !isIdentifierStartCodePoint(firstCodePoint)) return false;

	let index = firstCodePoint > 0xff_ff ? 2 : 1;
	while (index < name.length) {
		const codePoint = name.codePointAt(index);
		if (codePoint === undefined || !isIdentifierPartCodePoint(codePoint)) return false;
		index += codePoint > 0xff_ff ? 2 : 1;
	}

	return true;
}

// oxlint-disable-next-line complexity
function isIdentifierStartCodePoint(codePoint: number): boolean {
	if ((codePoint >= 65 && codePoint <= 90) || (codePoint >= 97 && codePoint <= 122)) return true;
	if (codePoint === 36 || codePoint === 95) return true;
	if (codePoint >= 0x00_c0 && codePoint <= 0x00_d6) return true;
	if (codePoint >= 0x00_d8 && codePoint <= 0x00_f6) return true;
	if (codePoint >= 0x00_f8 && codePoint <= 0x02_ff) return true;
	if (codePoint >= 0x03_70 && codePoint <= 0x03_7d) return true;
	if (codePoint >= 0x03_7f && codePoint <= 0x1f_ff) return true;
	if (codePoint >= 0x20_0c && codePoint <= 0x20_0d) return true;
	if (codePoint >= 0x20_70 && codePoint <= 0x21_8f) return true;
	if (codePoint >= 0x2c_00 && codePoint <= 0x2f_ef) return true;
	if (codePoint >= 0x30_01 && codePoint <= 0xd7_ff) return true;
	if (codePoint >= 0xf9_00 && codePoint <= 0xfa_ff) return true;
	if (codePoint >= 0xfc_00 && codePoint <= 0xfd_ff) return true;
	if (codePoint >= 0xfe_70 && codePoint <= 0xfe_ff) return true;
	if (codePoint >= 0xff_21 && codePoint <= 0xff_3a) return true;
	if (codePoint >= 0xff_41 && codePoint <= 0xff_5a) return true;
	if (codePoint >= 0xff_66 && codePoint <= 0xff_dc) return true;
	return false;
}

function isIdentifierPartCodePoint(codePoint: number): boolean {
	if (isIdentifierStartCodePoint(codePoint)) return true;
	if (codePoint >= 48 && codePoint <= 57) return true;
	if (codePoint === 0x20_0c || codePoint === 0x20_0d) return true;
	if (codePoint >= 0x03_00 && codePoint <= 0x03_61) return true;
	if (codePoint >= 0x20_30 && codePoint <= 0x20_4a) return true;
	return false;
}

function getScopes(scope: Scope): Array<Scope> {
	const result = [scope];
	for (const child of scope.childScopes) {
		const childScopes = getScopes(child);
		for (const childScope of childScopes) result.push(childScope);
	}
	return result;
}

function resolveVariableName(name: string, scope: null | Scope): undefined | Variable {
	let currentScope = scope;
	while (currentScope !== null) {
		const variable = currentScope.set.get(name);
		if (variable !== undefined) return variable;
		currentScope = currentScope.upper;
	}
	return undefined;
}

type IsSafe = (name: string, scopes: ReadonlyArray<Scope>) => boolean;

function isSafeName(name: string, scopes: ReadonlyArray<Scope>): boolean {
	return !scopes.some((scope) => resolveVariableName(name, scope) !== undefined);
}

function getAvailableVariableName(
	name: string,
	scopes: ReadonlyArray<Scope>,
	isSafe: IsSafe = () => true,
): string | undefined {
	let candidate = name;
	if (!isValidIdentifier(candidate)) {
		candidate = `${candidate}_`;
		if (!isValidIdentifier(candidate)) return undefined;
	}

	while (!isSafeName(candidate, scopes) || !isSafe(candidate, scopes)) candidate = `${candidate}_`;
	return candidate;
}

function getVariableIdentifiers(variable: VariableLike): ReadonlyArray<BroadIdentifier> {
	const identifiers = new Set<BroadIdentifier>();
	for (const identifier of variable.identifiers) identifiers.add(identifier);
	for (const { identifier } of variable.references) identifiers.add(identifier);
	return [...identifiers];
}

function hasSameRange(node1: { range: [number, number] }, node2: { range: [number, number] }): boolean {
	return node1.range[0] === node2.range[0] && node1.range[1] === node2.range[1];
}

function isShorthandImportLocal(node: ESTree.BindingIdentifier | ESTree.IdentifierName): boolean {
	const { parent } = node;
	if (!isImportSpecifierNode(parent) || parent.local !== node) return false;
	return hasSameRange(parent.local, parent.imported);
}

function isImportSpecifierNode(node: unknown): node is ESTree.ImportSpecifier {
	return isRecord(node) && node.type === "ImportSpecifier";
}

function isExportSpecifierNode(node: unknown): node is ESTree.ExportSpecifier {
	return isRecord(node) && node.type === "ExportSpecifier";
}

function isPropertyNode(node: unknown): node is ESTree.ObjectProperty {
	return isRecord(node) && node.type === "Property";
}

function isShorthandPropertyValue(identifier: BroadIdentifier): boolean {
	if (!hasName(identifier)) return false;
	const { parent } = identifier;
	return isPropertyNode(parent) && parent.shorthand && parent.value === identifier;
}

function isDefaultOrNamespaceImportName(identifier: BroadIdentifier): boolean {
	if (!hasName(identifier)) return false;
	const { parent } = identifier;

	if (
		(isImportDefaultSpecifierNode(parent) && parent.local === identifier) ||
		(isImportNamespaceSpecifierNode(parent) && parent.local === identifier)
	) {
		return true;
	}

	if (isImportSpecifierNode(parent) && parent.local === identifier) {
		const { imported } = parent;
		if (isIdentifierName(imported) && imported.name === "default") return true;
	}

	if (isVariableDeclarator(parent) && parent.id === identifier && isStaticRequire(parent.init)) return true;

	return false;
}

function isImportDefaultSpecifierNode(node: unknown): node is ESTree.ImportDefaultSpecifier {
	return isRecord(node) && node.type === "ImportDefaultSpecifier";
}

function isImportNamespaceSpecifierNode(node: unknown): node is ESTree.ImportNamespaceSpecifier {
	return isRecord(node) && node.type === "ImportNamespaceSpecifier";
}

function isExportedIdentifier(identifier: BroadIdentifier): boolean {
	if (!hasName(identifier)) return false;
	const { parent } = identifier;
	if (parent === undefined || parent === null) return false;

	if (isVariableDeclarator(parent) && parent.id === identifier) {
		const declaration = parent.parent;
		if (!isVariableDeclarationNode(declaration)) return false;
		const declarationParent = declaration.parent;
		return isExportNamedDeclarationNode(declarationParent);
	}

	if (isFunctionDeclarationNode(parent) && parent.id === identifier) {
		return isExportNamedDeclarationNode(parent.parent);
	}

	if (isClassNode(parent) && parent.id === identifier) return isExportNamedDeclarationNode(parent.parent);

	if (isTSTypeAliasDeclarationNode(parent) && parent.id === identifier) {
		return isExportNamedDeclarationNode(parent.parent);
	}

	return false;
}

function isVariableDeclarationNode(node: unknown): node is ESTree.VariableDeclaration {
	return isRecord(node) && node.type === "VariableDeclaration";
}

function isExportNamedDeclarationNode(node: unknown): node is ESTree.ExportNamedDeclaration {
	return isRecord(node) && node.type === "ExportNamedDeclaration";
}

function isFunctionDeclarationNode(node: unknown): node is ESTree.Function {
	return (
		isRecord(node) &&
		typeof node.type === "string" &&
		(node.type === "FunctionDeclaration" || node.type === "FunctionExpression")
	);
}

function isClassNode(node: unknown): node is ESTree.Class {
	return (
		isRecord(node) &&
		typeof node.type === "string" &&
		(node.type === "ClassDeclaration" || node.type === "ClassExpression")
	);
}

function isTSTypeAliasDeclarationNode(node: unknown): node is ESTree.TSTypeAliasDeclaration {
	return isRecord(node) && node.type === "TSTypeAliasDeclaration";
}

function shouldFix(variable: VariableLike): boolean {
	return getVariableIdentifiers(variable).every(
		(identifier) => !isExportedIdentifier(identifier) && !isJsxIdentifier(identifier),
	);
}

function shouldReportIdentifierAsProperty(identifier: BroadIdentifier): boolean {
	if (!hasName(identifier)) return false;
	const { parent } = identifier;
	if (isMemberExpressionNode(parent) && parent.property === identifier && !parent.computed) {
		const parentParent = parent.parent;
		if (isAssignmentExpressionNode(parentParent) && parentParent.left === parent) return true;
	}

	if (
		isPropertyNode(parent) &&
		parent.key === identifier &&
		!parent.computed &&
		!parent.shorthand &&
		isObjectExpressionNode(parent.parent)
	) {
		return true;
	}

	if (isExportSpecifierNode(parent) && parent.exported === identifier && parent.local !== identifier) return true;

	return (
		(isMethodDefinitionNode(parent) || isPropertyDefinitionNode(parent)) &&
		parent.key === identifier &&
		!parent.computed
	);
}

function isMemberExpressionNode(node: unknown): node is ESTree.MemberExpression {
	return isRecord(node) && node.type === "MemberExpression";
}

function isAssignmentExpressionNode(node: unknown): node is ESTree.AssignmentExpression {
	return isRecord(node) && node.type === "AssignmentExpression";
}

function isObjectExpressionNode(node: unknown): node is ESTree.ObjectExpression {
	return isRecord(node) && node.type === "ObjectExpression";
}

function isMethodDefinitionNode(node: unknown): node is ESTree.MethodDefinition {
	return (
		isRecord(node) &&
		typeof node.type === "string" &&
		(node.type === "MethodDefinition" || node.type === "TSAbstractMethodDefinition")
	);
}

function isPropertyDefinitionNode(node: unknown): node is ESTree.PropertyDefinition {
	return (
		isRecord(node) &&
		typeof node.type === "string" &&
		(node.type === "PropertyDefinition" || node.type === "TSAbstractPropertyDefinition")
	);
}

function isObjectPropertyKey(identifier: BroadIdentifier): boolean {
	if (!hasName(identifier)) return false;
	const { parent } = identifier;
	return (
		isPropertyNode(parent) &&
		parent.key === identifier &&
		!parent.computed &&
		!parent.shorthand &&
		isObjectExpressionNode(parent.parent)
	);
}

function getImportSource(definition: Definition): string | undefined {
	if (definition.type === "ImportBinding") {
		const { parent } = definition;
		if (parent !== null && isImportDeclaration(parent) && isStringLiteral(parent.source)) {
			return parent.source.value;
		}
	}

	if (definition.type === "Variable") {
		const { node } = definition;
		if (isVariableDeclarator(node) && isStaticRequire(node.init)) {
			const [argument] = node.init.arguments;
			if (argument !== undefined && isStringLiteral(argument)) return argument.value;
		}
	}

	return undefined;
}

function isInternalImport(definition: Definition): boolean {
	const source = getImportSource(definition);
	if (source === undefined) return false;
	return !source.includes("node_modules") && (source.startsWith(".") || source.startsWith("/"));
}

function shouldCheckImport(option: ImportCheckOption, definition: Definition): boolean {
	if (option === false) return false;
	return option === "internal" ? isInternalImport(definition) : true;
}

function isClassVariable(variable: Variable): boolean {
	if (variable.defs.length !== 1) return false;
	return variable.defs[0]?.type === "ClassName";
}

function prepareOptions(): PreparedOptions {
	return {
		allowList: new Map(Object.entries(DEFAULT_ALLOW_LIST)),
		checkDefaultAndNamespaceImports: "internal",
		checkFilenames: true,
		checkProperties: false,
		checkShorthandImports: "internal",
		checkShorthandProperties: false,
		checkVariables: true,
		ignore: DEFAULT_IGNORE.map((pattern) => new RegExp(pattern, "u")),
		replacements: new Map(
			Object.entries(DEFAULT_REPLACEMENTS).map(([discouragedName, replacementsForName]) => [
				discouragedName,
				new Map(Object.entries(replacementsForName)),
			]),
		),
	};
}

function getWordReplacements(word: string, options: PreparedOptions): ReadonlyArray<string> {
	if (isUpperCase(word) || options.allowList.get(word) === true) return [];

	const replacement =
		options.replacements.get(lowerFirst(word)) ??
		options.replacements.get(word) ??
		options.replacements.get(upperFirst(word));

	if (!replacement) return [];

	const transform = isUpperFirst(word) ? upperFirst : lowerFirst;
	// oxlint-disable-next-line unicorn/no-array-callback-reference
	const wordReplacement = [...replacement.keys()].filter((name) => replacement.get(name) ?? false).map(transform);

	return wordReplacement.length > 0 ? [...wordReplacement].toSorted() : [];
}

function isDiscouragedReplacementName(name: string, options: PreparedOptions): boolean {
	const replacement = options.replacements.get(name);
	if (!replacement) return false;

	for (const enabled of replacement.values()) if (enabled) return true;
	return false;
}

function cartesianProductSamples(
	combinations: ReadonlyArray<ReadonlyArray<string>>,
	length = Number.POSITIVE_INFINITY,
): { samples: Array<Array<string>>; total: number } {
	const total = combinations.reduce((count, { length: optionLength }) => count * optionLength, 1);
	const sampleCount = Math.min(total, length);
	const samples = Array.from({ length: sampleCount }, (_, sampleIndex) => {
		let indexRemaining = sampleIndex;
		const combination = new Array<string>();
		for (let combinationIndex = combinations.length - 1; combinationIndex >= 0; combinationIndex -= 1) {
			const items = combinations[combinationIndex] ?? [];
			const itemLength = items.length;
			const index = indexRemaining % itemLength;
			indexRemaining = (indexRemaining - index) / itemLength;
			const item = items[index];
			if (item !== undefined) combination.unshift(item);
		}
		return combination;
	});

	return { samples, total };
}

function getNameReplacements(name: string, options: PreparedOptions, limit = 3): NameReplacements {
	const { allowList, ignore } = options;
	if (isUpperCase(name) || allowList.get(name) === true || ignore.some((regexp) => regexp.test(name))) {
		return { total: 0 };
	}

	const exactReplacements = getWordReplacements(name, options);
	if (exactReplacements.length > 0) {
		return {
			samples: exactReplacements.slice(0, limit),
			total: exactReplacements.length,
		};
	}

	const words = name.split(WORD_SPLIT_PATTERN).filter(Boolean);
	let hasReplacements = false;

	const combinations = new Array<ReadonlyArray<string>>();
	let size = 0;
	for (const word of words) {
		const wordReplacements = getWordReplacements(word, options);
		if (wordReplacements.length > 0) {
			hasReplacements = true;
			combinations[size++] = wordReplacements;
		} else combinations[size++] = [word];
	}

	if (!hasReplacements) return { total: 0 };

	const { samples, total } = cartesianProductSamples(combinations, limit);
	for (const parts of samples) {
		for (let index = parts.length - 1; index > 0; index -= 1) {
			const word = parts[index] ?? "";
			if (IS_ALPHABETIC.test(word) && parts[index - 1]?.endsWith(word) === true) parts.splice(index, 1);
		}
	}

	return {
		samples: samples.map((parts) => parts.join("")),
		total,
	};
}

function getMessage(
	discouragedName: string,
	replacements: NameReplacements,
	nameTypeText: string,
): { data: Record<string, string>; messageId: MessageIds } {
	const { samples = [], total } = replacements;

	if (total === 1) {
		return {
			data: {
				discouragedName,
				nameTypeText,
				replacement: samples[0] ?? "",
			},
			messageId: MESSAGE_ID_REPLACE,
		};
	}

	let replacementsText = samples.map((replacement) => `\`${replacement}\``).join(", ");
	const omittedReplacementsCount = total - samples.length;
	if (omittedReplacementsCount > 0) {
		replacementsText += `, ... (${omittedReplacementsCount > 99 ? "99+" : omittedReplacementsCount} more omitted)`;
	}

	return {
		data: {
			discouragedName,
			nameTypeText,
			replacementsText,
		},
		messageId: MESSAGE_ID_SUGGESTION,
	};
}

const preventAbbreviations = defineRule<Record<string, never>, MessageIds>({
	// oxlint-disable-next-line max-lines-per-function
	create(context): Visitor {
		const options = prepareOptions();
		const filenameWithExtension = context.physicalFilename;

		const scopeToNamesGeneratedByFixer = new WeakMap<Scope, Set<string>>();

		const isSafeGeneratedName: IsSafe = (name, scopes) =>
			scopes.every((scope) => {
				const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
				// oxlint-disable-next-line typescript/strict-boolean-expressions
				return !generatedNames?.has(name);
			});

		// oxlint-disable-next-line complexity
		function checkVariable(variable: VariableLike): void {
			if (variable.defs.length === 0) return;

			const [definition] = variable.defs;
			if (definition === undefined) return;

			const definitionName = definition.name;
			if (!isIdentifierName(definitionName)) return;

			if (
				(isDefaultOrNamespaceImportName(definitionName) &&
					!shouldCheckImport(options.checkDefaultAndNamespaceImports, definition)) ||
				(isShorthandImportLocal(definitionName) &&
					!shouldCheckImport(options.checkShorthandImports, definition))
			) {
				return;
			}

			if (!options.checkShorthandProperties && isShorthandPropertyValue(definitionName)) return;

			const avoidArgumentsReplacement =
				definition.type === "Variable" &&
				isVariableDeclarator(definition.node) &&
				definition.node.init === null;
			const avoidArgumentsInArrowParameter =
				definition.type === "Parameter" &&
				variable.scope.type === "function" &&
				variable.scope.block.type === "ArrowFunctionExpression";
			const shouldAvoidArguments = avoidArgumentsReplacement || avoidArgumentsInArrowParameter;

			const isSafeNameForVariable: IsSafe = (name, scopes) => {
				if (!isSafeGeneratedName(name, scopes)) return false;
				if (shouldAvoidArguments && name === "arguments") return false;
				return true;
			};

			const variableReplacements = getNameReplacements(variable.name, options);
			if (variableReplacements.total === 0 || !variableReplacements.samples) return;

			const { references } = variable;
			const scopes = [...references.map((reference) => reference.from), variable.scope];
			let droppedDiscouraged = 0;
			const safeSamples = variableReplacements.samples
				.map((name) => {
					const safeName = getAvailableVariableName(name, scopes, isSafeNameForVariable);
					if (safeName === undefined) return undefined;
					if (safeName !== name && isDiscouragedReplacementName(name, options)) {
						droppedDiscouraged += 1;
						return undefined;
					}
					return safeName;
				})
				.filter((name): name is string => typeof name === "string" && name.length > 0);

			const baseSamples = safeSamples.length > 0 ? safeSamples : variableReplacements.samples;
			const hasCompleteSamples =
				typeof variableReplacements.samples?.length === "number" &&
				variableReplacements.samples.length === variableReplacements.total;
			const effectiveTotal = hasCompleteSamples
				? Math.max(0, variableReplacements.total - droppedDiscouraged)
				: variableReplacements.total;
			const messageSamples =
				variable.name === "fn" && effectiveTotal > 1
					? baseSamples.map((name) => (name === "function_" ? "function" : name))
					: baseSamples;

			const message = getMessage(
				definitionName.name,
				{ samples: messageSamples, total: effectiveTotal },
				"variable",
			);

			if (effectiveTotal === 1 && safeSamples.length === 1 && shouldFix(variable)) {
				const [replacement] = safeSamples;
				if (replacement !== undefined) {
					for (const scope of scopes) {
						if (!scopeToNamesGeneratedByFixer.has(scope)) {
							scopeToNamesGeneratedByFixer.set(scope, new Set());
						}
						const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
						generatedNames?.add(replacement);
					}

					const variableIdentifiers = getVariableIdentifiers(variable);
					context.report({
						...message,
						fix(fixer: Fixer): Array<Fix> {
							const mapFilterArray = new Array<Fix>();
							let size = 0;

							for (const identifier of variableIdentifiers) {
								const fix = fixer.replaceText(identifier, replacement);
								if (fix === undefined) continue;
								mapFilterArray[size++] = fix;
							}

							return mapFilterArray;
						},
						node: definitionName,
					});
					return;
				}
			}

			context.report({ ...message, node: definitionName });
		}

		function checkPossiblyWeirdClassVariable(variable: Variable): void {
			if (!isClassVariable(variable)) {
				checkVariable(variable);
				return;
			}

			if (variable.scope.type === "class") {
				const [definition] = variable.defs;
				if (definition === undefined) {
					checkVariable(variable);
					return;
				}
				const definitionName = definition.name;
				if (!isIdentifierName(definitionName)) {
					checkVariable(variable);
					return;
				}
				checkVariable(variable);
			}
		}

		function checkScope(scope: Scope): void {
			for (const scopeItem of getScopes(scope)) {
				for (const variable of scopeItem.variables) checkPossiblyWeirdClassVariable(variable);
			}
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
						context.report({
							...message,
							fix(fixer: Fixer): Fix {
								return fixer.replaceText(node, replacement);
							},
							node,
						});
						return;
					}
				}

				context.report({ ...message, node });
			},
			JSXOpeningElement(node): void {
				if (!options.checkVariables || !isJsxIdentifier(node.name) || !isUpperFirst(node.name.name)) return;

				const replacements = getNameReplacements(node.name.name, options);
				if (replacements.total === 0) return;

				const message = getMessage(node.name.name, replacements, "variable");
				context.report({ ...message, node: node.name });
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
						context.report({
							...getMessage(filename, { samples, total: filenameReplacements.total }, "filename"),
							node: program,
						});
					}
				}

				if (!options.checkVariables) return;
				const scope = context.sourceCode.getScope(program);
				checkScope(scope);
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
