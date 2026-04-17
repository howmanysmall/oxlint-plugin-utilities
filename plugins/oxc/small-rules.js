function h(y) {
	return y;
}
function M(y) {
	return y;
}
function B(y) {
	return typeof y === "object" && y !== null && !Array.isArray(y);
}
function m(y) {
	if (!Array.isArray(y)) return !1;
	for (let T of y) if (typeof T !== "string") return !1;
	return !0;
}
function l(y) {
	if (!B(y)) return !1;
	for (let T of Object.values(y)) if (typeof T !== "string") return !1;
	return !0;
}
var Wy = new Map([["omit", { originalName: "Omit", replacementName: "Except" }]]);
function Gy(y) {
	let T = new Map(Wy);
	if (!B(y) || !("bannedTypes" in y)) return T;
	let { bannedTypes: j } = y;
	if (j === void 0) return T;
	if (m(j)) {
		for (let Q of j) T.set(Q.toLowerCase(), { originalName: Q, replacementName: void 0 });
		return T;
	}
	if (l(j)) for (let [Q, q] of Object.entries(j)) T.set(Q.toLowerCase(), { originalName: Q, replacementName: q });
	return T;
}
function zy(y) {
	if (y.type === "Identifier") return y.name;
	if (y.type === "TSQualifiedName") return y.right.name;
	return;
}
var Ry = M({
		create(y) {
			let T = Gy(y.options[0]);
			if (T.size === 0) return {};
			return {
				TSTypeReference(j) {
					let Q = zy(j.typeName);
					if (Q === void 0) return;
					let q = T.get(Q.toLowerCase());
					if (q === void 0) return;
					if (q.replacementName !== void 0 && q.replacementName !== "") {
						y.report({
							data: { replacementName: q.replacementName, typeName: q.originalName },
							messageId: "bannedTypeWithReplacement",
							node: j.typeName,
						});
						return;
					}
					y.report({ data: { typeName: q.originalName }, messageId: "bannedType", node: j.typeName });
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
	c = Ry;
import { extname as fy } from "node:path";
import { parseSync as t } from "oxc-parser";
function s(y, T) {
	let j = y.scan(T);
	return j === 0 ? 0 : 1 - (1 - y.probability) ** j;
}
var _y = 0.9;
function Dy(y, T) {
	let j = 0;
	for (let Q of y) {
		let q = s(Q, T);
		j = 1 - (1 - j) * (1 - q);
	}
	return j;
}
function gy(y, T) {
	return Dy(y, T) >= _y;
}
function r(y, T) {
	return T.some((j) => gy(y, j));
}
function d(y) {
	return {
		probability: y,
		scan(T) {
			for (let j = 0; j < T.length - 1; j += 1) {
				let Q = T.charAt(j),
					q = T.charAt(j + 1);
				if (Q === Q.toLowerCase() && q === q.toUpperCase() && q !== q.toLowerCase()) return 1;
			}
			return 0;
		},
	};
}
var Iy = /\s+/g,
	Ly = /[-/^$*+?.()|[\]{}]/g;
function Ay(y) {
	return y.replaceAll(Ly, String.raw`\$&`);
}
function a(y, T) {
	let j = T.map((Q) => (typeof Q === "string" ? new RegExp(Ay(Q), "g") : new RegExp(Q.source, "g")));
	return {
		probability: y,
		scan(Q) {
			let q = Q.replace(Iy, ""),
				$ = 0;
			for (let Y of j) {
				Y.lastIndex = 0;
				let H = q.match(Y);
				if (H) $ += H.length;
			}
			return $;
		},
	};
}
var Sy = /\s/;
function i(y, T) {
	let j = new Set(T);
	return {
		probability: y,
		scan(Q) {
			for (let q = Q.length - 1; q >= 0; q -= 1) {
				let $ = Q.charAt(q);
				if (j.has($)) return 1;
				if (!Sy.test($) && $ !== "*" && $ !== "/") return 0;
			}
			return 0;
		},
	};
}
var Ny = /[ \t(),{}]/;
function f(y, T) {
	let j = new Set(T);
	return {
		probability: y,
		scan(Q) {
			let q = Q.split(Ny),
				$ = 0;
			for (let Y of q) if (j.has(Y)) $ += 1;
			return $;
		},
	};
}
var wy = [
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
	Ey = ["++", "||", "&&", "===", "?.", "??"],
	Cy = [
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
	hy = ["}", ";", "{"];
function o() {
	return [i(0.95, hy), f(0.7, Ey), f(0.3, wy), a(0.95, Cy), d(0.5)];
}
var by = new Set(["BreakStatement", "ContinueStatement", "LabeledStatement"]);
function xy(y) {
	return by.has(y.type);
}
var Py = o();
function uy(y, T, j) {
	let Q = y.loc.start.line,
		q = T.loc.start.line;
	if (Q + 1 !== q) return !1;
	let $ = { end: y.end, loc: y.loc, range: y.range, start: y.start, type: y.type, value: y.value },
		Y = j.getTokenAfter($);
	if (!Y) return !0;
	return Y.loc.start.line > q;
}
function vy(y, T) {
	let j = [],
		Q = 0,
		q = [],
		$ = 0;
	for (let Y of y)
		if (Y.type === "Block") {
			if ($ > 0)
				((j[Q++] = {
					comments: q,
					value: q.map(({ value: H }) => H).join(`
`),
				}),
					(q = []),
					($ = 0));
			j[Q++] = { comments: [Y], value: Y.value };
		} else if ($ === 0) q[$++] = Y;
		else {
			let H = q.at(-1);
			if (H && uy(H, Y, T)) q[$++] = Y;
			else
				((j[Q++] = {
					comments: q,
					value: q.map(({ value: Z }) => Z).join(`
`),
				}),
					(q = [Y]),
					($ = 1));
		}
	if ($ > 0)
		j[Q] = {
			comments: q,
			value: q.map(({ value: Y }) => Y).join(`
`),
		};
	return j;
}
var py = /{/g,
	my = /}/g;
function ly(y) {
	let T = (y.match(py) ?? []).length,
		j = (y.match(my) ?? []).length,
		Q = T - j;
	if (Q > 0) return y + "}".repeat(Q);
	if (Q < 0) return "{".repeat(-Q) + y;
	return y;
}
function cy(y) {
	let T = y.split(`
`);
	return r(Py, T);
}
function sy(y) {
	if (y.type !== "ReturnStatement" && y.type !== "ThrowStatement") return !1;
	return y.argument?.type === "Identifier";
}
function ry(y) {
	return y.type === "UnaryExpression" && (y.operator === "-" || y.operator === "+");
}
function dy(y) {
	if (y.type !== "Literal") return !1;
	return typeof y.value === "string" || typeof y.value === "number";
}
function ay(y) {
	return B(y) && typeof y.type === "string";
}
function iy(y) {
	let T = [];
	for (let j of y) if (ay(j)) T.push(j);
	return T;
}
function oy(y, T) {
	if (y.type !== "ExpressionStatement") return !1;
	let { expression: j } = y;
	return j.type === "Identifier" || j.type === "SequenceExpression" || ry(j) || dy(j) || !T.trimEnd().endsWith(";");
}
function ty(y, T) {
	if (y.length !== 1) return !1;
	let j = y.at(0);
	if (!j) return !1;
	return xy(j) || sy(j) || oy(j, T);
}
var ny = [/A 'return' statement can only be used within a function body/];
function ey(y) {
	for (let T of y) {
		let j = !1;
		for (let Q of ny)
			if (Q.test(T.message)) {
				j = !0;
				break;
			}
		if (!j) return !1;
	}
	return !0;
}
function n(y) {
	return (y.errors.length === 0 || ey(y.errors)) && y.program.body.length > 0;
}
function yT(y, T) {
	let j = fy(T),
		Q = `file${j || ".js"}`,
		q = t(Q, y);
	if (n(q)) return q;
	if (j !== ".tsx" && j !== ".jsx") {
		let $ = t("file.tsx", y);
		if (n($)) return $;
	}
	return;
}
function TT(y, T) {
	if (!cy(y)) return !1;
	let j = yT(y, T);
	if (!j) return !1;
	let Q = iy(j.program.body);
	return !ty(Q, y);
}
var jT = M({
		create(y) {
			return {
				"Program:exit"() {
					let T = y.sourceCode.getAllComments(),
						j = vy(T, y.sourceCode);
					for (let Q of j) {
						let q = Q.value.trim();
						if (q === "}") continue;
						let $ = ly(q);
						if (!TT($, y.filename)) continue;
						let Y = Q.comments.at(0),
							H = Q.comments.at(-1);
						if (!Y || !H) continue;
						y.report({
							loc: { end: H.loc.end, start: Y.loc.start },
							messageId: "commentedCode",
							suggest: [
								{
									desc: "Remove this commented out code",
									fix(Z) {
										return Z.removeRange([Y.range[0], H.range[1]]);
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
	e = jT;
var Zy = "replace",
	$y = "suggestion",
	yy = "A more descriptive name will do too.",
	QT = {
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
	qT = {
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
	ZT = ["i18n", "l10n"],
	$T = /(?=[A-Z])|(?<=[_.-])/,
	YT = new Set([
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
	kT = /^[A-Za-z]+$/;
function x(y) {
	return y === y.toUpperCase();
}
function Yy(y) {
	return x(y.charAt(0));
}
function Ty(y) {
	return y.charAt(0).toUpperCase() + y.slice(1);
}
function jy(y) {
	return y.charAt(0).toLowerCase() + y.slice(1);
}
function W(y) {
	return B(y) && "name" in y && typeof y.name === "string";
}
function L(y) {
	return W(y) && y.type === "Identifier";
}
function ky(y) {
	return B(y) && y.type === "JSXIdentifier" && "name" in y;
}
function BT(y) {
	return B(y) && y.type === "ImportDeclaration";
}
function S(y) {
	return B(y) && y.type === "VariableDeclarator";
}
function A(y) {
	return B(y) && y.type === "Literal" && typeof y.value === "string";
}
function XT(y) {
	return B(y) && y.type === "CallExpression";
}
function By(y) {
	if (!XT(y)) return !1;
	if (y.optional) return !1;
	let { callee: T } = y;
	if (!L(T) || T.name !== "require" || y.arguments.length !== 1) return !1;
	let [j] = y.arguments;
	return j !== void 0 && A(j);
}
function b(y) {
	if (y.length === 0 || YT.has(y)) return !1;
	let T = y.codePointAt(0);
	if (T === void 0 || !Xy(T)) return !1;
	let j = T > 65535 ? 2 : 1;
	while (j < y.length) {
		let Q = y.codePointAt(j);
		if (Q === void 0 || !FT(Q)) return !1;
		j += Q > 65535 ? 2 : 1;
	}
	return !0;
}
function Xy(y) {
	if ((y >= 65 && y <= 90) || (y >= 97 && y <= 122)) return !0;
	if (y === 36 || y === 95) return !0;
	if (y >= 192 && y <= 214) return !0;
	if (y >= 216 && y <= 246) return !0;
	if (y >= 248 && y <= 767) return !0;
	if (y >= 880 && y <= 893) return !0;
	if (y >= 895 && y <= 8191) return !0;
	if (y >= 8204 && y <= 8205) return !0;
	if (y >= 8304 && y <= 8591) return !0;
	if (y >= 11264 && y <= 12271) return !0;
	if (y >= 12289 && y <= 55295) return !0;
	if (y >= 63744 && y <= 64255) return !0;
	if (y >= 64512 && y <= 65023) return !0;
	if (y >= 65136 && y <= 65279) return !0;
	if (y >= 65313 && y <= 65338) return !0;
	if (y >= 65345 && y <= 65370) return !0;
	if (y >= 65382 && y <= 65500) return !0;
	return !1;
}
function FT(y) {
	if (Xy(y)) return !0;
	if (y >= 48 && y <= 57) return !0;
	if (y === 8204 || y === 8205) return !0;
	if (y >= 768 && y <= 865) return !0;
	if (y >= 8240 && y <= 8266) return !0;
	return !1;
}
function Fy(y) {
	let T = [y];
	for (let j of y.childScopes) {
		let Q = Fy(j);
		for (let q of Q) T.push(q);
	}
	return T;
}
function HT(y, T) {
	let j = T;
	while (j !== null) {
		let Q = j.set.get(y);
		if (Q !== void 0) return Q;
		j = j.upper;
	}
	return;
}
function KT(y, T) {
	return !T.some((j) => HT(y, j) !== void 0);
}
function OT(y, T, j = () => !0) {
	let Q = y;
	if (!b(Q)) {
		if (((Q = `${Q}_`), !b(Q))) return;
	}
	while (!KT(Q, T) || !j(Q, T)) Q = `${Q}_`;
	return Q;
}
function Hy(y) {
	let T = new Set();
	for (let j of y.identifiers) T.add(j);
	for (let { identifier: j } of y.references) T.add(j);
	return [...T];
}
function JT(y, T) {
	return y.range[0] === T.range[0] && y.range[1] === T.range[1];
}
function VT(y) {
	let { parent: T } = y;
	if (!Ky(T) || T.local !== y) return !1;
	return JT(T.local, T.imported);
}
function Ky(y) {
	return B(y) && y.type === "ImportSpecifier";
}
function UT(y) {
	return B(y) && y.type === "ExportSpecifier";
}
function N(y) {
	return B(y) && y.type === "Property";
}
function MT(y) {
	if (!W(y)) return !1;
	let { parent: T } = y;
	return N(T) && T.shorthand && T.value === y;
}
function WT(y) {
	if (!W(y)) return !1;
	let { parent: T } = y;
	if ((GT(T) && T.local === y) || (zT(T) && T.local === y)) return !0;
	if (Ky(T) && T.local === y) {
		let { imported: j } = T;
		if (L(j) && j.name === "default") return !0;
	}
	if (S(T) && T.id === y && By(T.init)) return !0;
	return !1;
}
function GT(y) {
	return B(y) && y.type === "ImportDefaultSpecifier";
}
function zT(y) {
	return B(y) && y.type === "ImportNamespaceSpecifier";
}
function RT(y) {
	if (!W(y)) return !1;
	let { parent: T } = y;
	if (T === void 0 || T === null) return !1;
	if (S(T) && T.id === y) {
		let j = T.parent;
		if (!_T(j)) return !1;
		let Q = j.parent;
		return D(Q);
	}
	if (DT(T) && T.id === y) return D(T.parent);
	if (gT(T) && T.id === y) return D(T.parent);
	if (IT(T) && T.id === y) return D(T.parent);
	return !1;
}
function _T(y) {
	return B(y) && y.type === "VariableDeclaration";
}
function D(y) {
	return B(y) && y.type === "ExportNamedDeclaration";
}
function DT(y) {
	return B(y) && typeof y.type === "string" && (y.type === "FunctionDeclaration" || y.type === "FunctionExpression");
}
function gT(y) {
	return B(y) && typeof y.type === "string" && (y.type === "ClassDeclaration" || y.type === "ClassExpression");
}
function IT(y) {
	return B(y) && y.type === "TSTypeAliasDeclaration";
}
function LT(y) {
	return Hy(y).every((T) => !RT(T) && !ky(T));
}
function AT(y) {
	if (!W(y)) return !1;
	let { parent: T } = y;
	if (ST(T) && T.property === y && !T.computed) {
		let j = T.parent;
		if (NT(j) && j.left === T) return !0;
	}
	if (N(T) && T.key === y && !T.computed && !T.shorthand && Oy(T.parent)) return !0;
	if (UT(T) && T.exported === y && T.local !== y) return !0;
	return (wT(T) || ET(T)) && T.key === y && !T.computed;
}
function ST(y) {
	return B(y) && y.type === "MemberExpression";
}
function NT(y) {
	return B(y) && y.type === "AssignmentExpression";
}
function Oy(y) {
	return B(y) && y.type === "ObjectExpression";
}
function wT(y) {
	return (
		B(y) && typeof y.type === "string" && (y.type === "MethodDefinition" || y.type === "TSAbstractMethodDefinition")
	);
}
function ET(y) {
	return (
		B(y) &&
		typeof y.type === "string" &&
		(y.type === "PropertyDefinition" || y.type === "TSAbstractPropertyDefinition")
	);
}
function CT(y) {
	if (!W(y)) return !1;
	let { parent: T } = y;
	return N(T) && T.key === y && !T.computed && !T.shorthand && Oy(T.parent);
}
function hT(y) {
	if (y.type === "ImportBinding") {
		let { parent: T } = y;
		if (T !== null && BT(T) && A(T.source)) return T.source.value;
	}
	if (y.type === "Variable") {
		let { node: T } = y;
		if (S(T) && By(T.init)) {
			let [j] = T.init.arguments;
			if (j !== void 0 && A(j)) return j.value;
		}
	}
	return;
}
function fT(y) {
	let T = hT(y);
	if (T === void 0) return !1;
	return !T.includes("node_modules") && (T.startsWith(".") || T.startsWith("/"));
}
function Qy(y, T) {
	if (y === !1) return !1;
	return y === "internal" ? fT(T) : !0;
}
function bT(y) {
	if (y.defs.length !== 1) return !1;
	return y.defs[0]?.type === "ClassName";
}
function xT() {
	return {
		allowList: new Map(Object.entries(qT)),
		checkDefaultAndNamespaceImports: "internal",
		checkFilenames: !0,
		checkProperties: !1,
		checkShorthandImports: "internal",
		checkShorthandProperties: !1,
		checkVariables: !0,
		ignore: ZT.map((y) => new RegExp(y, "u")),
		replacements: new Map(Object.entries(QT).map(([y, T]) => [y, new Map(Object.entries(T))])),
	};
}
function qy(y, T) {
	if (x(y) || T.allowList.get(y) === !0) return [];
	let j = T.replacements.get(jy(y)) ?? T.replacements.get(y) ?? T.replacements.get(Ty(y));
	if (!j) return [];
	let Q = Yy(y) ? Ty : jy,
		q = [...j.keys()].filter(($) => j.get($) ?? !1).map(Q);
	return q.length > 0 ? [...q].toSorted() : [];
}
function PT(y, T) {
	let j = T.replacements.get(y);
	if (!j) return !1;
	for (let Q of j.values()) if (Q) return !0;
	return !1;
}
function uT(y, T = Number.POSITIVE_INFINITY) {
	let j = y.reduce(($, { length: Y }) => $ * Y, 1),
		Q = Math.min(j, T);
	return {
		samples: Array.from({ length: Q }, ($, Y) => {
			let H = Y,
				Z = [];
			for (let k = y.length - 1; k >= 0; k -= 1) {
				let X = y[k] ?? [],
					O = X.length,
					F = H % O;
				H = (H - F) / O;
				let J = X[F];
				if (J !== void 0) Z.unshift(J);
			}
			return Z;
		}),
		total: j,
	};
}
function g(y, T, j = 3) {
	let { allowList: Q, ignore: q } = T;
	if (x(y) || Q.get(y) === !0 || q.some((F) => F.test(y))) return { total: 0 };
	let $ = qy(y, T);
	if ($.length > 0) return { samples: $.slice(0, j), total: $.length };
	let Y = y.split($T).filter(Boolean),
		H = !1,
		Z = [],
		k = 0;
	for (let F of Y) {
		let J = qy(F, T);
		if (J.length > 0) ((H = !0), (Z[k++] = J));
		else Z[k++] = [F];
	}
	if (!H) return { total: 0 };
	let { samples: X, total: O } = uT(Z, j);
	for (let F of X)
		for (let J = F.length - 1; J > 0; J -= 1) {
			let G = F[J] ?? "";
			if (kT.test(G) && F[J - 1]?.endsWith(G) === !0) F.splice(J, 1);
		}
	return { samples: X.map((F) => F.join("")), total: O };
}
function I(y, T, j) {
	let { samples: Q = [], total: q } = T;
	if (q === 1) return { data: { discouragedName: y, nameTypeText: j, replacement: Q[0] ?? "" }, messageId: Zy };
	let $ = Q.map((H) => `\`${H}\``).join(", "),
		Y = q - Q.length;
	if (Y > 0) $ += `, ... (${Y > 99 ? "99+" : Y} more omitted)`;
	return { data: { discouragedName: y, nameTypeText: j, replacementsText: $ }, messageId: $y };
}
var vT = M({
		create(y) {
			let T = xT(),
				j = y.physicalFilename,
				Q = new WeakMap(),
				q = (Z, k) =>
					k.every((X) => {
						return !Q.get(X)?.has(Z);
					});
			function $(Z) {
				if (Z.defs.length === 0) return;
				let [k] = Z.defs;
				if (k === void 0) return;
				let X = k.name;
				if (!L(X)) return;
				if ((WT(X) && !Qy(T.checkDefaultAndNamespaceImports, k)) || (VT(X) && !Qy(T.checkShorthandImports, k)))
					return;
				if (!T.checkShorthandProperties && MT(X)) return;
				let O = k.type === "Variable" && S(k.node) && k.node.init === null,
					F =
						k.type === "Parameter" &&
						Z.scope.type === "function" &&
						Z.scope.block.type === "ArrowFunctionExpression",
					J = O || F,
					G = (K, U) => {
						if (!q(K, U)) return !1;
						if (J && K === "arguments") return !1;
						return !0;
					},
					V = g(Z.name, T);
				if (V.total === 0 || !V.samples) return;
				let { references: w } = Z,
					R = [...w.map((K) => K.from), Z.scope],
					P = 0,
					_ = V.samples
						.map((K) => {
							let U = OT(K, R, G);
							if (U === void 0) return;
							if (U !== K && PT(K, T)) {
								P += 1;
								return;
							}
							return U;
						})
						.filter((K) => typeof K === "string" && K.length > 0),
					u = _.length > 0 ? _ : V.samples,
					E =
						typeof V.samples?.length === "number" && V.samples.length === V.total
							? Math.max(0, V.total - P)
							: V.total,
					Vy = Z.name === "fn" && E > 1 ? u.map((K) => (K === "function_" ? "function" : K)) : u,
					v = I(X.name, { samples: Vy, total: E }, "variable");
				if (E === 1 && _.length === 1 && LT(Z)) {
					let [K] = _;
					if (K !== void 0) {
						for (let z of R) {
							if (!Q.has(z)) Q.set(z, new Set());
							Q.get(z)?.add(K);
						}
						let U = Hy(Z);
						y.report({
							...v,
							fix(z) {
								let C = [],
									Uy = 0;
								for (let My of U) {
									let p = z.replaceText(My, K);
									if (p === void 0) continue;
									C[Uy++] = p;
								}
								return C;
							},
							node: X,
						});
						return;
					}
				}
				y.report({ ...v, node: X });
			}
			function Y(Z) {
				if (!bT(Z)) {
					$(Z);
					return;
				}
				if (Z.scope.type === "class") {
					let [k] = Z.defs;
					if (k === void 0) {
						$(Z);
						return;
					}
					let X = k.name;
					if (!L(X)) {
						$(Z);
						return;
					}
					$(Z);
				}
			}
			function H(Z) {
				for (let k of Fy(Z)) for (let X of k.variables) Y(X);
			}
			return {
				Identifier(Z) {
					if (!T.checkProperties || !W(Z) || Z.name === "__proto__") return;
					let k = g(Z.name, T);
					if (k.total === 0 || !AT(Z)) return;
					let X = I(Z.name, k, "property");
					if (k.total === 1 && k.samples && CT(Z)) {
						let [O] = k.samples,
							{ parent: F } = Z;
						if (O !== void 0 && N(F) && A(F.value) && b(O)) {
							y.report({
								...X,
								fix(J) {
									return J.replaceText(Z, O);
								},
								node: Z,
							});
							return;
						}
					}
					y.report({ ...X, node: Z });
				},
				JSXOpeningElement(Z) {
					if (!T.checkVariables || !ky(Z.name) || !Yy(Z.name.name)) return;
					let k = g(Z.name.name, T);
					if (k.total === 0) return;
					let X = I(Z.name.name, k, "variable");
					y.report({ ...X, node: Z.name });
				},
				"Program:exit"(Z) {
					if (T.checkFilenames && j !== "<input>" && j !== "<text>") {
						let X = Math.max(j.lastIndexOf("/"), j.lastIndexOf("\\")),
							O = j.slice(X + 1),
							F = O.lastIndexOf("."),
							J = F === -1 ? "" : O.slice(F),
							G = F === -1 ? O : O.slice(0, F),
							V = g(G, T);
						if (V.total > 0 && V.samples) {
							let w = V.samples.map((R) => `${R}${J}`);
							y.report({ ...I(O, { samples: w, total: V.total }, "filename"), node: Z });
						}
					}
					if (!T.checkVariables) return;
					let k = y.sourceCode.getScope(Z);
					H(k);
				},
			};
		},
		meta: {
			docs: { description: "Prevent abbreviations.", recommended: !1 },
			fixable: "code",
			messages: {
				[Zy]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${yy}`,
				[$y]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${yy}`,
			},
			type: "suggestion",
		},
	}),
	Jy = vT;
var pT = h({
		meta: { name: "small-rules" },
		rules: { "ban-types": c, "no-commented-code": e, "prevent-abbreviations": Jy },
	}),
	gj = pT;
export { gj as default };
