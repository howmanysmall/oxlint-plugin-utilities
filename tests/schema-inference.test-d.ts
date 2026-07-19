import { describe, expectTypeOf, it } from "vitest";

import type {
	DefaultOptionsFromSchema,
	InferOptionsFromSchema,
	InferSchemaPropertyType,
	InferSchemaType,
	RuleSchema,
	RuleSchemaDefinition,
	RuleSchemaTypeName,
} from "#src";

describe("schema type inference", () => {
	it("maps every built-in schema type", () => {
		expectTypeOf<InferSchemaType<{ readonly type: "string" }>>().toEqualTypeOf<string>();
		expectTypeOf<InferSchemaType<{ readonly type: "number" }>>().toEqualTypeOf<number>();
		expectTypeOf<InferSchemaType<{ readonly type: "integer" }>>().toEqualTypeOf<number>();
		expectTypeOf<InferSchemaType<{ readonly type: "boolean" }>>().toEqualTypeOf<boolean>();
		expectTypeOf<InferSchemaType<{ readonly type: "null" }>>().toEqualTypeOf<null>();
		expectTypeOf<InferSchemaType<{ readonly type: "any" }>>().toEqualTypeOf<unknown>();
		expectTypeOf<RuleSchemaTypeName>().toEqualTypeOf<
			"any" | "array" | "boolean" | "integer" | "null" | "number" | "object" | "string"
		>();
		expectTypeOf<InferSchemaPropertyType<{ readonly enum: readonly ["a", "b"] }>>().toEqualTypeOf<"a" | "b">();
	});

	it("combines references and composition keywords", () => {
		const referencedSchema = {
			$ref: "#/definitions/entity",
			definitions: {
				entity: {
					properties: {
						id: { type: "string" },
					},
					required: ["id"],
					type: "object",
				},
			},
		} as const satisfies RuleSchema;
		const allOfSchema = {
			allOf: [
				{
					properties: { id: { type: "string" } },
					required: ["id"],
					type: "object",
				},
				{
					properties: { count: { type: "integer" } },
					required: ["count"],
					type: "object",
				},
			],
		} as const satisfies RuleSchema;
		const anyOfSchema = {
			anyOf: [{ type: "string" }, { type: "number" }],
		} as const satisfies RuleSchema;
		const oneOfSchema = {
			oneOf: [{ type: "boolean" }, { type: "null" }],
		} as const satisfies RuleSchema;
		const extendsSchema = {
			definitions: {
				counted: {
					properties: { count: { type: "integer" } },
					required: ["count"],
					type: "object",
				},
				named: {
					properties: { name: { type: "string" } },
					required: ["name"],
					type: "object",
				},
			},
			extends: ["#/definitions/named", "#/definitions/counted"],
		} as const satisfies RuleSchema;

		expectTypeOf<InferSchemaType<typeof referencedSchema>>().toEqualTypeOf<{ readonly id: string }>();
		expectTypeOf<InferSchemaType<typeof allOfSchema>>().toEqualTypeOf<{
			readonly count: number;
			readonly id: string;
		}>();
		expectTypeOf<InferSchemaType<typeof anyOfSchema>>().toEqualTypeOf<number | string>();
		expectTypeOf<InferSchemaType<typeof oneOfSchema>>().toEqualTypeOf<boolean | null>();
		expectTypeOf<InferSchemaType<typeof extendsSchema>>().toEqualTypeOf<{
			readonly count: number;
			readonly name: string;
		}>();
		expectTypeOf<InferSchemaType<{ readonly $ref: "https://example.com/schema" }>>().toEqualTypeOf<unknown>();
	});

	it("intersects direct, union, and exclusion constraints", () => {
		const schema = {
			anyOf: [
				{ enum: ["warn"], type: "string" },
				{ enum: ["info"], type: "string" },
			],
			enum: ["error", "warn"],
			not: { enum: ["error"], type: "string" },
			type: "string",
		} as const satisfies RuleSchema;

		expectTypeOf<InferSchemaType<typeof schema>>().toEqualTypeOf<"warn">();
	});

	it("preserves required object properties and open index signatures", () => {
		const objectSchema = {
			additionalProperties: false,
			properties: {
				enabled: { type: "boolean" },
				name: { type: "string" },
			},
			required: ["name"],
			type: "object",
		} as const satisfies RuleSchema;
		const dictionarySchema = {
			additionalProperties: { type: "number" },
			type: "object",
		} as const satisfies RuleSchema;

		expectTypeOf<InferSchemaType<typeof objectSchema>>().toEqualTypeOf<{
			readonly enabled?: boolean;
			readonly name: string;
		}>();
		expectTypeOf<InferSchemaType<typeof dictionarySchema>>().toEqualTypeOf<Readonly<Record<string, number>>>();
	});

	it("distinguishes homogeneous arrays, closed tuples, and open tuples", () => {
		const homogeneousSchema = {
			items: { type: "boolean" },
			type: "array",
		} as const satisfies RuleSchema;
		const closedTupleSchema = {
			additionalItems: false,
			items: [{ type: "string" }, { type: "integer" }],
			type: "array",
		} as const satisfies RuleSchema;
		const openTupleSchema = {
			items: [{ type: "string" }],
			type: "array",
		} as const satisfies RuleSchema;
		const unknownArraySchema = {
			type: "array",
		} as const satisfies RuleSchema;

		expectTypeOf<InferSchemaType<typeof homogeneousSchema>>().toEqualTypeOf<ReadonlyArray<boolean>>();
		expectTypeOf<InferOptionsFromSchema<typeof closedTupleSchema>>().toEqualTypeOf<readonly [string, number]>();
		expectTypeOf<InferOptionsFromSchema<typeof openTupleSchema>>().toEqualTypeOf<
			readonly [string, ...ReadonlyArray<unknown>]
		>();
		expectTypeOf<InferOptionsFromSchema<typeof unknownArraySchema>>().toEqualTypeOf<ReadonlyArray<unknown>>();
	});

	it("infers deep partial defaults without allowing invalid tuple values", () => {
		const schema = [
			{
				properties: {
					mode: { enum: ["loose", "strict"], type: "string" },
					nested: {
						properties: { count: { type: "integer" } },
						required: ["count"],
						type: "object",
					},
				},
				required: ["mode", "nested"],
				type: "object",
			},
		] as const satisfies RuleSchemaDefinition;
		type Defaults = DefaultOptionsFromSchema<typeof schema>;

		expectTypeOf<Defaults>().toEqualTypeOf<
			readonly [
				{
					readonly mode?: "loose" | "strict";
					readonly nested?: { readonly count?: number };
				}?,
			]
		>();

		expectTypeOf([{ nested: {} }] as const).toExtend<Defaults>();

		// @ts-expect-error mode must match the schema enum
		expectTypeOf([{ mode: "sometimes" }] as const).toExtend<Defaults>();
		// @ts-expect-error the schema defines only one fixed option slot
		expectTypeOf([{}, {}] as const).toExtend<Defaults>();
	});
});
