import type { InferOptionsFromSchema, Rule } from "./types";

/**
 * Define a rule.
 *
 * No-op function, just to provide type safety. Input is passed through unchanged. This is a stronger typed version of
 * the original defineRule.
 *
 * The options type (`TOptions`) is automatically inferred from the rule's `meta.schema` definition. When no schema is
 * provided, `TOptions` defaults to `Record<string, never>`.
 *
 * @template TSchema - The inferred schema tuple type (preserved literally via `const`)
 * @template TMessageIds - The message IDs type
 * @param rule - Rule to define
 * @returns Same rule as passed in
 */
export function defineRule<
	const TSchema extends ReadonlyArray<unknown> = ReadonlyArray<unknown>,
	TMessageIds extends string = string,
>(
	rule: Rule<InferOptionsFromSchema<TSchema>, TMessageIds, TSchema>,
): Rule<InferOptionsFromSchema<TSchema>, TMessageIds> {
	return rule as Rule<InferOptionsFromSchema<TSchema>, TMessageIds>;
}
