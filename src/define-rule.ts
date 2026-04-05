import type { Rule } from "./types";

/**
 * Define a rule.
 *
 * No-op function, just to provide type safety. Input is passed through unchanged. This is a stronger typed version of
 * the original defineRule.
 *
 * @template TOptions - The rule options type
 * @template TMessageIds - The message IDs type
 * @param rule - Rule to define
 * @returns Same rule as passed in
 */
export function defineRule<TOptions, TMessageIds extends string>(
	rule: Rule<TOptions, TMessageIds>,
): Rule<TOptions, TMessageIds> {
	return rule;
}
