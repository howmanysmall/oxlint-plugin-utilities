/* oxlint-disable eslint(max-lines) */

import type {
	Context as OxlintContext,
	Diagnostic as OxlintDiagnostic,
	Rule as OxlintRule,
	RuleMeta as OxlintRuleMeta,
	Visitor,
	VisitorWithHooks,
} from "@oxlint/plugins";
import type {
	Except,
	IsOptionalKeyOf,
	PartialDeep,
	SetRequired,
	Simplify,
	SimplifyDeep,
	UnionToIntersection,
} from "type-fest";

export type RuleSchemaTypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null" | "any";

export type RuleSchemaValue =
	| string
	| number
	| boolean
	| null
	| ReadonlyArray<RuleSchemaValue>
	| { readonly [key: string]: RuleSchemaValue };

type RuleSchemaRecord = Readonly<Record<string, RuleSchema>>;
type RuleSchemaDependencies = Readonly<Record<string, RuleSchema | ReadonlyArray<string>>>;

interface RuleSchemaCommon {
	readonly $ref?: string;
	readonly $schema?: string;
	readonly allOf?: ReadonlyArray<RuleSchema>;
	readonly anyOf?: ReadonlyArray<RuleSchema>;
	readonly default?: RuleSchemaValue;
	readonly definitions?: RuleSchemaRecord;
	readonly description?: string;
	readonly enum?: ReadonlyArray<RuleSchemaValue>;
	readonly extends?: string | ReadonlyArray<string>;
	readonly format?: string;
	readonly id?: string;
	readonly not?: RuleSchema;
	readonly oneOf?: ReadonlyArray<RuleSchema>;
	readonly title?: string;
}

interface RuleStringSchema extends RuleSchemaCommon {
	readonly maxLength?: number;
	readonly minLength?: number;
	readonly pattern?: string;
	readonly type: "string";
}

interface RuleNumberSchema extends RuleSchemaCommon {
	readonly exclusiveMaximum?: boolean;
	readonly exclusiveMinimum?: boolean;
	readonly maximum?: number;
	readonly minimum?: number;
	readonly multipleOf?: number;
	readonly type: "number";
}

interface RuleIntegerSchema extends RuleSchemaCommon {
	readonly exclusiveMaximum?: boolean;
	readonly exclusiveMinimum?: boolean;
	readonly maximum?: number;
	readonly minimum?: number;
	readonly multipleOf?: number;
	readonly type: "integer";
}

interface RuleBooleanSchema extends RuleSchemaCommon {
	readonly type: "boolean";
}

interface RuleNullSchema extends RuleSchemaCommon {
	readonly type: "null";
}

export interface RuleObjectSchema extends RuleSchemaCommon {
	readonly additionalProperties?: boolean | RuleSchema;
	readonly dependencies?: RuleSchemaDependencies;
	readonly maxProperties?: number;
	readonly minProperties?: number;
	readonly patternProperties?: RuleSchemaRecord;
	readonly properties?: RuleSchemaRecord;
	readonly required?: boolean | ReadonlyArray<string>;
	readonly type: "object";
}

export interface RuleArraySchema extends RuleSchemaCommon {
	readonly additionalItems?: boolean | RuleSchema;
	readonly items?: RuleSchema | ReadonlyArray<RuleSchema>;
	readonly maxItems?: number;
	readonly minItems?: number;
	readonly type: "array";
	readonly uniqueItems?: boolean;
}

interface RuleAnySchema extends RuleSchemaCommon {
	readonly type: "any";
}

interface RuleMultiTypeSchema extends RuleSchemaCommon {
	readonly additionalItems?: boolean | RuleSchema;
	readonly additionalProperties?: boolean | RuleSchema;
	readonly dependencies?: RuleSchemaDependencies;
	readonly items?: RuleSchema | ReadonlyArray<RuleSchema>;
	readonly patternProperties?: RuleSchemaRecord;
	readonly properties?: RuleSchemaRecord;
	readonly required?: boolean | ReadonlyArray<string>;
	readonly type: ReadonlyArray<RuleSchemaTypeName>;
}

interface RuleLooseSchema extends RuleSchemaCommon {
	readonly additionalItems?: boolean | RuleSchema;
	readonly additionalProperties?: boolean | RuleSchema;
	readonly dependencies?: RuleSchemaDependencies;
	readonly items?: RuleSchema | ReadonlyArray<RuleSchema>;
	readonly patternProperties?: RuleSchemaRecord;
	readonly properties?: RuleSchemaRecord;
	readonly required?: boolean | ReadonlyArray<string>;
	readonly type?: undefined;
}

interface RuleCustomTypeSchema extends RuleSchemaCommon {
	readonly additionalItems?: boolean | RuleSchema;
	readonly additionalProperties?: boolean | RuleSchema;
	readonly dependencies?: RuleSchemaDependencies;
	readonly items?: RuleSchema | ReadonlyArray<RuleSchema>;
	readonly patternProperties?: RuleSchemaRecord;
	readonly properties?: RuleSchemaRecord;
	readonly required?: boolean | ReadonlyArray<string>;
	readonly type: string | ReadonlyArray<string>;
}

export type RuleSchema =
	| RuleAnySchema
	| RuleArraySchema
	| RuleBooleanSchema
	| RuleCustomTypeSchema
	| RuleIntegerSchema
	| RuleLooseSchema
	| RuleMultiTypeSchema
	| RuleNullSchema
	| RuleNumberSchema
	| RuleObjectSchema
	| RuleStringSchema;

export type RuleSchemaDefinition = false | RuleSchema | ReadonlyArray<RuleSchema>;

type SchemaDefinitions = Readonly<Record<string, RuleSchema>>;
type EmptyDefinitions = Readonly<Record<never, never>>;
type EmptyOptions = readonly [];
type UnknownOptions = ReadonlyArray<unknown>;

type RootDefinitionsOf<TSchema> = TSchema extends { readonly definitions: infer TDefinitions extends SchemaDefinitions }
	? TDefinitions
	: EmptyDefinitions;

type LocalReferenceName<TReference extends string> = TReference extends `#/definitions/${infer TName}` ? TName : never;

type ResolveReference<TReference extends string, TRootDefinitions extends SchemaDefinitions> =
	LocalReferenceName<TReference> extends infer TName extends keyof TRootDefinitions
		? TRootDefinitions[TName]
		: unknown;

type OptionalizeNever<TValue> = [TValue] extends [never] ? unknown : TValue;

type InferAllOf<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly allOf: infer TAllOf extends ReadonlyArray<RuleSchema>;
}
	? UnionToIntersection<InferSchemaType<TAllOf[number], TRootDefinitions>>
	: unknown;

type InferAnyOf<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly anyOf: infer TAnyOf extends ReadonlyArray<RuleSchema>;
}
	? InferSchemaType<TAnyOf[number], TRootDefinitions>
	: never;

type InferOneOf<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly oneOf: infer TOneOf extends ReadonlyArray<RuleSchema>;
}
	? InferSchemaType<TOneOf[number], TRootDefinitions>
	: never;

type InferUnionBranches<TSchema, TRootDefinitions extends SchemaDefinitions> = OptionalizeNever<
	InferAnyOf<TSchema, TRootDefinitions> | InferOneOf<TSchema, TRootDefinitions>
>;

type InferReferenceBranch<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly $ref: infer TReference extends string;
}
	? InferSchemaType<ResolveReference<TReference, TRootDefinitions>, TRootDefinitions>
	: unknown;

type InferExtendsBranch<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly extends: infer TExtends;
}
	? TExtends extends ReadonlyArray<string>
		? UnionToIntersection<
				InferSchemaType<ResolveReference<Extract<TExtends[number], string>, TRootDefinitions>, TRootDefinitions>
			>
		: TExtends extends string
			? InferSchemaType<ResolveReference<TExtends, TRootDefinitions>, TRootDefinitions>
			: unknown
	: unknown;

type InferTypeFromName<
	TTypeName extends RuleSchemaTypeName,
	TSchema,
	TRootDefinitions extends SchemaDefinitions,
> = TTypeName extends "string"
	? string
	: TTypeName extends "number" | "integer"
		? number
		: TTypeName extends "boolean"
			? boolean
			: TTypeName extends "null"
				? null
				: TTypeName extends "object"
					? InferObjectSchema<TSchema, TRootDefinitions>
					: TTypeName extends "array"
						? InferArraySchema<TSchema, TRootDefinitions>
						: unknown;

type InferTypeSpecifier<TType, TSchema, TRootDefinitions extends SchemaDefinitions> =
	TType extends ReadonlyArray<RuleSchemaTypeName>
		? InferTypeFromName<TType[number], TSchema, TRootDefinitions>
		: TType extends RuleSchemaTypeName
			? InferTypeFromName<TType, TSchema, TRootDefinitions>
			: unknown;

type SchemaPropertiesOf<TSchema> = TSchema extends { readonly properties: infer TProperties extends RuleSchemaRecord }
	? TProperties
	: EmptyDefinitions;

type SchemaRequiredKeys<TSchema, TProperties extends RuleSchemaRecord> = TSchema extends {
	readonly required: infer TRequired;
}
	? TRequired extends ReadonlyArray<unknown>
		? Extract<TRequired[number], Extract<keyof TProperties, string>>
		: never
	: never;

type InferObjectProperties<
	TProperties extends RuleSchemaRecord,
	TRequiredKeys extends string,
	TRootDefinitions extends SchemaDefinitions,
> = Simplify<
	{
		readonly [TKey in Extract<keyof TProperties, string> as TKey extends TRequiredKeys
			? TKey
			: never]-?: InferSchemaType<TProperties[TKey], TRootDefinitions>;
	} & {
		readonly [TKey in Extract<keyof TProperties, string> as TKey extends TRequiredKeys
			? never
			: TKey]?: InferSchemaType<TProperties[TKey], TRootDefinitions>;
	}
>;

type InferPatternPropertyValue<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly patternProperties: infer TPatternProperties extends RuleSchemaRecord;
}
	? InferSchemaType<TPatternProperties[keyof TPatternProperties], TRootDefinitions>
	: never;

type InferAdditionalPropertyValue<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly additionalProperties: infer TAdditionalProperties;
}
	? TAdditionalProperties extends false
		? never
		: TAdditionalProperties extends RuleSchema
			? InferSchemaType<TAdditionalProperties, TRootDefinitions>
			: unknown
	: never;

type InferKnownPropertyValue<TProperties extends RuleSchemaRecord, TRootDefinitions extends SchemaDefinitions> = [
	keyof TProperties,
] extends [never]
	? never
	: InferSchemaType<TProperties[keyof TProperties], TRootDefinitions>;

type InferObjectIndexSignature<
	TSchema,
	TProperties extends RuleSchemaRecord,
	TRootDefinitions extends SchemaDefinitions,
> = [
	InferPatternPropertyValue<TSchema, TRootDefinitions> | InferAdditionalPropertyValue<TSchema, TRootDefinitions>,
] extends [never]
	? Record<never, never>
	: {
			readonly [key: string]:
				| InferKnownPropertyValue<TProperties, TRootDefinitions>
				| InferPatternPropertyValue<TSchema, TRootDefinitions>
				| InferAdditionalPropertyValue<TSchema, TRootDefinitions>;
		};

type RequireKnownKeys<TObject, TKeys extends string> =
	Extract<TKeys, keyof TObject> extends never ? TObject : SetRequired<TObject, Extract<TKeys, keyof TObject>>;

type DependencyMapOf<TSchema> = TSchema extends {
	readonly dependencies: infer TDependencies extends RuleSchemaDependencies;
}
	? TDependencies
	: EmptyDefinitions;

type DependencyRequiredKeys<TObject, TDependencies> = Extract<
	{
		[TKey in Extract<keyof TDependencies, string>]: TDependencies[TKey] extends ReadonlyArray<unknown>
			? Extract<TDependencies[TKey][number], Extract<keyof TObject, string>>
			: never;
	}[Extract<keyof TDependencies, string>],
	string
>;

type DependencySchemaOverlay<TDependencies, TRootDefinitions extends SchemaDefinitions> = Simplify<
	UnionToIntersection<
		{
			[TKey in Extract<keyof TDependencies, string>]: TDependencies[TKey] extends RuleSchema
				? InferSchemaType<TDependencies[TKey], TRootDefinitions>
				: unknown;
		}[Extract<keyof TDependencies, string>]
	>
>;

type OptionalDependencySourceKeys<TObject extends object, TDependencies> = Extract<
	{
		[TKey in Extract<keyof TDependencies, string> & Extract<keyof TObject, string>]: IsOptionalKeyOf<
			TObject,
			TKey
		> extends true
			? TKey
			: never;
	}[Extract<keyof TDependencies, string> & Extract<keyof TObject, string>],
	string
>;

type ApplyDependencies<TObject extends object, TSchema, TRootDefinitions extends SchemaDefinitions> =
	DependencyMapOf<TSchema> extends infer TDependencies
		? keyof TDependencies extends never
			? TObject
			: OptionalDependencySourceKeys<TObject, TDependencies> extends never
				? Simplify<
						RequireKnownKeys<TObject, DependencyRequiredKeys<TObject, TDependencies>> &
							DependencySchemaOverlay<TDependencies, TRootDefinitions>
					>
				: Simplify<
						| (TObject & DependencySchemaOverlay<TDependencies, TRootDefinitions>)
						| (RequireKnownKeys<
								TObject,
								| OptionalDependencySourceKeys<TObject, TDependencies>
								| DependencyRequiredKeys<TObject, TDependencies>
						  > &
								DependencySchemaOverlay<TDependencies, TRootDefinitions>)
					>
		: TObject;

type InferObjectSchema<TSchema, TRootDefinitions extends SchemaDefinitions> =
	SchemaPropertiesOf<TSchema> extends infer TProperties extends RuleSchemaRecord
		? ApplyDependencies<
				Simplify<
					InferObjectProperties<TProperties, SchemaRequiredKeys<TSchema, TProperties>, TRootDefinitions> &
						InferObjectIndexSignature<TSchema, TProperties, TRootDefinitions>
				>,
				TSchema,
				TRootDefinitions
			>
		: Record<string, unknown>;

type InferSchemaTuple<TItems extends ReadonlyArray<RuleSchema>, TRootDefinitions extends SchemaDefinitions> = {
	readonly [TIndex in keyof TItems]: InferSchemaType<TItems[TIndex], TRootDefinitions>;
};

type InferTupleRest<TAdditionalItems, TRootDefinitions extends SchemaDefinitions> = TAdditionalItems extends false
	? readonly []
	: TAdditionalItems extends RuleSchema
		? ReadonlyArray<InferSchemaType<TAdditionalItems, TRootDefinitions>>
		: ReadonlyArray<unknown>;

type InferTupleSchema<
	TItems extends ReadonlyArray<RuleSchema>,
	TAdditionalItems,
	TRootDefinitions extends SchemaDefinitions,
> = TAdditionalItems extends false
	? readonly [...InferSchemaTuple<TItems, TRootDefinitions>]
	: readonly [...InferSchemaTuple<TItems, TRootDefinitions>, ...InferTupleRest<TAdditionalItems, TRootDefinitions>];

type InferArraySchema<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly items: infer TItems extends ReadonlyArray<RuleSchema>;
}
	? InferTupleSchema<
			TItems,
			TSchema extends { readonly additionalItems: infer TAdditionalItems } ? TAdditionalItems : undefined,
			TRootDefinitions
		>
	: TSchema extends { readonly items: infer TItem extends RuleSchema }
		? ReadonlyArray<InferSchemaType<TItem, TRootDefinitions>>
		: UnknownOptions;

type InferDirectSchema<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly enum: infer TEnum extends ReadonlyArray<unknown>;
}
	? TEnum[number]
	: TSchema extends { readonly type: infer TType }
		? InferTypeSpecifier<TType, TSchema, TRootDefinitions>
		: TSchema extends { readonly properties: unknown }
			? InferObjectSchema<TSchema, TRootDefinitions>
			: TSchema extends { readonly items: unknown }
				? InferArraySchema<TSchema, TRootDefinitions>
				: unknown;

type FiniteExclusion<TValue, TExcluded> =
	Exclude<TValue, TExcluded> extends never ? unknown : Exclude<TValue, TExcluded>;

type ApplyNot<TValue, TNotValue> = [TNotValue] extends [never]
	? TValue
	: unknown extends TNotValue
		? TValue
		: FiniteExclusion<TValue, TNotValue>;

/** Infers the TypeScript type from a JSON Schema definition. */
export type InferSchemaType<
	TSchema,
	TRootDefinitions extends SchemaDefinitions = RootDefinitionsOf<TSchema>,
> = TSchema extends RuleSchema
	? SimplifyDeep<
			ApplyNot<
				InferReferenceBranch<TSchema, TRootDefinitions> &
					InferDirectSchema<TSchema, TRootDefinitions> &
					InferAllOf<TSchema, TRootDefinitions> &
					InferExtendsBranch<TSchema, TRootDefinitions> &
					InferUnionBranches<TSchema, TRootDefinitions>,
				TSchema extends { readonly not: infer TNot extends RuleSchema }
					? InferSchemaType<TNot, TRootDefinitions>
					: never
			>
		>
	: unknown;

/** Infers the TypeScript type from a JSON Schema property definition. */
export type InferSchemaPropertyType<
	TSchema,
	TRootDefinitions extends SchemaDefinitions = RootDefinitionsOf<TSchema>,
> = InferSchemaType<TSchema, TRootDefinitions>;

type InferSchemaTupleOptions<TSchema extends ReadonlyArray<RuleSchema>> = {
	readonly [TIndex in keyof TSchema]: InferSchemaType<TSchema[TIndex], RootDefinitionsOf<TSchema[TIndex]>>;
};

/** Infers the options type from a rule schema definition. */
export type InferOptionsFromSchema<TSchema extends RuleSchemaDefinition | undefined> = [TSchema] extends [undefined]
	? EmptyOptions
	: TSchema extends false
		? UnknownOptions
		: TSchema extends ReadonlyArray<RuleSchema>
			? InferSchemaTupleOptions<TSchema>
			: TSchema extends RuleArraySchema
				? InferArraySchema<TSchema, RootDefinitionsOf<TSchema>>
				: TSchema extends RuleSchema
					? readonly [InferSchemaType<TSchema, RootDefinitionsOf<TSchema>>]
					: UnknownOptions;

export type RuleOptions = ReadonlyArray<unknown>;

export type Diagnostic<TMessageIds extends string = string> = Readonly<Except<OxlintDiagnostic, "messageId">> & {
	readonly messageId: TMessageIds;
};

export type Context<TOptions extends RuleOptions = EmptyOptions, TMessageIds extends string = string> = Except<
	OxlintContext,
	"options" | "report"
> & {
	readonly options: TOptions;
	// oxlint-disable-next-line typescript/no-invalid-void-type
	report(this: void, diagnostic: Diagnostic<TMessageIds>): void;
};

export type InferContextFromRule<TRule> =
	TRule extends CreateRule<infer TOptions, infer TMessageIds, infer _TSchema extends RuleSchemaDefinition | undefined>
		? Context<TOptions, TMessageIds>
		: TRule extends CreateOnceRule<
					infer TOptions,
					infer TMessageIds,
					infer _TSchema extends RuleSchemaDefinition | undefined
			  >
			? Context<TOptions, TMessageIds>
			: never;

export interface RuleMeta<
	TMessageIds extends string = string,
	TSchema extends RuleSchemaDefinition | undefined = undefined,
> extends Readonly<Except<OxlintRuleMeta, "defaultOptions" | "messages" | "schema">> {
	readonly defaultOptions?: PartialDeep<InferOptionsFromSchema<TSchema>>;
	readonly messages?: Record<TMessageIds, string>;
	readonly schema?: TSchema;
}

export interface CreateRule<
	TOptions extends RuleOptions = EmptyOptions,
	TMessageIds extends string = string,
	TSchema extends RuleSchemaDefinition | undefined = undefined,
> {
	readonly create: (context: Context<TOptions, TMessageIds>) => Visitor;
	readonly meta?: RuleMeta<TMessageIds, TSchema>;
}

export interface CreateOnceRule<
	TOptions extends RuleOptions = EmptyOptions,
	TMessageIds extends string = string,
	TSchema extends RuleSchemaDefinition | undefined = undefined,
> {
	readonly create?: (context: Context<TOptions, TMessageIds>) => Visitor;
	readonly createOnce: (context: Context<TOptions, TMessageIds>) => VisitorWithHooks;
	readonly meta?: RuleMeta<TMessageIds, TSchema>;
}

export type Rule<
	TOptions extends RuleOptions = EmptyOptions,
	TMessageIds extends string = string,
	TSchema extends RuleSchemaDefinition | undefined = undefined,
> = CreateOnceRule<TOptions, TMessageIds, TSchema> | CreateRule<TOptions, TMessageIds, TSchema>;

export interface Plugin<TRules extends Record<string, OxlintRule | Rule>> {
	readonly meta?: { readonly name?: string };
	readonly rules: TRules;
}
