function D(f) {
	return typeof f === "object" && f !== null && !Array.isArray(f);
}
function c(f) {
	if (!Array.isArray(f)) return !1;
	for (let r of f) if (typeof r !== "string") return !1;
	return !0;
}
function t(f) {
	if (!D(f)) return !1;
	for (let r of Object.values(f)) if (typeof r !== "string") return !1;
	return !0;
}
function w(f) {
	return f;
}
function J(f) {
	return f;
}
var _f = new Map([["omit", { originalName: "Omit", replacementName: "Except" }]]);
function pf(f) {
	let r = new Map(_f);
	if (!D(f) || !("bannedTypes" in f)) return r;
	let { bannedTypes: u } = f;
	if (u === void 0) return r;
	if (c(u)) {
		for (let y of u) r.set(y.toLowerCase(), { originalName: y, replacementName: void 0 });
		return r;
	}
	if (t(u)) for (let [y, n] of Object.entries(u)) r.set(y.toLowerCase(), { originalName: y, replacementName: n });
	return r;
}
function Lf(f) {
	if (f.type === "Identifier") return f.name;
	if (f.type === "TSQualifiedName") return f.right.name;
	return;
}
var hf = J({
		create(f) {
			let r = pf(f.options[0]);
			if (r.size === 0) return {};
			return {
				TSTypeReference(u) {
					let y = Lf(u.typeName);
					if (y === void 0) return;
					let n = r.get(y.toLowerCase());
					if (n === void 0) return;
					if (n.replacementName !== void 0 && n.replacementName !== "") {
						f.report({
							data: { replacementName: n.replacementName, typeName: n.originalName },
							messageId: "bannedTypeWithReplacement",
							node: u.typeName,
						});
						return;
					}
					f.report({ data: { typeName: n.originalName }, messageId: "bannedType", node: u.typeName });
				},
			};
		},
		meta: {
			docs: { description: "Ban configured TypeScript utility types, defaulting to Omit in favor of Except." },
			messages: {
				bannedType:
					"Type '{{typeName}}' is banned by project configuration. Use the project-preferred alternative for this type.",
				bannedTypeWithReplacement: "Type '{{typeName}}' is banned. Use '{{replacementName}}' instead.",
			},
			schema: [
				{
					additionalProperties: !1,
					properties: {
						bannedTypes: {
							description:
								"Array of banned type names or an object mapping banned type names to preferred replacement names.",
							oneOf: [
								{ items: { type: "string" }, type: "array" },
								{ additionalProperties: { type: "string" }, type: "object" },
							],
						},
					},
					type: "object",
				},
			],
			type: "problem",
		},
	}),
	d = hf;
import { extname as af } from "node:path";
function o(f, r) {
	let u = f.scan(r);
	return u === 0 ? 0 : 1 - (1 - f.probability) ** u;
}
var Gf = 0.9;
function Pf(f, r) {
	let u = 0;
	for (let y of f) {
		let n = o(y, r);
		u = 1 - (1 - u) * (1 - n);
	}
	return u;
}
function Cf(f, r) {
	return Pf(f, r) >= Gf;
}
function v(f, r) {
	return r.some((u) => Cf(f, u));
}
function l(f) {
	return {
		probability: f,
		scan(r) {
			for (let u = 0; u < r.length - 1; u += 1) {
				let y = r.charAt(u),
					n = r.charAt(u + 1);
				if (y === y.toLowerCase() && n === n.toUpperCase() && n !== n.toLowerCase()) return 1;
			}
			return 0;
		},
	};
}
var bf = /\s+/g,
	cf = /[-/^$*+?.()|[\]{}]/g;
function tf(f) {
	return f.replaceAll(cf, String.raw`\$&`);
}
function m(f, r) {
	let u = r.map((y) => (typeof y === "string" ? new RegExp(tf(y), "g") : new RegExp(y.source, "g")));
	return {
		probability: f,
		scan(y) {
			let n = y.replace(bf, ""),
				S = 0;
			for (let I of u) {
				I.lastIndex = 0;
				let T = n.match(I);
				if (T) S += T.length;
			}
			return S;
		},
	};
}
var df = /\s/;
function s(f, r) {
	let u = new Set(r);
	return {
		probability: f,
		scan(y) {
			for (let n = y.length - 1; n >= 0; n -= 1) {
				let S = y.charAt(n);
				if (u.has(S)) return 1;
				if (!df.test(S) && S !== "*" && S !== "/") return 0;
			}
			return 0;
		},
	};
}
var of = /[ \t(),{}]/;
function A(f, r) {
	let u = new Set(r);
	return {
		probability: f,
		scan(y) {
			let n = y.split(of),
				S = 0;
			for (let I of n) if (u.has(I)) S += 1;
			return S;
		},
	};
}
var vf = [
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
	lf = ["++", "||", "&&", "===", "?.", "??"],
	mf = [
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
	sf = ["}", ";", "{"];
function a() {
	return [s(0.95, sf), A(0.7, lf), A(0.3, vf), m(0.95, mf), l(0.5)];
}
import { parseSync as e } from "oxc-parser";
var ef = new Set(["BreakStatement", "ContinueStatement", "LabeledStatement"]);
function fr(f) {
	return ef.has(f.type);
}
var rr = a();
function ur(f, r, u) {
	let y = f.loc.start.line,
		n = r.loc.start.line;
	if (y + 1 !== n) return !1;
	let S = { end: f.end, loc: f.loc, range: f.range, start: f.start, type: f.type, value: f.value },
		I = u.getTokenAfter(S);
	if (!I) return !0;
	return I.loc.start.line > n;
}
function yr(f, r) {
	let u = [],
		y = 0,
		n = [],
		S = 0;
	for (let I of f)
		if (I.type === "Block") {
			if (S > 0)
				((u[y++] = {
					comments: n,
					value: n.map(({ value: T }) => T).join(`
`),
				}),
					(n = []),
					(S = 0));
			u[y++] = { comments: [I], value: I.value };
		} else if (S === 0) n[S++] = I;
		else {
			let T = n.at(-1);
			if (T && ur(T, I, r)) n[S++] = I;
			else
				((u[y++] = {
					comments: n,
					value: n.map(({ value: k }) => k).join(`
`),
				}),
					(n = [I]),
					(S = 1));
		}
	if (S > 0)
		u[y] = {
			comments: n,
			value: n.map(({ value: I }) => I).join(`
`),
		};
	return u;
}
var nr = /{/g,
	Sr = /}/g;
function Tr(f) {
	let r = (f.match(nr) ?? []).length,
		u = (f.match(Sr) ?? []).length,
		y = r - u;
	if (y > 0) return f + "}".repeat(y);
	if (y < 0) return "{".repeat(-y) + f;
	return f;
}
function Ir(f) {
	let r = f.split(`
`);
	return v(rr, r);
}
function kr(f) {
	if (f.type !== "ReturnStatement" && f.type !== "ThrowStatement") return !1;
	return f.argument?.type === "Identifier";
}
function Dr(f) {
	return f.type === "UnaryExpression" && (f.operator === "-" || f.operator === "+");
}
function gr(f) {
	if (f.type !== "Literal") return !1;
	return typeof f.value === "string" || typeof f.value === "number";
}
function Vr(f) {
	return D(f) && typeof f.type === "string";
}
function Nr(f) {
	let r = [];
	for (let u of f) if (Vr(u)) r.push(u);
	return r;
}
function jr(f, r) {
	if (f.type !== "ExpressionStatement") return !1;
	let { expression: u } = f;
	return u.type === "Identifier" || u.type === "SequenceExpression" || Dr(u) || gr(u) || !r.trimEnd().endsWith(";");
}
function Or(f, r) {
	if (f.length !== 1) return !1;
	let u = f.at(0);
	if (!u) return !1;
	return fr(u) || kr(u) || jr(u, r);
}
var qr = [/A 'return' statement can only be used within a function body/];
function Er(f) {
	for (let r of f) {
		let u = !1;
		for (let y of qr)
			if (y.test(r.message)) {
				u = !0;
				break;
			}
		if (!u) return !1;
	}
	return !0;
}
function ff(f) {
	return (f.errors.length === 0 || Er(f.errors)) && f.program.body.length > 0;
}
function $r(f, r) {
	let u = af(r),
		y = `file${u || ".js"}`,
		n = e(y, f);
	if (ff(n)) return n;
	if (u !== ".tsx" && u !== ".jsx") {
		let S = e("file.tsx", f);
		if (ff(S)) return S;
	}
	return;
}
function Jr(f, r) {
	if (!Ir(f)) return !1;
	let u = $r(f, r);
	if (!u) return !1;
	let y = Nr(u.program.body);
	return !Or(y, f);
}
var Qr = J({
		create(f) {
			return {
				"Program:exit"() {
					let r = f.sourceCode.getAllComments(),
						u = yr(r, f.sourceCode);
					for (let y of u) {
						let n = y.value.trim();
						if (n === "}") continue;
						let S = Tr(n);
						if (!Jr(S, f.filename)) continue;
						let I = y.comments.at(0),
							T = y.comments.at(-1);
						if (!I || !T) continue;
						f.report({
							loc: { end: T.loc.end, start: I.loc.start },
							messageId: "commentedCode",
							suggest: [
								{
									desc: "Remove this commented out code",
									fix(k) {
										return k.removeRange([I.range[0], T.range[1]]);
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
	rf = Qr;
function E(f) {
	return D(f) && "name" in f && typeof f.name === "string";
}
function Q(f) {
	return D(f) && f.type === "Identifier";
}
function R(f) {
	return D(f) && f.type === "JSXIdentifier" && "name" in f;
}
function uf(f) {
	return D(f) && f.type === "ImportDeclaration";
}
function B(f) {
	return D(f) && f.type === "VariableDeclarator";
}
function X(f) {
	return D(f) && f.type === "Literal" && typeof f.value === "string";
}
function Br(f) {
	return D(f) && f.type === "CallExpression";
}
function z(f) {
	if (!Br(f)) return !1;
	if (f.optional) return !1;
	let { callee: r } = f;
	if (!Q(r) || r.name !== "require" || f.arguments.length !== 1) return !1;
	let [u] = f.arguments;
	return u !== void 0 && X(u);
}
function _(f) {
	return D(f) && f.type === "ImportSpecifier";
}
function yf(f) {
	return D(f) && f.type === "ExportSpecifier";
}
function Y(f) {
	return D(f) && f.type === "Property";
}
function nf(f) {
	return D(f) && f.type === "MemberExpression";
}
function Sf(f) {
	return D(f) && f.type === "AssignmentExpression";
}
function p(f) {
	return D(f) && f.type === "ObjectExpression";
}
function Tf(f) {
	return D(f) && (f.type === "MethodDefinition" || f.type === "TSAbstractMethodDefinition");
}
function If(f) {
	return D(f) && (f.type === "PropertyDefinition" || f.type === "TSAbstractPropertyDefinition");
}
function kf(f) {
	return D(f) && f.type === "ImportDefaultSpecifier";
}
function Df(f) {
	return D(f) && f.type === "ImportNamespaceSpecifier";
}
function gf(f) {
	return D(f) && f.type === "VariableDeclaration";
}
function x(f) {
	return D(f) && f.type === "ExportNamedDeclaration";
}
function Vf(f) {
	return D(f) && (f.type === "FunctionDeclaration" || f.type === "FunctionExpression");
}
function Nf(f) {
	return D(f) && (f.type === "ClassDeclaration" || f.type === "ClassExpression");
}
function jf(f) {
	return D(f) && f.type === "TSTypeAliasDeclaration";
}
var F = "replace",
	U = "suggestion",
	L = "A more descriptive name will do too.",
	Of = {
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
	qf = {
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
	Ef = ["i18n", "l10n"],
	$f = /(?=[A-Z])|(?<=[_.-])/,
	Jf = new Set([
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
	Qf = /^[A-Za-z]+$/;
function Xr(f) {
	return (f >= 65 && f <= 90) || (f >= 97 && f <= 122) || f === 36 || f === 95;
}
function Bf(f) {
	if (f < 192) return Xr(f);
	if (f >= 12289 && f <= 55295) return !0;
	if (f <= 767) return f !== 215 && f !== 247;
	if (f <= 8191) return f >= 880 && f !== 894;
	if (f <= 8591) return (f >= 8204 && f <= 8205) || f >= 8304;
	if (f <= 12271) return f >= 11264;
	if (f <= 64255) return f >= 63744;
	if (f <= 65023) return f >= 64512;
	if (f <= 65279) return f >= 65136;
	if (f <= 65370) return (f >= 65313 && f <= 65338) || f >= 65345;
	return f >= 65382 && f <= 65500;
}
function Yr(f) {
	if (Bf(f)) return !0;
	if (f >= 48 && f <= 57) return !0;
	if (f === 8204 || f === 8205) return !0;
	if (f >= 768 && f <= 865) return !0;
	if (f >= 8240 && f <= 8266) return !0;
	return !1;
}
function M(f) {
	if (f.length === 0 || Jf.has(f)) return !1;
	let r = f.codePointAt(0);
	if (r === void 0 || !Bf(r)) return !1;
	let u = r > 65535 ? 2 : 1;
	while (u < f.length) {
		let y = f.codePointAt(u);
		if (y === void 0 || !Yr(y)) return !1;
		u += y > 65535 ? 2 : 1;
	}
	return !0;
}
function h(f) {
	return f === f.toUpperCase();
}
function G(f) {
	return h(f.charAt(0));
}
function Xf(f) {
	return f.charAt(0).toUpperCase() + f.slice(1);
}
function Yf(f) {
	return f.charAt(0).toLowerCase() + f.slice(1);
}
function Zf(f, r) {
	if (h(f) || r.allowList.get(f) === !0) return [];
	let u = r.replacements.get(Yf(f)) ?? r.replacements.get(f) ?? r.replacements.get(Xf(f));
	if (!u) return [];
	let y = G(f) ? Xf : Yf,
		n = [...u.keys()].filter((S) => u.get(S) ?? !1).map(y);
	return n.length > 0 ? [...n].toSorted() : [];
}
function xf(f, r) {
	let u = r.replacements.get(f);
	if (!u) return !1;
	for (let y of u.values()) if (y) return !0;
	return !1;
}
function Zr(f, r = Number.POSITIVE_INFINITY) {
	let u = f.reduce((S, { length: I }) => S * I, 1),
		y = Math.min(u, r);
	return {
		samples: Array.from({ length: y }, (S, I) => {
			let T = I,
				k = [];
			for (let N = f.length - 1; N >= 0; N -= 1) {
				let g = f[N] ?? [],
					j = g.length,
					V = T % j;
				T = (T - V) / j;
				let O = g[V];
				if (O !== void 0) k.unshift(O);
			}
			return k;
		}),
		total: u,
	};
}
function K(f, r, u = 3) {
	let { allowList: y, ignore: n } = r;
	if (h(f) || y.get(f) === !0 || n.some((V) => V.test(f))) return { total: 0 };
	let S = Zf(f, r);
	if (S.length > 0) return { samples: S.slice(0, u), total: S.length };
	let I = f.split($f).filter(Boolean),
		T = !1,
		k = [],
		N = 0;
	for (let V of I) {
		let O = Zf(V, r);
		if (O.length > 0) ((T = !0), (k[N++] = O));
		else k[N++] = [V];
	}
	if (!T) return { total: 0 };
	let { samples: g, total: j } = Zr(k, u);
	for (let V of g)
		for (let O = V.length - 1; O > 0; O -= 1) {
			let q = V[O] ?? "";
			if (Qf.test(q) && V[O - 1]?.endsWith(q) === !0) V.splice(O, 1);
		}
	return { samples: g.map((V) => V.join("")), total: j };
}
function H(f, r, u) {
	let { samples: y = [], total: n } = r;
	if (n === 1) return { data: { discouragedName: f, nameTypeText: u, replacement: y[0] ?? "" }, messageId: F };
	let S = y.map((T) => `\`${T}\``).join(", "),
		I = n - y.length;
	if (I > 0) S += `, ... (${I > 99 ? "99+" : I} more omitted)`;
	return { data: { discouragedName: f, nameTypeText: u, replacementsText: S }, messageId: U };
}
function Mf() {
	return {
		allowList: new Map(Object.entries(qf)),
		checkDefaultAndNamespaceImports: "internal",
		checkFilenames: !0,
		checkProperties: !1,
		checkShorthandImports: "internal",
		checkShorthandProperties: !1,
		checkVariables: !0,
		ignore: Ef.map((f) => new RegExp(f, "u")),
		replacements: new Map(Object.entries(Of).map(([f, r]) => [f, new Map(Object.entries(r))])),
	};
}
function P(f) {
	let r = [f],
		u = 1;
	for (let y of f.childScopes) {
		let n = P(y);
		for (let S of n) r[u++] = S;
	}
	return r;
}
function xr(f, r) {
	let u = r;
	while (u !== null) {
		let y = u.set.get(f);
		if (y !== void 0) return y;
		u = u.upper;
	}
	return;
}
function Mr(f, r) {
	return !r.some((u) => xr(f, u) !== void 0);
}
function Kf(f, r, u = () => !0) {
	let y = f;
	if (!M(y)) {
		if (((y = `${y}_`), !M(y))) return;
	}
	while (!Mr(y, r) || !u(y, r)) y = `${y}_`;
	return y;
}
function C(f) {
	let r = new Set();
	for (let u of f.identifiers) r.add(u);
	for (let { identifier: u } of f.references) r.add(u);
	return [...r];
}
function Kr(f, r) {
	return f.range[0] === r.range[0] && f.range[1] === r.range[1];
}
function Hf(f) {
	let { parent: r } = f;
	if (!_(r) || r.local !== f) return !1;
	return Kr(r.local, r.imported);
}
function Rf(f) {
	if (!E(f)) return !1;
	let { parent: r } = f;
	return Y(r) && r.shorthand && r.value === f;
}
function Ff(f) {
	if (!E(f)) return !1;
	let { parent: r } = f;
	if ((kf(r) && r.local === f) || (Df(r) && r.local === f)) return !0;
	if (_(r) && r.local === f) {
		let { imported: u } = r;
		if (Q(u) && u.name === "default") return !0;
	}
	return B(r) && r.id === f && z(r.init);
}
function Hr(f) {
	if (!E(f)) return !1;
	let { parent: r } = f;
	if (B(r) && r.id === f) {
		let u = r.parent;
		return gf(u) ? x(u.parent) : !1;
	}
	if (Vf(r) && r.id === f) return x(r.parent);
	if (Nf(r) && r.id === f) return x(r.parent);
	if (jf(r) && r.id === f) return x(r.parent);
	return !1;
}
function Uf(f) {
	return C(f).every((r) => !Hr(r) && !R(r));
}
function Wf(f) {
	if (!E(f)) return !1;
	let { parent: r } = f;
	if (nf(r) && r.property === f && !r.computed) {
		let u = r.parent;
		if (Sf(u) && u.left === r) return !0;
	}
	if (Y(r) && r.key === f && !r.computed && !r.shorthand && p(r.parent)) return !0;
	if (yf(r) && r.exported === f && r.local !== f) return !0;
	return (Tf(r) || If(r)) && r.key === f && !r.computed;
}
function wf(f) {
	if (!E(f)) return !1;
	let { parent: r } = f;
	return Y(r) && r.key === f && !r.computed && !r.shorthand && p(r.parent);
}
function Rr(f) {
	if (f.type === "ImportBinding") {
		let { parent: r } = f;
		if (r !== null && uf(r) && X(r.source)) return r.source.value;
	}
	if (f.type === "Variable") {
		let { node: r } = f;
		if (B(r) && z(r.init)) {
			let [u] = r.init.arguments;
			if (u !== void 0 && X(u)) return u.value;
		}
	}
	return;
}
function Fr(f) {
	let r = Rr(f);
	if (r === void 0) return !1;
	return !r.includes("node_modules") && (r.startsWith(".") || r.startsWith("/"));
}
function b(f, r) {
	if (f === !1) return !1;
	return f === "internal" ? Fr(r) : !0;
}
function Af(f) {
	if (f.defs.length !== 1) return !1;
	return f.defs[0]?.type === "ClassName";
}
function Ur(f) {
	return (r, u) =>
		u.every((y) => {
			let n = f.get(y);
			return n === void 0 || !n.has(r);
		});
}
function Wr(f, r, u) {
	if ((Ff(r) && !b(u.checkDefaultAndNamespaceImports, f)) || (Hf(r) && !b(u.checkShorthandImports, f))) return !0;
	return !u.checkShorthandProperties && Rf(r);
}
function wr(f, r, u, y) {
	let n = [],
		S = 0,
		I = 0;
	for (let T of f) {
		let k = Kf(T, r, u);
		if (k === void 0) continue;
		if (k !== T && xf(T, y)) {
			I += 1;
			continue;
		}
		if (k.length > 0) n[S++] = k;
	}
	return { droppedDiscouraged: I, safeSamples: n };
}
function Ar(f, r, u) {
	let y = f.type === "Variable" && B(f.node) && f.node.init === null,
		n = f.type === "Parameter" && r.scope.type === "function" && r.scope.block.type === "ArrowFunctionExpression",
		S = y || n;
	return (I, T) => {
		if (!u(I, T)) return !1;
		if (S && I === "arguments") return !1;
		return !0;
	};
}
function zr(f, r, u, y, n, S, I) {
	for (let k of n) {
		if (!S.has(k)) S.set(k, new Set());
		S.get(k)?.add(y);
	}
	let T = C(u);
	f({
		...r,
		fix(k) {
			let N = [],
				g = 0;
			for (let j of T) N[g++] = k.replaceText(j, y);
			return N;
		},
		node: I,
	});
}
function _r(f, r, u, y, n) {
	if (f.defs.length === 0) return;
	let [S] = f.defs;
	if (S === void 0) return;
	let I = S.name;
	if (!Q(I)) return;
	if (Wr(S, I, r)) return;
	let T = Ar(S, f, y),
		k = K(f.name, r);
	if (k.total === 0 || !k.samples) return;
	let { references: N } = f,
		g = [...N.map(($) => $.from), f.scope],
		{ safeSamples: j, droppedDiscouraged: V } = wr(k.samples, g, T, r),
		O = j.length > 0 ? j : k.samples,
		Z = typeof k.samples.length === "number" && k.samples.length === k.total ? Math.max(0, k.total - V) : k.total,
		W = f.name === "fn" && Z > 1 ? O.map(($) => ($ === "function_" ? "function" : $)) : O,
		i = H(I.name, { samples: W, total: Z }, "variable");
	if (Z === 1 && j.length === 1 && Uf(f)) {
		let [$] = j;
		if ($ !== void 0) {
			zr(n, i, f, $, g, u, I);
			return;
		}
	}
	n({ ...i, node: I });
}
function pr(f, r) {
	if (!Af(f)) {
		r(f);
		return;
	}
	if (f.scope.type === "class") {
		let [u] = f.defs;
		if (u === void 0) {
			r(f);
			return;
		}
		let y = u.name;
		if (!Q(y)) {
			r(f);
			return;
		}
		r(f);
	}
}
function Lr(f, r) {
	for (let u of P(f)) for (let y of u.variables) pr(y, r);
}
var hr = J({
		create(f) {
			let r = Mf(),
				u = f.physicalFilename,
				y = new WeakMap(),
				n = Ur(y),
				{ report: S } = f;
			function I(T) {
				_r(T, r, y, n, S);
			}
			return {
				Identifier(T) {
					if (!r.checkProperties || !E(T) || T.name === "__proto__") return;
					let k = K(T.name, r);
					if (k.total === 0 || !Wf(T)) return;
					let N = H(T.name, k, "property");
					if (k.total === 1 && k.samples && wf(T)) {
						let [g] = k.samples,
							{ parent: j } = T;
						if (g !== void 0 && Y(j) && X(j.value) && M(g)) {
							S({
								...N,
								fix(V) {
									return V.replaceText(T, g);
								},
								node: T,
							});
							return;
						}
					}
					S({ ...N, node: T });
				},
				JSXOpeningElement(T) {
					if (!r.checkVariables || !R(T.name) || !G(T.name.name)) return;
					let k = K(T.name.name, r);
					if (k.total === 0) return;
					let N = H(T.name.name, k, "variable");
					S({ ...N, node: T.name });
				},
				"Program:exit"(T) {
					if (r.checkFilenames && u !== "<input>" && u !== "<text>") {
						let N = Math.max(u.lastIndexOf("/"), u.lastIndexOf("\\")),
							g = u.slice(N + 1),
							j = g.lastIndexOf("."),
							V = j === -1 ? "" : g.slice(j),
							O = j === -1 ? g : g.slice(0, j),
							q = K(O, r);
						if (q.total > 0 && q.samples) {
							let Z = q.samples.map((W) => `${W}${V}`);
							S({ ...H(g, { samples: Z, total: q.total }, "filename"), node: T });
						}
					}
					if (!r.checkVariables) return;
					let k = f.sourceCode.getScope(T);
					Lr(k, I);
				},
			};
		},
		meta: {
			docs: { description: "Prevent abbreviations.", recommended: !1 },
			fixable: "code",
			messages: {
				[F]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${L}`,
				[U]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${L}`,
			},
			type: "suggestion",
		},
	}),
	zf = hr;
var Gr = w({
		meta: { name: "small-rules" },
		rules: { "ban-types": d, "no-commented-code": rf, "prevent-abbreviations": zf },
	}),
	pu = Gr;
export { pu as default };
