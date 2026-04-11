import type {
	Context as OxlintContext,
	Diagnostic as OxlintDiagnostic,
	Rule as OxlintRule,
	RuleMeta as OxlintRuleMeta,
	Visitor,
	VisitorWithHooks,
} from "@oxlint/plugins";
import type { Except } from "type-fest";

/**
 * Infers the TypeScript type from a JSON Schema property definition.
 *
 * Handles string, number, integer, boolean, null, and array types with enum support.
 *
 * @internal
 */
export type InferSchemaPropertyType<TString> = TString extends {
	readonly type: "string";
	readonly enum: ReadonlyArray<infer TValue>;
}
	? Extract<TValue, string>
	: TString extends { readonly type: "string" }
		? string
		: TString extends { readonly type: "number"; readonly enum: ReadonlyArray<infer TValue> }
			? Extract<TValue, number>
			: TString extends { readonly type: "number" }
				? number
				: TString extends { readonly type: "integer"; readonly enum: ReadonlyArray<infer TValue> }
					? Extract<TValue, number>
					: TString extends { readonly type: "integer" }
						? number
						: TString extends { readonly type: "boolean" }
							? boolean
							: TString extends { readonly type: "null" }
								? null
								: TString extends { readonly type: "array"; readonly items: infer TItems }
									? ReadonlyArray<InferSchemaType<TItems>>
									: unknown;

/**
 * Infers the TypeScript type from a JSON Schema definition.
 *
 * Handles object types with properties, falling back to property type inference for primitives.
 *
 * @internal
 */
export type InferSchemaType<TSchema> = TSchema extends {
	readonly type: "object";
	readonly properties: infer TProperties;
}
	? { [TKey in keyof TProperties]: InferSchemaPropertyType<TProperties[TKey]> }
	: InferSchemaPropertyType<TSchema>;

/**
 * Infers the options type from a rule's schema tuple.
 *
 * Extracts the type from the first schema element, or defaults to `Record<string, never>` when the schema is empty or
 * absent.
 */
export type InferOptionsFromSchema<TSchema extends ReadonlyArray<unknown>> = TSchema extends readonly [
	infer First,
	...Array<unknown>,
]
	? InferSchemaType<First>
	: Record<string, never>;

export type RuleOptions<TRecord = Record<string, never>> = readonly [TRecord];

export type Diagnostic<TMessageIds extends string = string> = Readonly<Except<OxlintDiagnostic, "messageId">> & {
	readonly messageId: TMessageIds;
};

export type Context<TOptions, TMessageIds extends string = string> = Except<OxlintContext, "options" | "report"> & {
	readonly options: RuleOptions<TOptions>;
	// oxlint-disable-next-line typescript/no-invalid-void-type
	report(this: void, diagnostic: Diagnostic<TMessageIds>): void;
};

export type InferContextFromRule<TRule> =
	TRule extends CreateRule<infer TOptions, infer TMessageIds>
		? Context<TOptions, TMessageIds>
		: TRule extends CreateOnceRule<infer TOptions, infer TMessageIds>
			? Context<TOptions, TMessageIds>
			: never;

export interface RuleMeta<TMessageIds extends string = string, TSchema = ReadonlyArray<unknown>> extends Readonly<
	Except<OxlintRuleMeta, "messages" | "schema">
> {
	readonly messages?: Record<TMessageIds, string>;
	readonly schema?: TSchema;
}

export interface CreateRule<
	TOptions = Record<string, never>,
	TMessageIds extends string = string,
	TSchema = ReadonlyArray<unknown>,
> {
	readonly create: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => Visitor;
	readonly meta?: RuleMeta<TMessageIds, TSchema>;
}

export interface CreateOnceRule<
	TOptions = Record<string, never>,
	TMessageIds extends string = string,
	TSchema = ReadonlyArray<unknown>,
> {
	readonly create?: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => Visitor;
	readonly createOnce: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => VisitorWithHooks;
	readonly meta?: RuleMeta<TMessageIds, TSchema>;
}

export type Rule<
	TOptions = Record<string, never>,
	TMessageIds extends string = string,
	TSchema = ReadonlyArray<unknown>,
> = CreateOnceRule<TOptions, TMessageIds, TSchema> | CreateRule<TOptions, TMessageIds, TSchema>;

export interface Plugin<TRules extends Record<string, OxlintRule | Rule>> {
	readonly meta?: { readonly name?: string };
	readonly rules: TRules;
}
