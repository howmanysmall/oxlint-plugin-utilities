import type { CreateOnceRule, CreateRule, InferOptionsFromSchema, Rule, RuleSchemaDefinition } from "./types";

/**
 * Define a rule.
 *
 * No-op function, just to provide type safety. Input is passed through unchanged.
 *
 * The options tuple is inferred from `meta.schema`, message IDs are inferred from `meta.messages`, and the returned
 * rule preserves whether the input used `create` or `createOnce`.
 */
export function defineRule<
	const TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
>(
	rule: CreateRule<InferOptionsFromSchema<TSchema>, TMessageIds, TSchema>,
): CreateRule<InferOptionsFromSchema<TSchema>, TMessageIds, TSchema>;
export function defineRule<
	const TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
>(
	rule: CreateOnceRule<InferOptionsFromSchema<TSchema>, TMessageIds, TSchema>,
): CreateOnceRule<InferOptionsFromSchema<TSchema>, TMessageIds, TSchema>;
export function defineRule(rule: Rule): Rule {
	return rule;
}
