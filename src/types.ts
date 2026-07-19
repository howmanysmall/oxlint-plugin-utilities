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

type ReadonlyRecord<TKey extends number | string | symbol, TValue> = Readonly<Record<TKey, TValue>>;

export type RuleSchemaTypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null" | "any";

export type RuleSchemaValue =
	| string
	| number
	| boolean
	| null
	| ReadonlyArray<RuleSchemaValue>
	| { readonly [key: string]: RuleSchemaValue };

type RuleSchemaRecord = ReadonlyRecord<string, RuleSchema>;
type RuleSchemaDependencies = ReadonlyRecord<string, RuleSchema | ReadonlyArray<string>>;

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

type SchemaDefinitions = ReadonlyRecord<string, RuleSchema>;
type EmptyDefinitions = ReadonlyRecord<never, never>;
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

type SchemaDefaultKeys<TProperties extends RuleSchemaRecord> = Extract<
	{
		[TKey in Extract<keyof TProperties, string>]: TProperties[TKey] extends { readonly default: RuleSchemaValue }
			? TKey
			: never;
	}[Extract<keyof TProperties, string>],
	string
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
	? ReadonlyRecord<never, never>
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
		: ReadonlyRecord<string, unknown>;

type InferNormalizedObjectProperties<
	TProperties extends RuleSchemaRecord,
	TRequiredKeys extends string,
	TRootDefinitions extends SchemaDefinitions,
> = Simplify<
	{
		readonly [TKey in Extract<keyof TProperties, string> as TKey extends TRequiredKeys
			? TKey
			: never]-?: InferNormalizedSchemaType<TProperties[TKey], TRootDefinitions>;
	} & {
		readonly [TKey in Extract<keyof TProperties, string> as TKey extends TRequiredKeys
			? never
			: TKey]?: InferNormalizedSchemaType<TProperties[TKey], TRootDefinitions>;
	}
>;

type InferSchemaTuple<TItems extends ReadonlyArray<RuleSchema>, TRootDefinitions extends SchemaDefinitions> = {
	readonly [TIndex in keyof TItems]: InferSchemaType<TItems[TIndex], TRootDefinitions>;
};

type InferNormalizedSchemaTuple<
	TItems extends ReadonlyArray<RuleSchema>,
	TRootDefinitions extends SchemaDefinitions,
> = {
	readonly [TIndex in keyof TItems]: InferNormalizedSchemaType<TItems[TIndex], TRootDefinitions>;
};

type InferTupleRest<TAdditionalItems, TRootDefinitions extends SchemaDefinitions> = TAdditionalItems extends false
	? readonly []
	: TAdditionalItems extends RuleSchema
		? ReadonlyArray<InferSchemaType<TAdditionalItems, TRootDefinitions>>
		: ReadonlyArray<unknown>;

type InferNormalizedTupleRest<
	TAdditionalItems,
	TRootDefinitions extends SchemaDefinitions,
> = TAdditionalItems extends false
	? readonly []
	: TAdditionalItems extends RuleSchema
		? ReadonlyArray<InferNormalizedSchemaType<TAdditionalItems, TRootDefinitions>>
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

type InferNormalizedTupleSchema<
	TItems extends ReadonlyArray<RuleSchema>,
	TAdditionalItems,
	TRootDefinitions extends SchemaDefinitions,
> = TAdditionalItems extends false
	? readonly [...InferNormalizedSchemaTuple<TItems, TRootDefinitions>]
	: readonly [
			...InferNormalizedSchemaTuple<TItems, TRootDefinitions>,
			...InferNormalizedTupleRest<TAdditionalItems, TRootDefinitions>,
		];

type InferNormalizedArraySchema<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly items: infer TItems extends ReadonlyArray<RuleSchema>;
}
	? InferNormalizedTupleSchema<
			TItems,
			TSchema extends { readonly additionalItems: infer TAdditionalItems } ? TAdditionalItems : undefined,
			TRootDefinitions
		>
	: TSchema extends { readonly items: infer TItem extends RuleSchema }
		? ReadonlyArray<InferNormalizedSchemaType<TItem, TRootDefinitions>>
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

type InferNormalizedObjectSchema<TSchema, TRootDefinitions extends SchemaDefinitions> =
	SchemaPropertiesOf<TSchema> extends infer TProperties extends RuleSchemaRecord
		? ApplyDependencies<
				Simplify<
					InferNormalizedObjectProperties<
						TProperties,
						SchemaRequiredKeys<TSchema, TProperties> | SchemaDefaultKeys<TProperties>,
						TRootDefinitions
					> &
						InferObjectIndexSignature<TSchema, TProperties, TRootDefinitions>
				>,
				TSchema,
				TRootDefinitions
			>
		: ReadonlyRecord<string, unknown>;

type InferNormalizedDirectSchema<TSchema, TRootDefinitions extends SchemaDefinitions> = TSchema extends {
	readonly enum: infer TEnum extends ReadonlyArray<unknown>;
}
	? TEnum[number]
	: TSchema extends { readonly type: infer TType }
		? InferTypeSpecifier<TType, TSchema, TRootDefinitions> extends infer TInferred
			? TSchema extends { readonly properties: unknown }
				? InferNormalizedObjectSchema<TSchema, TRootDefinitions>
				: TSchema extends { readonly items: unknown }
					? InferNormalizedArraySchema<TSchema, TRootDefinitions>
					: TInferred
			: never
		: TSchema extends { readonly properties: unknown }
			? InferNormalizedObjectSchema<TSchema, TRootDefinitions>
			: TSchema extends { readonly items: unknown }
				? InferNormalizedArraySchema<TSchema, TRootDefinitions>
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

/** Infers the runtime TypeScript type from a JSON Schema definition after schema defaults are applied. */
type InferNormalizedSchemaType<
	TSchema,
	TRootDefinitions extends SchemaDefinitions = RootDefinitionsOf<TSchema>,
> = TSchema extends RuleSchema
	? SimplifyDeep<
			ApplyNot<
				InferReferenceBranch<TSchema, TRootDefinitions> &
					InferNormalizedDirectSchema<TSchema, TRootDefinitions> &
					InferAllOf<TSchema, TRootDefinitions> &
					InferExtendsBranch<TSchema, TRootDefinitions> &
					InferUnionBranches<TSchema, TRootDefinitions>,
				TSchema extends { readonly not: infer TNot extends RuleSchema }
					? InferNormalizedSchemaType<TNot, TRootDefinitions>
					: never
			>
		>
	: unknown;

/** Infers the TypeScript type from a JSON Schema property definition. */
export type InferSchemaPropertyType<
	TSchema,
	TRootDefinitions extends SchemaDefinitions = RootDefinitionsOf<TSchema>,
> = InferSchemaType<TSchema, TRootDefinitions>;

type InferSchemaTupleOptions<TSchema extends ReadonlyArray<RuleSchema>> = TSchema extends readonly [
	infer THead extends RuleSchema,
	...infer TRest extends ReadonlyArray<RuleSchema>,
]
	? readonly [InferSchemaType<THead, RootDefinitionsOf<THead>>, ...InferSchemaTupleOptions<TRest>]
	: readonly [];

type InferNormalizedSchemaTupleOptions<TSchema extends ReadonlyArray<RuleSchema>> = TSchema extends readonly [
	infer THead extends RuleSchema,
	...infer TRest extends ReadonlyArray<RuleSchema>,
]
	? readonly [InferNormalizedSchemaType<THead, RootDefinitionsOf<THead>>, ...InferNormalizedSchemaTupleOptions<TRest>]
	: readonly [];

type EmptyTuple = readonly [];

type EnsureTuple<TValue> = TValue extends ReadonlyArray<unknown> ? TValue : EmptyTuple;

type ApplyRuntimeDefaults<
	TSlots extends ReadonlyArray<unknown>,
	TDefaults extends ReadonlyArray<unknown> = EmptyTuple,
> = TSlots extends readonly [infer THead, ...infer TRest]
	? TDefaults extends readonly [unknown, ...infer TDefaultRest]
		? readonly [THead, ...ApplyRuntimeDefaults<TRest, TDefaultRest>]
		: readonly [THead | undefined, ...ApplyRuntimeDefaults<TRest>]
	: readonly [];

type RuntimeOptionsFromSchemaAndDefaults<
	TSchema extends RuleSchemaDefinition | undefined,
	TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined,
> = [TSchema] extends [undefined]
	? EmptyOptions
	: TSchema extends false
		? UnknownOptions
		: TSchema extends ReadonlyArray<RuleSchema>
			? ApplyRuntimeDefaults<InferNormalizedSchemaTupleOptions<TSchema>, EnsureTuple<TDefaultOptions>>
			: TSchema extends RuleArraySchema
				? TSchema extends { readonly items: infer TItems extends ReadonlyArray<RuleSchema> }
					? readonly [
							...ApplyRuntimeDefaults<
								InferNormalizedSchemaTuple<TItems, RootDefinitionsOf<TSchema>>,
								EnsureTuple<TDefaultOptions>
							>,
							...InferNormalizedTupleRest<
								TSchema extends { readonly additionalItems: infer TAdditionalItems }
									? TAdditionalItems
									: undefined,
								RootDefinitionsOf<TSchema>
							>,
						]
					: InferNormalizedArraySchema<TSchema, RootDefinitionsOf<TSchema>>
				: TSchema extends RuleSchema
					? TDefaultOptions extends readonly [unknown, ...ReadonlyArray<unknown>]
						? readonly [InferNormalizedSchemaType<TSchema, RootDefinitionsOf<TSchema>>]
						: readonly [InferNormalizedSchemaType<TSchema, RootDefinitionsOf<TSchema>> | undefined]
					: UnknownOptions;

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

type DeepPartialTuple<TTuple extends ReadonlyArray<unknown>> = {
	readonly [TIndex in keyof TTuple]?: PartialDeep<TTuple[TIndex]>;
};

export type DefaultOptionsFromSchema<TSchema extends RuleSchemaDefinition | undefined> = [TSchema] extends [undefined]
	? EmptyOptions
	: TSchema extends false
		? UnknownOptions
		: TSchema extends ReadonlyArray<RuleSchema>
			? DeepPartialTuple<InferSchemaTupleOptions<TSchema>>
			: TSchema extends RuleArraySchema
				? TSchema extends { readonly items: infer TItems extends ReadonlyArray<RuleSchema> }
					? DeepPartialTuple<InferSchemaTuple<TItems, RootDefinitionsOf<TSchema>>>
					: PartialDeep<InferArraySchema<TSchema, RootDefinitionsOf<TSchema>>>
				: TSchema extends RuleSchema
					? readonly [PartialDeep<InferSchemaType<TSchema, RootDefinitionsOf<TSchema>>>?]
					: UnknownOptions;

export type RuleOptions = ReadonlyArray<unknown>;

export type Diagnostic<TMessageIds extends string = string> = Readonly<Except<OxlintDiagnostic, "messageId">> & {
	readonly messageId: TMessageIds;
};

export type CustomComponent =
	| string
	| { readonly name: string; readonly attribute: string; readonly [key: string]: unknown }
	| { readonly name: string; readonly attributes: ReadonlyArray<string>; readonly [key: string]: unknown };

export type TagNamePreference =
	| string
	| { readonly message: string; readonly replacement: string }
	| { readonly message: string }
	| boolean;

// oxlint-disable-next-line small-rules/prevent-abbreviations -- it is literally called JsDoc
export interface JsDocPluginSettings {
	readonly augmentsExtendsReplacesDocs?: boolean | undefined;
	readonly exemptDestructuredRootsFromChecks?: boolean | undefined;
	readonly ignoreInternal?: boolean | undefined;
	readonly ignorePrivate?: boolean | undefined;
	readonly ignoreReplacesDocs?: boolean | undefined;
	readonly implementsReplacesDocs?: boolean | undefined;
	readonly overrideReplacesDocs?: boolean | undefined;
	readonly tagNamePreference?: ReadonlyRecord<string, TagNamePreference> | undefined;
	readonly [key: string]: unknown;
}

export interface JsxA11yPluginSettings {
	readonly attributes?: ReadonlyRecord<string, ReadonlyArray<string>> | undefined;
	readonly components?: ReadonlyRecord<string, string> | undefined;
	readonly polymorphicPropName?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface NextPluginSettings {
	readonly rootDir?: string | ReadonlyArray<string> | undefined;
	readonly [key: string]: unknown;
}

export interface ReactPluginSettings {
	readonly componentWrapperFunctions?: ReadonlyArray<string> | undefined;
	readonly formComponents?: ReadonlyArray<CustomComponent> | undefined;
	readonly linkComponents?: ReadonlyArray<CustomComponent> | undefined;
	readonly version?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface VitestPluginSettings {
	readonly typecheck?: boolean | undefined;
	readonly [key: string]: unknown;
}

export interface JestPluginSettings {
	readonly version?: number | string | null | undefined;
	readonly [key: string]: unknown;
}

export interface OxlintSettings {
	readonly jest?: JestPluginSettings | undefined;
	readonly jsdoc?: JsDocPluginSettings | undefined;
	readonly "jsx-a11y"?: JsxA11yPluginSettings | undefined;
	readonly next?: NextPluginSettings | undefined;
	readonly react?: ReactPluginSettings | undefined;
	readonly vitest?: VitestPluginSettings | undefined;
	readonly [key: string]: unknown;
}

export type Context<TOptions extends RuleOptions = EmptyOptions, TMessageIds extends string = string> = Except<
	OxlintContext,
	"options" | "report" | "settings"
> & {
	readonly options: TOptions;
	readonly settings: Readonly<OxlintSettings>;
	// oxlint-disable-next-line typescript/no-invalid-void-type typescript/method-signature-style -- mirror type
	report(this: void, diagnostic: Diagnostic<TMessageIds>): void;
};

export type InferContextFromRule<TRule> =
	TRule extends CreateRule<
		infer TSchema extends RuleSchemaDefinition | undefined,
		infer TMessageIds,
		infer TDefaultOptions
	>
		? Context<
				RuntimeOptionsFromSchemaAndDefaults<
					TSchema,
					Extract<TDefaultOptions, DefaultOptionsFromSchema<TSchema> | undefined>
				>,
				TMessageIds
			>
		: TRule extends CreateOnceRule<
					infer TSchema extends RuleSchemaDefinition | undefined,
					infer TMessageIds,
					infer TDefaultOptions
			  >
			? Context<
					RuntimeOptionsFromSchemaAndDefaults<
						TSchema,
						Extract<TDefaultOptions, DefaultOptionsFromSchema<TSchema> | undefined>
					>,
					TMessageIds
				>
			: never;

export interface RuleMeta<
	TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
	TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
> extends Readonly<Except<OxlintRuleMeta, "defaultOptions" | "messages" | "schema">> {
	readonly defaultOptions?: TDefaultOptions;
	readonly messages?: ReadonlyRecord<TMessageIds, string>;
	readonly schema?: TSchema;
}

export interface CreateRule<
	TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
	TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
> {
	readonly create: (
		context: Context<RuntimeOptionsFromSchemaAndDefaults<TSchema, TDefaultOptions>, TMessageIds>,
	) => Visitor;
	readonly meta?: RuleMeta<TSchema, TMessageIds, TDefaultOptions>;
}

export interface CreateOnceRule<
	TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
	TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
> {
	readonly create?: (
		context: Context<RuntimeOptionsFromSchemaAndDefaults<TSchema, TDefaultOptions>, TMessageIds>,
	) => Visitor;
	readonly createOnce: (
		context: Context<RuntimeOptionsFromSchemaAndDefaults<TSchema, TDefaultOptions>, TMessageIds>,
	) => VisitorWithHooks;
	readonly meta?: RuleMeta<TSchema, TMessageIds, TDefaultOptions>;
}

export type Rule<
	TSchema extends RuleSchemaDefinition | undefined = undefined,
	TMessageIds extends string = string,
	TDefaultOptions extends DefaultOptionsFromSchema<TSchema> | undefined = undefined,
> = CreateOnceRule<TSchema, TMessageIds, TDefaultOptions> | CreateRule<TSchema, TMessageIds, TDefaultOptions>;

export interface Plugin<TRules extends ReadonlyRecord<string, OxlintRule | Rule>> {
	readonly meta?: { readonly name?: string };
	readonly rules: TRules;
}
