import { execFileSync } from "node:child_process";
import { lookpath } from "lookpath";
import { Temporal } from "temporal-polyfill";

import type { TsdownPlugin } from "tsdown";

interface BuildMetadataOptions {
	readonly version: string;
}

function stringifyUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function getGitCommitAsync(): Promise<string> {
	try {
		const gitPath = await lookpath("git");
		if (gitPath === undefined) {
			console.warn("[build-metadata] Failed to find Git (somehow?)");
			return "unknown";
		}
		return execFileSync(gitPath, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
	} catch (error) {
		console.warn(`[build-metadata] Failed to read git commit - ${stringifyUnknownError(error)}`);
		return "unknown";
	}
}

export function createBuildMetadataPlugin({ version }: BuildMetadataOptions): TsdownPlugin {
	return {
		// oxlint-disable-next-line small-rules/require-async-suffix -- not in my control.
		async generateBundle(): Promise<void> {
			const commit = await getGitCommitAsync();
			const metadata = {
				commit,
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
