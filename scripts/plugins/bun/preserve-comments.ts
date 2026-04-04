import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A Bun plugin that preserves JSDoc comments through `Bun.build()`.
 *
 * `Bun.build()` strips all comments during bundling. This plugin works around that by: 1. Extracting JSDoc comments
 * from source files during `onLoad`. 2. Re-inserting them into output JS files during `onEnd`.
 *
 * @example
 * 	```ts
 * 	import { createPreserveCommentsPlugin } from "./plugins/bun/preserve-comments";
 *
 * 	const plugin = createPreserveCommentsPlugin({ outputDirectory: "./dist" });
 *
 * 	await Bun.build({
 * 		plugins: [plugin],
 * 		// ...
 * 	});
 * 	```;
 */

interface PreserveCommentsOptions {
	/** Path to the output directory where JS files are written. */
	readonly outputDirectory: string;
}
interface Edit {
	readonly index: number;
	readonly insert: string;
	readonly replaceLen: number;
}

const JSDOC_BEFORE_DECLARATION =
	/(?<comment>\/\*\*[\s\S]*?\*\/)\s*\n\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+(?<name>\w+)/g;

function escapeRegExp(value: string): string {
	return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\\$&`);
}

function reindentComment(comment: string, indent: string): string {
	const lines = comment.split("\n");

	let minIndent = Infinity;
	for (const line of lines) {
		const trimmed = line.trimStart();
		if (trimmed.length === 0) continue;
		minIndent = Math.min(minIndent, line.length - trimmed.length);
	}
	if (minIndent === Infinity) minIndent = 0;

	return lines
		.map((line) => {
			const trimmed = line.trimStart();
			if (trimmed.length === 0) return "";
			return indent + line.slice(minIndent);
		})
		.join("\n");
}

const ONLY_TSX = /\.tsx?$/;

export function createPreserveCommentsPlugin({ outputDirectory }: PreserveCommentsOptions): Bun.BunPlugin {
	const storedComments = new Map<string, string>();

	return {
		name: "preserve-comments",

		setup(pluginBuilder) {
			pluginBuilder.onLoad({ filter: ONLY_TSX }, ({ path }) => {
				if (
					path.includes("node_modules") ||
					path.endsWith(".d.ts") ||
					path.endsWith(".test.ts") ||
					path.endsWith(".test-d.ts") ||
					path.endsWith(".spec.ts")
				) {
					return undefined;
				}

				try {
					const source = readFileSync(path, "utf8");
					JSDOC_BEFORE_DECLARATION.lastIndex = 0;

					let match: RegExpExecArray | null;
					while ((match = JSDOC_BEFORE_DECLARATION.exec(source)) !== null) {
						const comment = match.groups?.comment;
						const name = match.groups?.name;
						if (comment && name) storedComments.set(name, comment);
					}
				} catch {
					// Non-fatal – the file will still be processed normally.
				}

				return undefined;
			});

			pluginBuilder.onEnd(() => {
				if (storedComments.size === 0 || !existsSync(outputDirectory)) return;

				function getReindented(
					cache: Map<string, Map<string, string>>,
					comment: string,
					indent: string,
				): string {
					let cacheEntry = cache.get(comment);
					if (!cacheEntry) {
						cacheEntry = new Map();
						cache.set(comment, cacheEntry);
					}
					let result = cacheEntry.get(indent);
					if (!result) {
						result = reindentComment(comment, indent);
						cacheEntry.set(indent, result);
					}
					return result;
				}

				const jsFiles = new Array<string>();
				try {
					for (const entry of readdirSync(outputDirectory)) {
						if (entry.endsWith(".js")) jsFiles.push(join(outputDirectory, entry));
					}
				} catch {
					return;
				}

				for (const filePath of jsFiles) {
					let content: string;
					try {
						content = readFileSync(filePath, "utf8");
					} catch {
						continue;
					}

					const reindentCache = new Map<string, Map<string, string>>();

					const edits = new Array<Edit>();

					for (const [name, comment] of storedComments) {
						const pattern = new RegExp(
							`([ \\t]*)((?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:function|const|let|var|class)\\s+${escapeRegExp(name)})\\b`,
						);

						const match = pattern.exec(content);
						if (!match) continue;

						const [, indent, declaration] = match;
						if (indent === undefined || declaration === undefined) continue;

						const reindented = getReindented(reindentCache, comment, indent);
						const prefix = match.index > 0 && content[match.index - 1] !== "\n" ? "\n" : "";

						edits.push({
							index: match.index,
							insert: `${prefix}${reindented}\n${indent}${declaration}`,
							replaceLen: match[0].length,
						});
					}

					if (edits.length === 0) continue;

					edits.sort((editA, editB) => editB.index - editA.index);
					for (const edit of edits) {
						content = `${content.slice(0, edit.index)}${edit.insert}${content.slice(edit.index + edit.replaceLen)}`;
					}

					writeFileSync(filePath, content);
				}
			});
		},
	};
}
