import type { Rule as OxlintRule } from "@oxlint/plugins";

import type { Plugin, Rule } from "./types";

/**
 * Define a plugin.
 *
 * No-op function, just to provide type safety. Input is passed through unchanged. This is a stronger typed version of
 * the original definePlugin.
 *
 * @template TRules - The rules of the plugin
 * @param plugin - Plugin to define
 * @returns Same plugin as passed in
 */
// oxlint-disable-next-line no-explicit-any
export function definePlugin<TRules extends Record<string, OxlintRule | Rule<any, any, any>>>(
	plugin: Plugin<TRules>,
): Plugin<TRules> {
	return plugin;
}
