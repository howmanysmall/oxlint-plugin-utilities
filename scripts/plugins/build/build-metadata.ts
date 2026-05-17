import { execFileSync } from "node:child_process";
import { Temporal } from "temporal-polyfill";

import type { TsdownPlugin } from "tsdown";

interface BuildMetadataOptions {
	readonly version: string;
}

function stringifyUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getGitCommit(): string {
	try {
		return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	} catch (error) {
		console.warn(`[build-metadata] Failed to read git commit - ${stringifyUnknownError(error)}`);
		return "unknown";
	}
}

export function createBuildMetadataPlugin({ version }: BuildMetadataOptions): TsdownPlugin {
	return {
		generateBundle() {
			const metadata = {
				commit: getGitCommit(),
				time: Temporal.Now.instant().toString({ smallestUnit: "millisecond" }),
				version,
			};

			this.emitFile({
				fileName: "build-metadata.json",
				source: JSON.stringify(metadata, undefined, 2),
				type: "asset",
			});
		},
		name: "build-metadata",
	};
}
