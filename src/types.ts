import type {
	Context as OxlintContext,
	Diagnostic as OxlintDiagnostic,
	Rule as OxlintRule,
	RuleMeta as OxlintRuleMeta,
	Visitor,
	VisitorWithHooks,
} from "@oxlint/plugins";
import type { Except } from "type-fest";

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

export interface RuleMeta<TMessageIds extends string = string> extends Readonly<Except<OxlintRuleMeta, "messages">> {
	readonly messages?: Record<TMessageIds, string>;
}

export interface CreateRule<TOptions = Record<string, never>, TMessageIds extends string = string> {
	readonly create: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => Visitor;
	readonly meta?: RuleMeta<TMessageIds>;
}

export interface CreateOnceRule<TOptions = Record<string, never>, TMessageIds extends string = string> {
	readonly create?: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => Visitor;
	readonly createOnce: (context: Context<TOptions, TMessageIds>, optionsWithDefault: TOptions) => VisitorWithHooks;
	readonly meta?: RuleMeta<TMessageIds>;
}

export type Rule<TOptions = Record<string, never>, TMessageIds extends string = string> =
	| CreateOnceRule<TOptions, TMessageIds>
	| CreateRule<TOptions, TMessageIds>;

export interface Plugin<TRules extends Record<string, OxlintRule | Rule>> {
	readonly meta?: { readonly name?: string };
	readonly rules: TRules;
}
