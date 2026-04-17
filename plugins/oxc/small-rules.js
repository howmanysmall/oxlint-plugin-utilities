import { definePlugin as mj } from "oxlint-plugin-utilities";
import { defineRule as Oy } from "oxlint-plugin-utilities";
function B(y) {
	return typeof y === "object" && y !== null && !Array.isArray(y);
}
function u(y) {
	if (!Array.isArray(y)) return !1;
	for (let j of y) if (typeof j !== "string") return !1;
	return !0;
}
function p(y) {
	if (!B(y)) return !1;
	for (let j of Object.values(y)) if (typeof j !== "string") return !1;
	return !0;
}
var zy = new Map([["omit", { originalName: "Omit", replacementName: "Except" }]]);
function Gy(y) {
	let j = new Map(zy);
	if (!B(y) || !("bannedTypes" in y)) return j;
	let { bannedTypes: Q } = y;
	if (Q === void 0) return j;
	if (u(Q)) {
		for (let q of Q) j.set(q.toLowerCase(), { originalName: q, replacementName: void 0 });
		return j;
	}
	if (p(Q)) for (let [q, Z] of Object.entries(Q)) j.set(q.toLowerCase(), { originalName: q, replacementName: Z });
	return j;
}
function ky(y) {
	if (y.type === "Identifier") return y.name;
	if (y.type === "TSQualifiedName") return y.right.name;
	return;
}
var Fy = Oy({
		create(y) {
			let j = Gy(y.options[0]);
			if (j.size === 0) return {};
			return {
				TSTypeReference(Q) {
					let q = ky(Q.typeName);
					if (q === void 0) return;
					let Z = j.get(q.toLowerCase());
					if (Z === void 0) return;
					if (Z.replacementName !== void 0 && Z.replacementName !== "") {
						y.report({
							data: { replacementName: Z.replacementName, typeName: Z.originalName },
							messageId: "bannedTypeWithReplacement",
							node: Q.typeName,
						});
						return;
					}
					y.report({ data: { typeName: Z.originalName }, messageId: "bannedType", node: Q.typeName });
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
	m = Fy;
import { extname as hy } from "node:path";
import { parseSync as i } from "oxc-parser";
import { defineRule as by } from "oxlint-plugin-utilities";
function l(y, j) {
	let Q = y.scan(j);
	return Q === 0 ? 0 : 1 - (1 - y.probability) ** Q;
}
var _y = 0.9;
function Ay(y, j) {
	let Q = 0;
	for (let q of y) {
		let Z = l(q, j);
		Q = 1 - (1 - Q) * (1 - Z);
	}
	return Q;
}
function Dy(y, j) {
	return Ay(y, j) >= _y;
}
function c(y, j) {
	return j.some((Q) => Dy(y, Q));
}
function s(y) {
	return {
		probability: y,
		scan(j) {
			for (let Q = 0; Q < j.length - 1; Q += 1) {
				let q = j.charAt(Q),
					Z = j.charAt(Q + 1);
				if (q === q.toLowerCase() && Z === Z.toUpperCase() && Z !== Z.toLowerCase()) return 1;
			}
			return 0;
		},
	};
}
var Iy = /\s+/g,
	Ny = /[-/^$*+?.()|[\]{}]/g;
function Ly(y) {
	return y.replaceAll(Ny, String.raw`\$&`);
}
function r(y, j) {
	let Q = j.map((q) => (typeof q === "string" ? new RegExp(Ly(q), "g") : new RegExp(q.source, "g")));
	return {
		probability: y,
		scan(q) {
			let Z = q.replace(Iy, ""),
				Y = 0;
			for (let K of Q) {
				K.lastIndex = 0;
				let U = Z.match(K);
				if (U) Y += U.length;
			}
			return Y;
		},
	};
}
var wy = /\s/;
function d(y, j) {
	let Q = new Set(j);
	return {
		probability: y,
		scan(q) {
			for (let Z = q.length - 1; Z >= 0; Z -= 1) {
				let Y = q.charAt(Z);
				if (Q.has(Y)) return 1;
				if (!wy.test(Y) && Y !== "*" && Y !== "/") return 0;
			}
			return 0;
		},
	};
}
var gy = /[ \t(),{}]/;
function C(y, j) {
	let Q = new Set(j);
	return {
		probability: y,
		scan(q) {
			let Z = q.split(gy),
				Y = 0;
			for (let K of Z) if (Q.has(K)) Y += 1;
			return Y;
		},
	};
}
var Sy = [
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
	Ry = ["++", "||", "&&", "===", "?.", "??"],
	Ey = [
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
	Cy = ["}", ";", "{"];
function a() {
	return [d(0.95, Cy), C(0.7, Ry), C(0.3, Sy), r(0.95, Ey), s(0.5)];
}
var fy = new Set(["BreakStatement", "ContinueStatement", "LabeledStatement"]);
function Py(y) {
	return fy.has(y.type);
}
var vy = a();
function xy(y, j, Q) {
	let q = y.loc.start.line,
		Z = j.loc.start.line;
	if (q + 1 !== Z) return !1;
	let Y = { end: y.end, loc: y.loc, range: y.range, start: y.start, type: y.type, value: y.value },
		K = Q.getTokenAfter(Y);
	if (!K) return !0;
	return K.loc.start.line > Z;
}
function uy(y, j) {
	let Q = [],
		q = 0,
		Z = [],
		Y = 0;
	for (let K of y)
		if (K.type === "Block") {
			if (Y > 0)
				((Q[q++] = {
					comments: Z,
					value: Z.map(({ value: U }) => U).join(`
`),
				}),
					(Z = []),
					(Y = 0));
			Q[q++] = { comments: [K], value: K.value };
		} else if (Y === 0) Z[Y++] = K;
		else {
			let U = Z.at(-1);
			if (U && xy(U, K, j)) Z[Y++] = K;
			else
				((Q[q++] = {
					comments: Z,
					value: Z.map(({ value: $ }) => $).join(`
`),
				}),
					(Z = [K]),
					(Y = 1));
		}
	if (Y > 0)
		Q[q] = {
			comments: Z,
			value: Z.map(({ value: K }) => K).join(`
`),
		};
	return Q;
}
var py = /{/g,
	my = /}/g;
function ly(y) {
	let j = (y.match(py) ?? []).length,
		Q = (y.match(my) ?? []).length,
		q = j - Q;
	if (q > 0) return y + "}".repeat(q);
	if (q < 0) return "{".repeat(-q) + y;
	return y;
}
function cy(y) {
	let j = y.split(`
`);
	return c(vy, j);
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
	let j = [];
	for (let Q of y) if (ay(Q)) j.push(Q);
	return j;
}
function oy(y, j) {
	if (y.type !== "ExpressionStatement") return !1;
	let { expression: Q } = y;
	return Q.type === "Identifier" || Q.type === "SequenceExpression" || ry(Q) || dy(Q) || !j.trimEnd().endsWith(";");
}
function ty(y, j) {
	if (y.length !== 1) return !1;
	let Q = y.at(0);
	if (!Q) return !1;
	return Py(Q) || sy(Q) || oy(Q, j);
}
var ny = [/A 'return' statement can only be used within a function body/];
function ey(y) {
	for (let j of y) {
		let Q = !1;
		for (let q of ny)
			if (q.test(j.message)) {
				Q = !0;
				break;
			}
		if (!Q) return !1;
	}
	return !0;
}
function o(y) {
	return (y.errors.length === 0 || ey(y.errors)) && y.program.body.length > 0;
}
function yj(y, j) {
	let Q = hy(j),
		q = `file${Q || ".js"}`,
		Z = i(q, y);
	if (o(Z)) return Z;
	if (Q !== ".tsx" && Q !== ".jsx") {
		let Y = i("file.tsx", y);
		if (o(Y)) return Y;
	}
	return;
}
function jj(y, j) {
	if (!cy(y)) return !1;
	let Q = yj(y, j);
	if (!Q) return !1;
	let q = iy(Q.program.body);
	return !ty(q, y);
}
var Qj = by({
		create(y) {
			return {
				"Program:exit"() {
					let j = y.sourceCode.getAllComments(),
						Q = uy(j, y.sourceCode);
					for (let q of Q) {
						let Z = q.value.trim();
						if (Z === "}") continue;
						let Y = ly(Z);
						if (!jj(Y, y.filename)) continue;
						let K = q.comments.at(0),
							U = q.comments.at(-1);
						if (!K || !U) continue;
						y.report({
							loc: { end: U.loc.end, start: K.loc.start },
							messageId: "commentedCode",
							suggest: [
								{
									desc: "Remove this commented out code",
									fix($) {
										return $.removeRange([K.range[0], U.range[1]]);
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
	t = Qj;
import { defineRule as qj } from "oxlint-plugin-utilities";
var qy = "replace",
	Zy = "suggestion",
	n = "A more descriptive name will do too.",
	Zj = {
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
	$j = {
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
	Yj = ["i18n", "l10n"],
	Kj = /(?=[A-Z])|(?<=[_.-])/,
	Xj = new Set([
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
	Bj = /^[A-Za-z]+$/;
function b(y) {
	return y === y.toUpperCase();
}
function $y(y) {
	return b(y.charAt(0));
}
function e(y) {
	return y.charAt(0).toUpperCase() + y.slice(1);
}
function yy(y) {
	return y.charAt(0).toLowerCase() + y.slice(1);
}
function z(y) {
	return B(y) && "name" in y && typeof y.name === "string";
}
function N(y) {
	return z(y) && y.type === "Identifier";
}
function Yy(y) {
	return B(y) && y.type === "JSXIdentifier" && "name" in y;
}
function Hj(y) {
	return B(y) && y.type === "ImportDeclaration";
}
function w(y) {
	return B(y) && y.type === "VariableDeclarator";
}
function L(y) {
	return B(y) && y.type === "Literal" && typeof y.value === "string";
}
function Jj(y) {
	return B(y) && y.type === "CallExpression";
}
function Ky(y) {
	if (!Jj(y)) return !1;
	if (y.optional) return !1;
	let { callee: j } = y;
	if (!N(j) || j.name !== "require" || y.arguments.length !== 1) return !1;
	let [Q] = y.arguments;
	return Q !== void 0 && L(Q);
}
function h(y) {
	if (y.length === 0 || Xj.has(y)) return !1;
	let j = y.codePointAt(0);
	if (j === void 0 || !Xy(j)) return !1;
	let Q = j > 65535 ? 2 : 1;
	while (Q < y.length) {
		let q = y.codePointAt(Q);
		if (q === void 0 || !Uj(q)) return !1;
		Q += q > 65535 ? 2 : 1;
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
function Uj(y) {
	if (Xy(y)) return !0;
	if (y >= 48 && y <= 57) return !0;
	if (y === 8204 || y === 8205) return !0;
	if (y >= 768 && y <= 865) return !0;
	if (y >= 8240 && y <= 8266) return !0;
	return !1;
}
function By(y) {
	let j = [y];
	for (let Q of y.childScopes) {
		let q = By(Q);
		for (let Z of q) j.push(Z);
	}
	return j;
}
function Vj(y, j) {
	let Q = j;
	while (Q !== null) {
		let q = Q.set.get(y);
		if (q !== void 0) return q;
		Q = Q.upper;
	}
	return;
}
function Tj(y, j) {
	return !j.some((Q) => Vj(y, Q) !== void 0);
}
function Mj(y, j, Q = () => !0) {
	let q = y;
	if (!h(q)) {
		if (((q = `${q}_`), !h(q))) return;
	}
	while (!Tj(q, j) || !Q(q, j)) q = `${q}_`;
	return q;
}
function Hy(y) {
	let j = new Set();
	for (let Q of y.identifiers) j.add(Q);
	for (let { identifier: Q } of y.references) j.add(Q);
	return [...j];
}
function Wj(y, j) {
	return y.range[0] === j.range[0] && y.range[1] === j.range[1];
}
function Oj(y) {
	let { parent: j } = y;
	if (!Jy(j) || j.local !== y) return !1;
	return Wj(j.local, j.imported);
}
function Jy(y) {
	return B(y) && y.type === "ImportSpecifier";
}
function zj(y) {
	return B(y) && y.type === "ExportSpecifier";
}
function g(y) {
	return B(y) && y.type === "Property";
}
function Gj(y) {
	if (!z(y)) return !1;
	let { parent: j } = y;
	return g(j) && j.shorthand && j.value === y;
}
function kj(y) {
	if (!z(y)) return !1;
	let { parent: j } = y;
	if ((Fj(j) && j.local === y) || (_j(j) && j.local === y)) return !0;
	if (Jy(j) && j.local === y) {
		let { imported: Q } = j;
		if (N(Q) && Q.name === "default") return !0;
	}
	if (w(j) && j.id === y && Ky(j.init)) return !0;
	return !1;
}
function Fj(y) {
	return B(y) && y.type === "ImportDefaultSpecifier";
}
function _j(y) {
	return B(y) && y.type === "ImportNamespaceSpecifier";
}
function Aj(y) {
	if (!z(y)) return !1;
	let { parent: j } = y;
	if (j === void 0 || j === null) return !1;
	if (w(j) && j.id === y) {
		let Q = j.parent;
		if (!Dj(Q)) return !1;
		let q = Q.parent;
		return A(q);
	}
	if (Ij(j) && j.id === y) return A(j.parent);
	if (Nj(j) && j.id === y) return A(j.parent);
	if (Lj(j) && j.id === y) return A(j.parent);
	return !1;
}
function Dj(y) {
	return B(y) && y.type === "VariableDeclaration";
}
function A(y) {
	return B(y) && y.type === "ExportNamedDeclaration";
}
function Ij(y) {
	return B(y) && typeof y.type === "string" && (y.type === "FunctionDeclaration" || y.type === "FunctionExpression");
}
function Nj(y) {
	return B(y) && typeof y.type === "string" && (y.type === "ClassDeclaration" || y.type === "ClassExpression");
}
function Lj(y) {
	return B(y) && y.type === "TSTypeAliasDeclaration";
}
function wj(y) {
	return Hy(y).every((j) => !Aj(j) && !Yy(j));
}
function gj(y) {
	if (!z(y)) return !1;
	let { parent: j } = y;
	if (Sj(j) && j.property === y && !j.computed) {
		let Q = j.parent;
		if (Rj(Q) && Q.left === j) return !0;
	}
	if (g(j) && j.key === y && !j.computed && !j.shorthand && Uy(j.parent)) return !0;
	if (zj(j) && j.exported === y && j.local !== y) return !0;
	return (Ej(j) || Cj(j)) && j.key === y && !j.computed;
}
function Sj(y) {
	return B(y) && y.type === "MemberExpression";
}
function Rj(y) {
	return B(y) && y.type === "AssignmentExpression";
}
function Uy(y) {
	return B(y) && y.type === "ObjectExpression";
}
function Ej(y) {
	return (
		B(y) && typeof y.type === "string" && (y.type === "MethodDefinition" || y.type === "TSAbstractMethodDefinition")
	);
}
function Cj(y) {
	return (
		B(y) &&
		typeof y.type === "string" &&
		(y.type === "PropertyDefinition" || y.type === "TSAbstractPropertyDefinition")
	);
}
function hj(y) {
	if (!z(y)) return !1;
	let { parent: j } = y;
	return g(j) && j.key === y && !j.computed && !j.shorthand && Uy(j.parent);
}
function bj(y) {
	if (y.type === "ImportBinding") {
		let { parent: j } = y;
		if (j !== null && Hj(j) && L(j.source)) return j.source.value;
	}
	if (y.type === "Variable") {
		let { node: j } = y;
		if (w(j) && Ky(j.init)) {
			let [Q] = j.init.arguments;
			if (Q !== void 0 && L(Q)) return Q.value;
		}
	}
	return;
}
function fj(y) {
	let j = bj(y);
	if (j === void 0) return !1;
	return !j.includes("node_modules") && (j.startsWith(".") || j.startsWith("/"));
}
function jy(y, j) {
	if (y === !1) return !1;
	return y === "internal" ? fj(j) : !0;
}
function Pj(y) {
	if (y.defs.length !== 1) return !1;
	return y.defs[0]?.type === "ClassName";
}
function vj() {
	return {
		allowList: new Map(Object.entries($j)),
		checkDefaultAndNamespaceImports: "internal",
		checkFilenames: !0,
		checkProperties: !1,
		checkShorthandImports: "internal",
		checkShorthandProperties: !1,
		checkVariables: !0,
		ignore: Yj.map((y) => new RegExp(y, "u")),
		replacements: new Map(Object.entries(Zj).map(([y, j]) => [y, new Map(Object.entries(j))])),
	};
}
function Qy(y, j) {
	if (b(y) || j.allowList.get(y) === !0) return [];
	let Q = j.replacements.get(yy(y)) ?? j.replacements.get(y) ?? j.replacements.get(e(y));
	if (!Q) return [];
	let q = $y(y) ? e : yy,
		Z = [...Q.keys()].filter((Y) => Q.get(Y) ?? !1).map(q);
	return Z.length > 0 ? [...Z].toSorted() : [];
}
function xj(y, j) {
	let Q = j.replacements.get(y);
	if (!Q) return !1;
	for (let q of Q.values()) if (q) return !0;
	return !1;
}
function uj(y, j = Number.POSITIVE_INFINITY) {
	let Q = y.reduce((Y, { length: K }) => Y * K, 1),
		q = Math.min(Q, j);
	return {
		samples: Array.from({ length: q }, (Y, K) => {
			let U = K,
				$ = [];
			for (let X = y.length - 1; X >= 0; X -= 1) {
				let H = y[X] ?? [],
					T = H.length,
					J = U % T;
				U = (U - J) / T;
				let M = H[J];
				if (M !== void 0) $.unshift(M);
			}
			return $;
		}),
		total: Q,
	};
}
function D(y, j, Q = 3) {
	let { allowList: q, ignore: Z } = j;
	if (b(y) || q.get(y) === !0 || Z.some((J) => J.test(y))) return { total: 0 };
	let Y = Qy(y, j);
	if (Y.length > 0) return { samples: Y.slice(0, Q), total: Y.length };
	let K = y.split(Kj).filter(Boolean),
		U = !1,
		$ = [],
		X = 0;
	for (let J of K) {
		let M = Qy(J, j);
		if (M.length > 0) ((U = !0), ($[X++] = M));
		else $[X++] = [J];
	}
	if (!U) return { total: 0 };
	let { samples: H, total: T } = uj($, Q);
	for (let J of H)
		for (let M = J.length - 1; M > 0; M -= 1) {
			let G = J[M] ?? "";
			if (Bj.test(G) && J[M - 1]?.endsWith(G) === !0) J.splice(M, 1);
		}
	return { samples: H.map((J) => J.join("")), total: T };
}
function I(y, j, Q) {
	let { samples: q = [], total: Z } = j;
	if (Z === 1) return { data: { discouragedName: y, nameTypeText: Q, replacement: q[0] ?? "" }, messageId: qy };
	let Y = q.map((U) => `\`${U}\``).join(", "),
		K = Z - q.length;
	if (K > 0) Y += `, ... (${K > 99 ? "99+" : K} more omitted)`;
	return { data: { discouragedName: y, nameTypeText: Q, replacementsText: Y }, messageId: Zy };
}
var pj = qj({
		create(y) {
			let j = vj(),
				Q = y.physicalFilename,
				q = new WeakMap(),
				Z = ($, X) =>
					X.every((H) => {
						return !q.get(H)?.has($);
					});
			function Y($) {
				if ($.defs.length === 0) return;
				let [X] = $.defs;
				if (X === void 0) return;
				let H = X.name;
				if (!N(H)) return;
				if ((kj(H) && !jy(j.checkDefaultAndNamespaceImports, X)) || (Oj(H) && !jy(j.checkShorthandImports, X)))
					return;
				if (!j.checkShorthandProperties && Gj(H)) return;
				let T = X.type === "Variable" && w(X.node) && X.node.init === null,
					J =
						X.type === "Parameter" &&
						$.scope.type === "function" &&
						$.scope.block.type === "ArrowFunctionExpression",
					M = T || J,
					G = (V, O) => {
						if (!Z(V, O)) return !1;
						if (M && V === "arguments") return !1;
						return !0;
					},
					W = D($.name, j);
				if (W.total === 0 || !W.samples) return;
				let { references: S } = $,
					F = [...S.map((V) => V.from), $.scope],
					f = 0,
					_ = W.samples
						.map((V) => {
							let O = Mj(V, F, G);
							if (O === void 0) return;
							if (O !== V && xj(V, j)) {
								f += 1;
								return;
							}
							return O;
						})
						.filter((V) => typeof V === "string" && V.length > 0),
					P = _.length > 0 ? _ : W.samples,
					R =
						typeof W.samples?.length === "number" && W.samples.length === W.total
							? Math.max(0, W.total - f)
							: W.total,
					Ty = $.name === "fn" && R > 1 ? P.map((V) => (V === "function_" ? "function" : V)) : P,
					v = I(H.name, { samples: Ty, total: R }, "variable");
				if (R === 1 && _.length === 1 && wj($)) {
					let [V] = _;
					if (V !== void 0) {
						for (let k of F) {
							if (!q.has(k)) q.set(k, new Set());
							q.get(k)?.add(V);
						}
						let O = Hy($);
						y.report({
							...v,
							fix(k) {
								let E = [],
									My = 0;
								for (let Wy of O) {
									let x = k.replaceText(Wy, V);
									if (x === void 0) continue;
									E[My++] = x;
								}
								return E;
							},
							node: H,
						});
						return;
					}
				}
				y.report({ ...v, node: H });
			}
			function K($) {
				if (!Pj($)) {
					Y($);
					return;
				}
				if ($.scope.type === "class") {
					let [X] = $.defs;
					if (X === void 0) {
						Y($);
						return;
					}
					let H = X.name;
					if (!N(H)) {
						Y($);
						return;
					}
					Y($);
				}
			}
			function U($) {
				for (let X of By($)) for (let H of X.variables) K(H);
			}
			return {
				Identifier($) {
					if (!j.checkProperties || !z($) || $.name === "__proto__") return;
					let X = D($.name, j);
					if (X.total === 0 || !gj($)) return;
					let H = I($.name, X, "property");
					if (X.total === 1 && X.samples && hj($)) {
						let [T] = X.samples,
							{ parent: J } = $;
						if (T !== void 0 && g(J) && L(J.value) && h(T)) {
							y.report({
								...H,
								fix(M) {
									return M.replaceText($, T);
								},
								node: $,
							});
							return;
						}
					}
					y.report({ ...H, node: $ });
				},
				JSXOpeningElement($) {
					if (!j.checkVariables || !Yy($.name) || !$y($.name.name)) return;
					let X = D($.name.name, j);
					if (X.total === 0) return;
					let H = I($.name.name, X, "variable");
					y.report({ ...H, node: $.name });
				},
				"Program:exit"($) {
					if (j.checkFilenames && Q !== "<input>" && Q !== "<text>") {
						let H = Math.max(Q.lastIndexOf("/"), Q.lastIndexOf("\\")),
							T = Q.slice(H + 1),
							J = T.lastIndexOf("."),
							M = J === -1 ? "" : T.slice(J),
							G = J === -1 ? T : T.slice(0, J),
							W = D(G, j);
						if (W.total > 0 && W.samples) {
							let S = W.samples.map((F) => `${F}${M}`);
							y.report({ ...I(T, { samples: S, total: W.total }, "filename"), node: $ });
						}
					}
					if (!j.checkVariables) return;
					let X = y.sourceCode.getScope($);
					U(X);
				},
			};
		},
		meta: {
			docs: { description: "Prevent abbreviations.", recommended: !1 },
			fixable: "code",
			messages: {
				[qy]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${n}`,
				[Zy]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${n}`,
			},
			type: "suggestion",
		},
	}),
	Vy = pj;
var lj = mj({
		meta: { name: "small-rules" },
		rules: { "ban-types": m, "no-commented-code": t, "prevent-abbreviations": Vy },
	}),
	_Q = lj;
export { _Q as default };
