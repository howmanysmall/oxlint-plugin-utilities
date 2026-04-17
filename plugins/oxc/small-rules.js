import { extname as wq } from "node:path";
import { parseSync as d } from "oxc-parser";
import { definePlugin as PQ } from "oxlint-plugin-utilities";
import { defineRule as Nq } from "oxlint-plugin-utilities";
function u(q, Q) {
	const Z = q.scan(Q);
	return Z === 0 ? 0 : 1 - (1 - q.probability) ** Z;
}
const Gq = 0.9;
function Wq(q, Q) {
	let Z = 0;
	for (const $ of q) {
		const K = u($, Q);
		Z = 1 - (1 - Z) * (1 - K);
	}
	return Z;
}
function zq(q, Q) {
	return Wq(q, Q) >= Gq;
}
function m(q, Q) {
	return Q.some((Z) => zq(q, Z));
}
function l(q) {
	return {
		probability: q,
		scan(Q) {
			for (let Z = 0; Z < Q.length - 1; Z += 1) {
				const $ = Q.charAt(Z),
					K = Q.charAt(Z + 1);
				if ($ === $.toLowerCase() && K === K.toUpperCase() && K !== K.toLowerCase()) return 1;
			}
			return 0;
		},
	};
}
const Fq = /\s+/g,
	kq = /[-/^$*+?.()|[\]{}]/g;
function Oq(q) {
	return q.replaceAll(kq, String.raw`\$&`);
}
function p(q, Q) {
	const Z = Q.map(($) => (typeof $ === "string" ? new RegExp(Oq($), "g") : new RegExp($.source, "g")));
	return {
		probability: q,
		scan($) {
			let K = $.replace(Fq, ""),
				X = 0;
			for (const j of Z) {
				j.lastIndex = 0;
				const V = K.match(j);
				if (V) X += V.length;
			}
			return X;
		},
	};
}
const _q = /\s/;
function c(q, Q) {
	const Z = new Set(Q);
	return {
		probability: q,
		scan($) {
			for (let K = $.length - 1; K >= 0; K -= 1) {
				const X = $.charAt(K);
				if (Z.has(X)) return 1;
				if (!_q.test(X) && X !== "*" && X !== "/") return 0;
			}
			return 0;
		},
	};
}
const Dq = /[ \t(),{}]/;
function C(q, Q) {
	const Z = new Set(Q);
	return {
		probability: q,
		scan($) {
			let K = $.split(Dq),
				X = 0;
			for (const j of K) if (Z.has(j)) X += 1;
			return X;
		},
	};
}
const Iq = [
		"public",
		"abstract",
		"class",
		"implements",
		"extends",
		"return",
		"throw",
		"private",
		"protected",
		"enum",
		"continue",
		"assert",
		"boolean",
		"this",
		"instanceof",
		"interface",
		"static",
		"void",
		"super",
		"true",
		"case:",
		"let",
		"const",
		"var",
		"async",
		"await",
		"break",
		"yield",
		"typeof",
		"import",
		"export",
	],
	Aq = ["++", "||", "&&", "===", "?.", "??"],
	Lq = [
		"for(",
		"if(",
		"while(",
		"catch(",
		"switch(",
		"try{",
		"else{",
		"this.",
		"window.",
		/;\s+\/\//,
		"import '",
		'import "',
		"require(",
	],
	Tq = ["}", ";", "{"];
function s() {
	return [c(0.95, Tq), C(0.7, Aq), C(0.3, Iq), p(0.95, Lq), l(0.5)];
}
function M(q) {
	return typeof q === "object" && q !== null && !Array.isArray(q);
}
const Sq = new Set(["BreakStatement", "ContinueStatement", "LabeledStatement"]);
function yq(q) {
	return Sq.has(q.type);
}
const Eq = s();
function Rq(q) {
	return q.loc !== void 0 && q.range !== void 0;
}
function hq(q, Q, Z) {
	const $ = q.loc.start.line,
		K = Q.loc.start.line;
	if ($ + 1 !== K) return !1;
	const X = { end: q.end, loc: q.loc, range: q.range, start: q.start, type: q.type, value: q.value },
		j = Z.getTokenAfter(X);
	if (!j) return !0;
	return j.loc.start.line > K;
}
function Cq(q, Q) {
	let Z = [],
		$ = 0,
		K = [],
		X = 0;
	for (const j of q) {
		if (!Rq(j)) continue;
		if (j.type === "Block") {
			if (X > 0) {
				((Z[$++] = {
					comments: K,
					value: K.map(({ value: V }) => V).join(`
`),
				}),
					(K = []),
					(X = 0));
			}
			Z[$++] = { comments: [j], value: j.value };
		} else if (X === 0) K[X++] = j;
		else {
			const V = K.at(-1);
			if (V && hq(V, j, Q)) K[X++] = j;
			else {
				((Z[$++] = {
					comments: K,
					value: K.map(({ value: Y }) => Y).join(`
`),
				}),
					(K = [j]),
					(X = 1));
			}
		}
	}
	if (X > 0) {
		Z[$] = {
			comments: K,
			value: K.map(({ value: j }) => j).join(`
`),
		};
	}
	return Z;
}
const gq = /{/g,
	Pq = /}/g;
function vq(q) {
	const Q = (q.match(gq) ?? []).length,
		Z = (q.match(Pq) ?? []).length,
		$ = Q - Z;
	if ($ > 0) return q + "}".repeat($);
	if ($ < 0) return "{".repeat(-$) + q;
	return q;
}
function xq(q) {
	const Q = q.split(`
`);
	return m(Eq, Q);
}
function bq(q) {
	if (q.type !== "ReturnStatement" && q.type !== "ThrowStatement") return !1;
	return q.argument?.type === "Identifier";
}
function fq(q) {
	return q.type === "UnaryExpression" && (q.operator === "-" || q.operator === "+");
}
function uq(q) {
	if (q.type !== "Literal") return !1;
	return typeof q.value === "string" || typeof q.value === "number";
}
function mq(q) {
	return M(q) && typeof q.type === "string";
}
function lq(q) {
	const Q = [];
	for (const Z of q) if (mq(Z)) Q.push(Z);
	return Q;
}
function pq(q, Q) {
	if (q.type !== "ExpressionStatement") return !1;
	const { expression: Z } = q;
	if (Z === null) return !1;
	return Z.type === "Identifier" || Z.type === "SequenceExpression" || fq(Z) || uq(Z) || !Q.trimEnd().endsWith(";");
}
function cq(q, Q) {
	if (q.length !== 1) return !1;
	const Z = q.at(0);
	if (!Z) return !1;
	return yq(Z) || bq(Z) || pq(Z, Q);
}
const sq = [/A 'return' statement can only be used within a function body/];
function dq(q) {
	return q.every((Q) => sq.some((Z) => Z.test(Q.message)));
}
function r(q) {
	return (q.errors.length === 0 || dq(q.errors)) && q.program.body.length > 0;
}
function rq(q, Q) {
	const Z = wq(Q),
		$ = `file${Z || ".js"}`,
		K = d($, q);
	if (r(K)) return K;
	if (Z !== ".tsx" && Z !== ".jsx") {
		const X = d("file.tsx", q);
		if (r(X)) return X;
	}
	return;
}
function aq(q, Q) {
	if (!xq(q)) return !1;
	const Z = rq(q, Q);
	if (!Z) return !1;
	const $ = lq(Z.program.body);
	return !cq($, q);
}
const oq = Nq({
		create(q) {
			return {
				"Program:exit"() {
					let Q = q.sourceCode.getAllComments(),
						Z = Cq(Q, q.sourceCode);
					for (let $ of Z) {
						let K = $.value.trim();
						if (K === "}") continue;
						let X = vq(K);
						if (!aq(X, q.filename)) continue;
						let j = $.comments.at(0),
							V = $.comments.at(-1);
						if (!j || !V) continue;
						q.report({
							loc: { end: V.loc.end, start: j.loc.start },
							messageId: "commentedCode",
							suggest: [
								{
									desc: "Remove this commented out code",
									fix(Y) {
										return Y.removeRange([j.range[0], V.range[1]]);
									},
								},
							],
						});
					}
				},
			};
		},
		meta: {
			docs: { description: "Disallow commented-out code", recommended: !1 },
			hasSuggestions: !0,
			messages: {
				commentedCode:
					"Commented-out code creates confusion about intent and clutters the codebase. Version control preserves history, making dead code comments unnecessary. Delete the commented code entirely. If needed later, retrieve it from git history.",
			},
			schema: [],
			type: "suggestion",
		},
	}),
	a = oq;
import { defineRule as iq } from "oxlint-plugin-utilities";
const qq = "replace",
	Qq = "suggestion",
	o = "A more descriptive name will do too.",
	tq = {
		acc: { accumulator: !0 },
		arg: { argument: !0 },
		args: { arguments: !0 },
		arr: { array: !0 },
		attr: { attribute: !0 },
		attrs: { attributes: !0 },
		btn: { button: !0 },
		cb: { callback: !0 },
		conf: { config: !0 },
		ctx: { context: !0 },
		cur: { current: !0 },
		curr: { current: !0 },
		db: { database: !0 },
		def: { defer: !0, deferred: !0, define: !0, definition: !0 },
		dest: { destination: !0 },
		dev: { development: !0 },
		dir: { direction: !0, directory: !0 },
		dirs: { directories: !0 },
		dist: { distance: !0 },
		doc: { document: !0 },
		docs: { documentation: !0, documents: !0 },
		dst: { daylightSavingTime: !0, destination: !0, distribution: !0 },
		e: { error: !0, event: !0 },
		el: { element: !0 },
		elem: { element: !0 },
		elems: { elements: !0 },
		env: { environment: !0 },
		envs: { environments: !0 },
		err: { error: !0 },
		ev: { event: !0 },
		evt: { event: !0 },
		ext: { extension: !0 },
		exts: { extensions: !0 },
		fn: { func: !0, function: !0 },
		func: { function: !0 },
		i: { index: !0 },
		idx: { index: !0 },
		j: { index: !0 },
		len: { length: !0 },
		lib: { library: !0 },
		mod: { module: !0 },
		msg: { message: !0 },
		num: { number: !0 },
		obj: { object: !0 },
		opts: { options: !0 },
		param: { parameter: !0 },
		params: { parameters: !0 },
		pkg: { package: !0 },
		prev: { previous: !0 },
		prod: { production: !0 },
		prop: { property: !0 },
		props: { properties: !0 },
		ref: { reference: !0 },
		refs: { references: !0 },
		rel: { related: !0, relationship: !0, relative: !0 },
		req: { request: !0 },
		res: { resource: !0, response: !0, result: !0 },
		ret: { returnValue: !0 },
		retval: { returnValue: !0 },
		sep: { separator: !0 },
		src: { source: !0 },
		stdDev: { standardDeviation: !0 },
		str: { string: !0 },
		tbl: { table: !0 },
		temp: { temporary: !0 },
		tit: { title: !0 },
		tmp: { temporary: !0 },
		util: { utility: !0 },
		utils: { utilities: !0 },
		val: { value: !0 },
		var: { variable: !0 },
		vars: { variables: !0 },
		ver: { version: !0 },
	},
	nq = {
		defaultProps: !0,
		devDependencies: !0,
		EmberENV: !0,
		getDerivedStateFromProps: !0,
		getInitialProps: !0,
		getServerSideProps: !0,
		getStaticProps: !0,
		iOS: !0,
		obj: !0,
		propTypes: !0,
		setupFilesAfterEnv: !0,
	},
	eq = ["i18n", "l10n"],
	qQ = /(?=[A-Z])|(?<=[_.-])/,
	QQ = new Set([
		"any",
		"as",
		"boolean",
		"break",
		"case",
		"catch",
		"class",
		"const",
		"constructor",
		"continue",
		"debugger",
		"declare",
		"default",
		"delete",
		"do",
		"else",
		"enum",
		"export",
		"extends",
		"false",
		"finally",
		"for",
		"from",
		"function",
		"get",
		"if",
		"implements",
		"import",
		"in",
		"instanceof",
		"interface",
		"let",
		"module",
		"new",
		"null",
		"number",
		"of",
		"package",
		"private",
		"protected",
		"public",
		"require",
		"return",
		"set",
		"static",
		"string",
		"super",
		"switch",
		"symbol",
		"this",
		"throw",
		"true",
		"try",
		"type",
		"typeof",
		"var",
		"void",
		"while",
		"with",
		"yield",
	]),
	ZQ = /^[A-Za-z]+$/;
function P(q) {
	return q === q.toUpperCase();
}
function Zq(q) {
	return P(q.charAt(0));
}
function index(q) {
	return q.charAt(0).toUpperCase() + q.slice(1);
}
function t(q) {
	return q.charAt(0).toLowerCase() + q.slice(1);
}
function k(q) {
	return M(q) && "name" in q && typeof q.name === "string";
}
function w(q) {
	return k(q) && q.type === "Identifier";
}
function $q(q) {
	return M(q) && q.type === "JSXIdentifier" && "name" in q;
}
function $Q(q) {
	return M(q) && q.type === "ImportDeclaration";
}
function S(q) {
	return M(q) && q.type === "VariableDeclarator";
}
function N(q) {
	return M(q) && q.type === "Literal" && typeof q.value === "string";
}
function YQ(q) {
	return M(q) && q.type === "CallExpression";
}
function Yq(q) {
	if (!YQ(q)) return !1;
	if (q.optional) return !1;
	let { callee: Q } = q;
	if (!w(Q) || Q.name !== "require" || q.arguments.length !== 1) return !1;
	let [Z] = q.arguments;
	return Z !== void 0 && N(Z);
}
function g(q) {
	if (q.length === 0 || QQ.has(q)) return !1;
	let Q = q.codePointAt(0);
	if (Q === void 0 || !Kq(Q)) return !1;
	let Z = Q > 65535 ? 2 : 1;
	while (Z < q.length) {
		let $ = q.codePointAt(Z);
		if ($ === void 0 || !KQ($)) return !1;
		Z += $ > 65535 ? 2 : 1;
	}
	return !0;
}
function Kq(q) {
	if ((q >= 65 && q <= 90) || (q >= 97 && q <= 122)) return !0;
	if (q === 36 || q === 95) return !0;
	if (q >= 192 && q <= 214) return !0;
	if (q >= 216 && q <= 246) return !0;
	if (q >= 248 && q <= 767) return !0;
	if (q >= 880 && q <= 893) return !0;
	if (q >= 895 && q <= 8191) return !0;
	if (q >= 8204 && q <= 8205) return !0;
	if (q >= 8304 && q <= 8591) return !0;
	if (q >= 11264 && q <= 12271) return !0;
	if (q >= 12289 && q <= 55295) return !0;
	if (q >= 63744 && q <= 64255) return !0;
	if (q >= 64512 && q <= 65023) return !0;
	if (q >= 65136 && q <= 65279) return !0;
	if (q >= 65313 && q <= 65338) return !0;
	if (q >= 65345 && q <= 65370) return !0;
	if (q >= 65382 && q <= 65500) return !0;
	return !1;
}
function KQ(q) {
	if (Kq(q)) return !0;
	if (q >= 48 && q <= 57) return !0;
	if (q === 8204 || q === 8205) return !0;
	if (q >= 768 && q <= 865) return !0;
	if (q >= 8240 && q <= 8266) return !0;
	return !1;
}
function Xq(q) {
	let Q = [q];
	for (let Z of q.childScopes) {
		let $ = Xq(Z);
		for (let K of $) Q.push(K);
	}
	return Q;
}
function XQ(q, Q) {
	let Z = Q;
	while (Z !== null) {
		let $ = Z.set.get(q);
		if ($ !== void 0) return $;
		Z = Z.upper;
	}
	return;
}
function jQ(q, Q) {
	return !Q.some((Z) => XQ(q, Z) !== void 0);
}
function HQ(q, Q, Z = () => !0) {
	let $ = q;
	if (!g($)) {
		if ((($ = `${$}_`), !g($))) return;
	}
	while (!jQ($, Q) || !Z($, Q)) $ = `${$}_`;
	return $;
}
function jq(q) {
	let Q = new Set();
	for (let Z of q.identifiers) Q.add(Z);
	for (let { identifier: Z } of q.references) Q.add(Z);
	return [...Q];
}
function JQ(q, Q) {
	return q.range[0] === Q.range[0] && q.range[1] === Q.range[1];
}
function UQ(q) {
	let { parent: Q } = q;
	if (!Hq(Q) || Q.local !== q) return !1;
	return JQ(Q.local, Q.imported);
}
function Hq(q) {
	return M(q) && q.type === "ImportSpecifier";
}
function MQ(q) {
	return M(q) && q.type === "ExportSpecifier";
}
function y(q) {
	return M(q) && q.type === "Property";
}
function VQ(q) {
	if (!k(q)) return !1;
	let { parent: Q } = q;
	return y(Q) && Q.shorthand && Q.value === q;
}
function BQ(q) {
	if (!k(q)) return !1;
	let { parent: Q } = q;
	if ((GQ(Q) && Q.local === q) || (WQ(Q) && Q.local === q)) return !0;
	if (Hq(Q) && Q.local === q) {
		let { imported: Z } = Q;
		if (w(Z) && Z.name === "default") return !0;
	}
	if (S(Q) && Q.id === q && Yq(Q.init)) return !0;
	return !1;
}
function GQ(q) {
	return M(q) && q.type === "ImportDefaultSpecifier";
}
function WQ(q) {
	return M(q) && q.type === "ImportNamespaceSpecifier";
}
function zQ(q) {
	if (!k(q)) return !1;
	let { parent: Q } = q;
	if (Q === void 0 || Q === null) return !1;
	if (S(Q) && Q.id === q) {
		let Z = Q.parent;
		if (!FQ(Z)) return !1;
		let $ = Z.parent;
		return A($);
	}
	if (kQ(Q) && Q.id === q) return A(Q.parent);
	if (OQ(Q) && Q.id === q) return A(Q.parent);
	if (_Q(Q) && Q.id === q) return A(Q.parent);
	return !1;
}
function FQ(q) {
	return M(q) && q.type === "VariableDeclaration";
}
function A(q) {
	return M(q) && q.type === "ExportNamedDeclaration";
}
function kQ(q) {
	return M(q) && typeof q.type === "string" && (q.type === "FunctionDeclaration" || q.type === "FunctionExpression");
}
function OQ(q) {
	return M(q) && typeof q.type === "string" && (q.type === "ClassDeclaration" || q.type === "ClassExpression");
}
function _Q(q) {
	return M(q) && q.type === "TSTypeAliasDeclaration";
}
function DQ(q) {
	return jq(q).every((Q) => !zQ(Q) && !$q(Q));
}
function IQ(q) {
	if (!k(q)) return !1;
	let { parent: Q } = q;
	if (AQ(Q) && Q.property === q && !Q.computed) {
		let Z = Q.parent;
		if (LQ(Z) && Z.left === Q) return !0;
	}
	if (y(Q) && Q.key === q && !Q.computed && !Q.shorthand && Jq(Q.parent)) return !0;
	if (MQ(Q) && Q.exported === q && Q.local !== q) return !0;
	return (TQ(Q) || wQ(Q)) && Q.key === q && !Q.computed;
}
function AQ(q) {
	return M(q) && q.type === "MemberExpression";
}
function LQ(q) {
	return M(q) && q.type === "AssignmentExpression";
}
function Jq(q) {
	return M(q) && q.type === "ObjectExpression";
}
function TQ(q) {
	return (
		M(q) && typeof q.type === "string" && (q.type === "MethodDefinition" || q.type === "TSAbstractMethodDefinition")
	);
}
function wQ(q) {
	return (
		M(q) &&
		typeof q.type === "string" &&
		(q.type === "PropertyDefinition" || q.type === "TSAbstractPropertyDefinition")
	);
}
function NQ(q) {
	if (!k(q)) return !1;
	let { parent: Q } = q;
	return y(Q) && Q.key === q && !Q.computed && !Q.shorthand && Jq(Q.parent);
}
function SQ(q) {
	if (q.type === "ImportBinding") {
		let { parent: Q } = q;
		if (Q !== null && $Q(Q) && N(Q.source)) return Q.source.value;
	}
	if (q.type === "Variable") {
		let { node: Q } = q;
		if (S(Q) && Yq(Q.init)) {
			let [Z] = Q.init.arguments;
			if (Z !== void 0 && N(Z)) return Z.value;
		}
	}
	return;
}
function yQ(q) {
	let Q = SQ(q);
	if (Q === void 0) return !1;
	return !Q.includes("node_modules") && (Q.startsWith(".") ?? Q.startsWith("/"));
}
function n(q, Q) {
	if (q === !1) return !1;
	return q === "internal" ? yQ(Q) : !0;
}
function EQ(q) {
	if (q.defs.length !== 1) return !1;
	return q.defs[0]?.type === "ClassName";
}
function RQ() {
	return {
		allowList: new Map(Object.entries(nq)),
		checkDefaultAndNamespaceImports: "internal",
		checkFilenames: !0,
		checkProperties: !1,
		checkShorthandImports: "internal",
		checkShorthandProperties: !1,
		checkVariables: !0,
		ignore: eq.map((q) => new RegExp(q, "u")),
		replacements: new Map(Object.entries(tq).map(([q, Q]) => [q, new Map(Object.entries(Q))])),
	};
}
function e(q, Q) {
	if (P(q) || Q.allowList.get(q) === !0) return [];
	let Z = Q.replacements.get(t(q)) ?? Q.replacements.get(q) ?? Q.replacements.get(index(q));
	if (!Z) return [];
	let $ = Zq(q) ? index : t,
		K = [...Z.keys()].filter((X) => Z.get(X) ?? !1).map($);
	return K.length > 0 ? [...K].toSorted() : [];
}
function hQ(q, Q) {
	const Z = Q.replacements.get(q);
	if (!Z) return !1;
	for (const $ of Z.values()) if ($) return !0;
	return !1;
}
function CQ(q, Q = Number.POSITIVE_INFINITY) {
	const Z = q.reduce((X, { length: j }) => X * j, 1),
		$ = Math.min(Z, Q);
	return {
		samples: Array.from({ length: $ }, (X, index) => {
			let V = index,
				Y = [];
			for (let H = q.length - 1; H >= 0; H -= 1) {
				const J = q[H] ?? [],
					G = J.length,
					U = V % G;
				V = (V - U) / G;
				const W = J[U];
				if (W !== void 0) Y.unshift(W);
			}
			return Y;
		}),
		total: Z,
	};
}
function L(q, Q, Z = 3) {
	const { allowList: $, ignore: K } = Q;
	if (P(q) || $.get(q) === !0 || K.some((U) => U.test(q))) return { total: 0 };
	const X = e(q, Q);
	if (X.length > 0) return { samples: X.slice(0, Z), total: X.length };
	let index = q.split(qQ).filter(Boolean),
		V = !1,
		Y = [],
		H = 0;
	for (let U of index) {
		const W = e(U, Q);
		if (W.length > 0) ((V = !0), (Y[H++] = W));
		else Y[H++] = [U];
	}
	if (!V) return { total: 0 };
	const { samples: J, total: G } = CQ(Y, Z);
	for (const U of J)
		for (let W = U.length - 1; W > 0; W -= 1) {
			const O = U[W] ?? "";
			if (ZQ.test(O) && U[W - 1]?.endsWith(O) === !0) U.splice(W, 1);
		}
	return { samples: J.map((U) => U.join("")), total: G };
}
function T(q, Q, Z) {
	const { samples: $ = [], total: K } = Q;
	if (K === 1) return { data: { discouragedName: q, nameTypeText: Z, replacement: $[0] ?? "" }, messageId: qq };
	const X = $.map((V) => `\`${V}\``).join(", "),
		j = K - $.length;
	if (j > 0) X += `, ... (${j > 99 ? "99+" : j} more omitted)`;
	return { data: { discouragedName: q, nameTypeText: Z, replacementsText: X }, messageId: Qq };
}
const gQ = iq({
		create(q) {
			let Q = RQ(),
				Z = q.physicalFilename,
				$ = new WeakMap(),
				K = (Y, H) =>
					H.every((J) => {
						return !$.get(J)?.has(Y);
					});
			function X(Y) {
				if (Y.defs.length === 0) return;
				let [H] = Y.defs;
				if (H === void 0) return;
				let J = H.name;
				if (!w(J)) return;
				if ((BQ(J) && !n(Q.checkDefaultAndNamespaceImports, H)) || (UQ(J) && !n(Q.checkShorthandImports, H)))
					return;
				if (!Q.checkShorthandProperties && VQ(J)) return;
				let G = H.type === "Variable" && S(H.node) && H.node.init === null,
					U =
						H.type === "Parameter" &&
						Y.scope.type === "function" &&
						Y.scope.block.type === "ArrowFunctionExpression",
					W = G || U,
					O = (B, F) => {
						if (!K(B, F)) return !1;
						if (W && B === "arguments") return !1;
						return !0;
					},
					z = L(Y.name, Q);
				if (z.total === 0 || !z.samples) return;
				let { references: E } = Y,
					D = [...E.map((B) => B.from), Y.scope],
					v = 0,
					I = z.samples
						.map((B) => {
							let F = HQ(B, D, O);
							if (F === void 0) return;
							if (F !== B && hQ(B, Q)) {
								v += 1;
								return;
							}
							return F;
						})
						.filter((B) => typeof B === "string" && B.length > 0),
					x = I.length > 0 ? I : z.samples,
					R =
						typeof z.samples?.length === "number" && z.samples.length === z.total
							? Math.max(0, z.total - v)
							: z.total,
					Mq = Y.name === "fn" && R > 1 ? x.map((B) => (B === "function_" ? "function" : B)) : x,
					b = T(J.name, { samples: Mq, total: R }, "variable");
				if (R === 1 && I.length === 1 && DQ(Y)) {
					let [B] = I;
					if (B !== void 0) {
						for (let _ of D) {
							if (!$.has(_)) $.set(_, new Set());
							$.get(_)?.add(B);
						}
						let F = jq(Y);
						q.report({
							...b,
							fix(_) {
								let h = [],
									Vq = 0;
								for (let Bq of F) {
									let f = _.replaceText(Bq, B);
									if (f === void 0) continue;
									h[Vq++] = f;
								}
								return h;
							},
							node: J,
						});
						return;
					}
				}
				q.report({ ...b, node: J });
			}
			function j(Y) {
				if (!EQ(Y)) {
					X(Y);
					return;
				}
				if (Y.scope.type === "class") {
					let [H] = Y.defs;
					if (H === void 0) {
						X(Y);
						return;
					}
					let J = H.name;
					if (!w(J)) {
						X(Y);
						return;
					}
					X(Y);
				}
			}
			function V(Y) {
				for (let H of Xq(Y)) for (let J of H.variables) j(J);
			}
			return {
				Identifier(Y) {
					if (!Q.checkProperties || !k(Y) || Y.name === "__proto__") return;
					let H = L(Y.name, Q);
					if (H.total === 0 || !IQ(Y)) return;
					let J = T(Y.name, H, "property");
					if (H.total === 1 && H.samples && NQ(Y)) {
						let [G] = H.samples,
							{ parent: U } = Y;
						if (G !== void 0 && y(U) && N(U.value) && g(G)) {
							q.report({
								...J,
								fix(W) {
									return W.replaceText(Y, G);
								},
								node: Y,
							});
							return;
						}
					}
					q.report({ ...J, node: Y });
				},
				JSXOpeningElement(Y) {
					if (!Q.checkVariables || !$q(Y.name) || !Zq(Y.name.name)) return;
					let H = L(Y.name.name, Q);
					if (H.total === 0) return;
					let J = T(Y.name.name, H, "variable");
					q.report({ ...J, node: Y.name });
				},
				"Program:exit"(Y) {
					if (Q.checkFilenames && Z !== "<input>" && Z !== "<text>") {
						let J = Math.max(Z.lastIndexOf("/"), Z.lastIndexOf("\\")),
							G = Z.slice(J + 1),
							U = G.lastIndexOf("."),
							W = U === -1 ? "" : G.slice(U),
							O = U === -1 ? G : G.slice(0, U),
							z = L(O, Q);
						if (z.total > 0 && z.samples) {
							let E = z.samples.map((D) => `${D}${W}`);
							q.report({ ...T(G, { samples: E, total: z.total }, "filename"), node: Y });
						}
					}
					if (!Q.checkVariables) return;
					let H = q.sourceCode.getScope(Y);
					V(H);
				},
			};
		},
		meta: {
			docs: { description: "Prevent abbreviations.", recommended: !1 },
			fixable: "code",
			messages: {
				[qq]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${o}`,
				[Qq]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${o}`,
			},
			type: "suggestion",
		},
	}),
	Uq = gQ;
const vQ = PQ({ meta: { name: "small-rules" }, rules: { "no-commented-code": a, "prevent-abbreviations": Uq } }),
	MZ = vQ;
export { MZ as default };
