import type { Rolldown, TsdownPlugin } from "tsdown";

interface PreserveCommentsOptions {
	readonly enabled: boolean;
}

interface Edit {
	readonly index: number;
	readonly insert: string;
	readonly replaceLength: number;
}

const JSDOC_BEFORE_DECLARATION =
	/(?<comment>\/\*\*[\s\S]*?\*\/)(?:\s*\n\s*\/\/[^\n]*)*\s*\n\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+(?<name>\w+)/gu;
const TYPESCRIPT_FILE_REGEXP = /\.tsx?$/u;
const IGNORED_SOURCE_REGEXP = /(?:^|\/)(?:node_modules|dist|tests)\/|(?:\.d|\.test|\.test-d|\.spec)\.ts$/u;
const TRAILING_JSDOC_REGEXP = /\/\*\*[\s\S]*?\*\/\s*$/u;
const REGEXP_REGEXP = /[.*+?^${}()|[\]\\]/gu;
const WHITESPACE_REGEXP = /\s+/gu;

function escapeRegExp(value: string): string {
	return value.replaceAll(REGEXP_REGEXP, String.raw`\$&`);
}

function reindentComment(comment: string, indent: string): string {
	const lines = comment.split("\n");

	let minimumIndent = Infinity;
	for (const line of lines) {
		const trimmed = line.trimStart();
		if (trimmed.length === 0) continue;
		minimumIndent = Math.min(minimumIndent, line.length - trimmed.length);
	}
	if (minimumIndent === Infinity) minimumIndent = 0;

	return lines
		.map((line) => {
			if (line.trimStart().length === 0) return "";
			return indent + line.slice(minimumIndent);
		})
		.join("\n");
}

function getReindentedComment(cache: Map<string, Map<string, string>>, comment: string, indent: string): string {
	let cacheEntry = cache.get(comment);
	if (!cacheEntry) {
		cacheEntry = new Map();
		cache.set(comment, cacheEntry);
	}

	let result = cacheEntry.get(indent);
	if (result === undefined || result.length === 0) {
		result = reindentComment(comment, indent);
		cacheEntry.set(indent, result);
	}

	return result;
}

function shouldExtractComments(id: string): boolean {
	return TYPESCRIPT_FILE_REGEXP.test(id) && !IGNORED_SOURCE_REGEXP.test(id);
}

function getStoredComments(code: string): ReadonlyMap<string, string> {
	const storedComments = new Map<string, string>();

	for (const match of code.matchAll(JSDOC_BEFORE_DECLARATION)) {
		const comment = match.groups?.comment;
		const name = match.groups?.name;
		if (comment !== undefined && name !== undefined) storedComments.set(name, comment);
	}

	return storedComments;
}

function getDeclarationNames(code: string, exportedName: string): ReadonlyArray<string> {
	const names = new Set([exportedName]);
	const exportAliasPattern = new RegExp(
		`\\b(?<local>[A-Za-z_$][\\w$]*)\\s+as\\s+${escapeRegExp(exportedName)}\\b`,
		"u",
	);
	const exportAliasMatch = exportAliasPattern.exec(code);
	const local = exportAliasMatch?.groups?.local;
	if (local !== undefined) names.add(local);

	return [...names];
}

function normalizeComment(comment: string): string {
	return comment.replaceAll(WHITESPACE_REGEXP, " ").trim();
}

function hasExistingComment(code: string, index: number, comment: string): boolean {
	const existingComment = TRAILING_JSDOC_REGEXP.exec(code.slice(0, index))?.[0];
	return existingComment !== undefined && normalizeComment(existingComment) === normalizeComment(comment);
}

function restoreComments(code: string, storedComments: ReadonlyMap<string, string>): string {
	if (storedComments.size === 0) return code;

	const reindentCache = new Map<string, Map<string, string>>();
	const edits = new Array<Edit>();

	for (const [name, comment] of storedComments) {
		let match: RegExpExecArray | undefined;
		for (const declarationName of getDeclarationNames(code, name)) {
			const pattern = new RegExp(
				`([ \\t]*)((?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${escapeRegExp(declarationName)})\\b`,
				"u",
			);
			match = pattern.exec(code) ?? undefined;
			if (match) break;
		}
		if (!match) continue;

		const [, indent, declaration] = match;
		if (indent === undefined || declaration === undefined) continue;

		if (hasExistingComment(code, match.index, comment)) continue;

		const reindented = getReindentedComment(reindentCache, comment, indent);
		const prefix = match.index > 0 && code[match.index - 1] !== "\n" ? "\n" : "";

		edits.push({
			index: match.index,
			insert: `${prefix}${reindented}\n${indent}${declaration}`,
			replaceLength: match[0].length,
		});
	}

	if (edits.length === 0) return code;

	let result = code;
	edits.sort((left, right) => right.index - left.index);
	for (const edit of edits) {
		result = `${result.slice(0, edit.index)}${edit.insert}${result.slice(edit.index + edit.replaceLength)}`;
	}

	return result;
}

export function createPreserveCommentsPlugin({ enabled }: PreserveCommentsOptions): TsdownPlugin {
	const storedComments = new Map<string, string>();

	return {
		generateBundle(_outputOptions, bundle: Rolldown.OutputBundle) {
			if (!enabled || storedComments.size === 0) return;

			for (const assetOrChunk of Object.values(bundle)) {
				if (assetOrChunk.type !== "chunk" || !assetOrChunk.fileName.endsWith(".js")) continue;
				assetOrChunk.code = restoreComments(assetOrChunk.code, storedComments);
			}
		},
		name: "preserve-comments",
		transform(code: string, id: string) {
			if (!enabled || !shouldExtractComments(id)) return;

			for (const [name, comment] of getStoredComments(code)) storedComments.set(name, comment);
		},
	};
}
