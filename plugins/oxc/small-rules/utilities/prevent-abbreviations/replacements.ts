import {
	DEFAULT_ALLOW_LIST,
	DEFAULT_IGNORE,
	DEFAULT_REPLACEMENTS,
	IS_ALPHABETIC,
	MESSAGE_ID_REPLACE,
	MESSAGE_ID_SUGGESTION,
	WORD_SPLIT_PATTERN,
} from "./constants";

import type { MessageIds, NameReplacements, PreparedOptions } from "./types";

function isUpperCase(value: string): boolean {
	return value === value.toUpperCase();
}

export function isUpperFirst(value: string): boolean {
	return isUpperCase(value.charAt(0));
}

function upperFirst(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function lowerFirst(value: string): string {
	return value.charAt(0).toLowerCase() + value.slice(1);
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

export function isDiscouragedReplacementName(name: string, options: PreparedOptions): boolean {
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

export function getNameReplacements(name: string, options: PreparedOptions, limit = 3): NameReplacements {
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

export function getMessage(
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

export function prepareOptions(): PreparedOptions {
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
