import type { Definition, ESTree, Reference, Scope } from "#src";

export type MessageIds = "replace" | "suggestion";
export type ImportCheckOption = "internal" | boolean;

export interface PreparedOptions {
	readonly allowList: Map<string, boolean>;
	readonly checkDefaultAndNamespaceImports: ImportCheckOption;
	readonly checkFilenames: boolean;
	readonly checkProperties: boolean;
	readonly checkShorthandImports: ImportCheckOption;
	readonly checkShorthandProperties: boolean;
	readonly checkVariables: boolean;
	readonly ignore: ReadonlyArray<RegExp>;
	readonly replacements: Map<string, Map<string, boolean>>;
}

export interface NameReplacements {
	samples?: ReadonlyArray<string>;
	total: number;
}

export type NamedIdentifier = ESTree.BindingIdentifier | ESTree.IdentifierName | ESTree.IdentifierReference;
export type BroadIdentifier =
	| ESTree.LabelIdentifier
	| ESTree.TSIndexSignatureName
	| ESTree.TSThisParameter
	| NamedIdentifier;

export interface VariableLike {
	readonly name: string;
	readonly defs: ReadonlyArray<Definition>;
	readonly identifiers: ReadonlyArray<BroadIdentifier>;
	readonly references: ReadonlyArray<Reference>;
	readonly scope: Scope;
}

export type IsSafe = (name: string, scopes: ReadonlyArray<Scope>) => boolean;

export interface NodeRange {
	readonly range: [number, number];
}
