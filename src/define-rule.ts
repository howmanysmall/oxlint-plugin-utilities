import type { CreateOnceRule, CreateRule, DefaultOptionsFromSchema, Rule, RuleSchemaDefinition } from "./types";

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
	const TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
>(rule: CreateRule<TSchema, TMessageIds, TDefaultOptions>): CreateRule<TSchema, TMessageIds, TDefaultOptions>;
export function defineRule<
	const TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
	const TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
>(rule: CreateOnceRule<TSchema, TMessageIds, TDefaultOptions>): CreateOnceRule<TSchema, TMessageIds, TDefaultOptions>;
export function defineRule(rule: Rule): Rule {
	return rule;
}
