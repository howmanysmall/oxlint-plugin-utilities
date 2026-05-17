import { extname as e } from "node:path";
import { parseSync as t } from "oxc-parser";
function n(e) {
	return typeof e == `object` && !!e && !Array.isArray(e);
}
function r(e) {
	if (!Array.isArray(e)) return !1;
	for (let t of e) if (typeof t != `string`) return !1;
	return !0;
}
function i(e) {
	if (!n(e)) return !1;
	for (let t of Object.values(e)) if (typeof t != `string`) return !1;
	return !0;
}
function a(e) {
	return e;
}
function o(e) {
	return e;
}
const s = new Map([[`omit`, { originalName: `Omit`, replacementName: `Except` }]]);
function c(e) {
	let t = new Map(s);
	if (!n(e) || !(`bannedTypes` in e)) return t;
	let { bannedTypes: a } = e;
	if (a === void 0) return t;
	if (r(a)) {
		for (let e of a) t.set(e.toLowerCase(), { originalName: e, replacementName: void 0 });
		return t;
	}
	if (i(a)) for (let [e, n] of Object.entries(a)) t.set(e.toLowerCase(), { originalName: e, replacementName: n });
	return t;
}
function l(e) {
	if (e.type === `Identifier`) return e.name;
	if (e.type === `TSQualifiedName`) return e.right.name;
}
const u = o({
	create(e) {
		let [t] = e.options,
			n = c(t);
		return n.size === 0
			? {}
			: {
					TSTypeReference(t) {
						let r = l(t.typeName);
						if (r === void 0) return;
						let i = n.get(r.toLowerCase());
						if (i !== void 0) {
							if (i.replacementName !== void 0 && i.replacementName !== ``) {
								e.report({
									data: { replacementName: i.replacementName, typeName: i.originalName },
									messageId: `bannedTypeWithReplacement`,
									node: t.typeName,
								});
								return;
							}
							e.report({ data: { typeName: i.originalName }, messageId: `bannedType`, node: t.typeName });
						}
					},
				};
	},
	meta: {
		docs: { description: `Ban configured TypeScript utility types, defaulting to Omit in favor of Except.` },
		messages: {
			bannedType: `Type '{{typeName}}' is banned by project configuration. Use the project-preferred alternative for this type.`,
			bannedTypeWithReplacement: `Type '{{typeName}}' is banned. Use '{{replacementName}}' instead.`,
		},
		schema: [
			{
				additionalProperties: !1,
				properties: {
					bannedTypes: {
						description: `Array of banned type names or an object mapping banned type names to preferred replacement names.`,
						oneOf: [
							{ items: { type: `string` }, type: `array` },
							{ additionalProperties: { type: `string` }, type: `object` },
						],
					},
				},
				type: `object`,
			},
		],
		type: `problem`,
	},
});
function d(e, t) {
	let n = e.scan(t);
	return n === 0 ? 0 : 1 - (1 - e.probability) ** n;
}
function f(e, t) {
	let n = 0;
	for (let r of e) {
		let e = d(r, t);
		n = 1 - (1 - n) * (1 - e);
	}
	return n;
}
function p(e, t) {
	return f(e, t) >= 0.9;
}
function m(e, t) {
	return t.some((t) => p(e, t));
}
function h(e) {
	return {
		probability: e,
		scan(e) {
			for (let t = 0; t < e.length - 1; t += 1) {
				let n = e.charAt(t),
					r = e.charAt(t + 1);
				if (n === n.toLowerCase() && r === r.toUpperCase() && r !== r.toLowerCase()) return 1;
			}
			return 0;
		},
	};
}
const g = /\s+/g,
	ee = /[-/^$*+?.()|[\]{}]/g;
function _(e) {
	return e.replaceAll(ee, String.raw`\$&`);
}
function v(e, t) {
	let n = t.map((e) => (typeof e == `string` ? new RegExp(_(e), `g`) : new RegExp(e.source, `g`)));
	return {
		probability: e,
		scan(e) {
			let t = e.replace(g, ``),
				r = 0;
			for (let e of n) {
				e.lastIndex = 0;
				let n = t.match(e);
				n && (r += n.length);
			}
			return r;
		},
	};
}
const y = /\s/;
function b(e, t) {
	let n = new Set(t);
	return {
		probability: e,
		scan(e) {
			for (let t = e.length - 1; t >= 0; --t) {
				let r = e.charAt(t);
				if (n.has(r)) return 1;
				if (!y.test(r) && r !== `*` && r !== `/`) return 0;
			}
			return 0;
		},
	};
}
const te = /[ \t(),{}]/;
function x(e, t) {
	let n = new Set(t);
	return {
		probability: e,
		scan(e) {
			let t = e.split(te),
				r = 0;
			for (let e of t) n.has(e) && (r += 1);
			return r;
		},
	};
}
const ne =
		`public.abstract.class.implements.extends.return.throw.private.protected.enum.continue.assert.boolean.this.instanceof.interface.static.void.super.true.case:.let.const.var.async.await.break.yield.typeof.import.export`.split(
			`.`,
		),
	re = [`++`, `||`, `&&`, `===`, `?.`, `??`],
	ie = [
		`for(`,
		`if(`,
		`while(`,
		`catch(`,
		`switch(`,
		`try{`,
		`else{`,
		`this.`,
		`window.`,
		/;\s+\/\//,
		`import '`,
		`import "`,
		`require(`,
	],
	ae = [`}`, `;`, `{`];
function oe() {
	return [b(0.95, ae), x(0.7, re), x(0.3, ne), v(0.95, ie), h(0.5)];
}
const se = new Set([`BreakStatement`, `ContinueStatement`, `LabeledStatement`]);
function ce(e) {
	return se.has(e.type);
}
const le = oe();
function ue(e, t, n) {
	let r = e.loc.start.line,
		i = t.loc.start.line;
	if (r + 1 !== i) return !1;
	let a = { end: e.end, loc: e.loc, range: e.range, start: e.start, type: e.type, value: e.value },
		o = n.getTokenAfter(a);
	return o ? o.loc.start.line > i : !0;
}
function de(e, t) {
	let n = [],
		r = 0,
		i = [],
		a = 0;
	for (let o of e)
		if (o.type === `Block`)
			(a > 0 &&
				((n[r++] = {
					comments: i,
					value: i.map(({ value: e }) => e).join(`
`),
				}),
				(i = []),
				(a = 0)),
				(n[r++] = { comments: [o], value: o.value }));
		else if (a === 0) i[a++] = o;
		else {
			let e = i.at(-1);
			e && ue(e, o, t)
				? (i[a++] = o)
				: ((n[r++] = {
						comments: i,
						value: i.map(({ value: e }) => e).join(`
`),
					}),
					(i = [o]),
					(a = 1));
		}
	return (
		a > 0 &&
			(n[r] = {
				comments: i,
				value: i.map(({ value: e }) => e).join(`
`),
			}),
		n
	);
}
const fe = /{/g,
	pe = /}/g;
function me(e) {
	let t = (e.match(fe) ?? []).length - (e.match(pe) ?? []).length;
	return t > 0 ? e + `}`.repeat(t) : t < 0 ? `{`.repeat(-t) + e : e;
}
function he(e) {
	return m(
		le,
		e.split(`
`),
	);
}
function ge(e) {
	return e.type !== `ReturnStatement` && e.type !== `ThrowStatement` ? !1 : e.argument?.type === `Identifier`;
}
function _e(e) {
	return e.type === `UnaryExpression` && (e.operator === `-` || e.operator === `+`);
}
function ve(e) {
	return e.type === `Literal` ? typeof e.value == `string` || typeof e.value == `number` : !1;
}
function ye(e) {
	return n(e) && typeof e.type == `string`;
}
function be(e) {
	let t = [];
	for (let n of e) ye(n) && t.push(n);
	return t;
}
function xe(e, t) {
	if (e.type !== `ExpressionStatement`) return !1;
	let { expression: n } = e;
	return n.type === `Identifier` || n.type === `SequenceExpression` || _e(n) || ve(n) || !t.trimEnd().endsWith(`;`);
}
function Se(e, t) {
	if (e.length !== 1) return !1;
	let n = e.at(0);
	return n ? ce(n) || ge(n) || xe(n, t) : !1;
}
const Ce = [/A 'return' statement can only be used within a function body/];
function S(e) {
	for (let t of e) {
		let e = !1;
		for (let n of Ce)
			if (n.test(t.message)) {
				e = !0;
				break;
			}
		if (!e) return !1;
	}
	return !0;
}
function C(e) {
	return (e.errors.length === 0 || S(e.errors)) && e.program.body.length > 0;
}
function w(n, r) {
	let i = e(r),
		a = t(`file${i || `.js`}`, n);
	if (C(a)) return a;
	if (i !== `.tsx` && i !== `.jsx`) {
		let e = t(`file.tsx`, n);
		if (C(e)) return e;
	}
}
function T(e, t) {
	if (!he(e)) return !1;
	let n = w(e, t);
	return n ? !Se(be(n.program.body), e) : !1;
}
const E = o({
	create(e) {
		return {
			"Program:exit"() {
				let t = de(e.sourceCode.getAllComments(), e.sourceCode);
				for (let n of t) {
					let t = n.value.trim();
					if (t === `}` || !T(me(t), e.filename)) continue;
					let r = n.comments.at(0),
						i = n.comments.at(-1);
					!r ||
						!i ||
						e.report({
							loc: { end: i.loc.end, start: r.loc.start },
							messageId: `commentedCode`,
							suggest: [
								{
									desc: `Remove this commented out code`,
									fix(e) {
										return e.removeRange([r.range[0], i.range[1]]);
									},
								},
							],
						});
				}
			},
		};
	},
	meta: {
		docs: { description: `Disallow commented-out code`, recommended: !1 },
		hasSuggestions: !0,
		messages: {
			commentedCode: `Commented-out code creates confusion about intent and clutters the codebase. Version control preserves history, making dead code comments unnecessary. Delete the commented code entirely. If needed later, retrieve it from git history.`,
		},
		schema: [],
		type: `suggestion`,
	},
});
function D(e) {
	return n(e) && `name` in e && typeof e.name == `string`;
}
function O(e) {
	return n(e) && e.type === `Identifier`;
}
function k(e) {
	return n(e) && e.type === `JSXIdentifier` && `name` in e;
}
function A(e) {
	return n(e) && e.type === `ImportDeclaration`;
}
function j(e) {
	return n(e) && e.type === `VariableDeclarator`;
}
function M(e) {
	return n(e) && e.type === `Literal` && typeof e.value == `string`;
}
function we(e) {
	return n(e) && e.type === `CallExpression`;
}
function N(e) {
	if (!we(e) || e.optional) return !1;
	let { callee: t } = e;
	if (!O(t) || t.name !== `require` || e.arguments.length !== 1) return !1;
	let [n] = e.arguments;
	return n !== void 0 && M(n);
}
function P(e) {
	return n(e) && e.type === `ImportSpecifier`;
}
function Te(e) {
	return n(e) && e.type === `ExportSpecifier`;
}
function F(e) {
	return n(e) && e.type === `Property`;
}
function Ee(e) {
	return n(e) && e.type === `MemberExpression`;
}
function De(e) {
	return n(e) && e.type === `AssignmentExpression`;
}
function I(e) {
	return n(e) && e.type === `ObjectExpression`;
}
function Oe(e) {
	return n(e) && (e.type === `MethodDefinition` || e.type === `TSAbstractMethodDefinition`);
}
function ke(e) {
	return n(e) && (e.type === `PropertyDefinition` || e.type === `TSAbstractPropertyDefinition`);
}
function Ae(e) {
	return n(e) && e.type === `ImportDefaultSpecifier`;
}
function je(e) {
	return n(e) && e.type === `ImportNamespaceSpecifier`;
}
function Me(e) {
	return n(e) && e.type === `VariableDeclaration`;
}
function L(e) {
	return n(e) && e.type === `ExportNamedDeclaration`;
}
function Ne(e) {
	return n(e) && (e.type === `FunctionDeclaration` || e.type === `FunctionExpression`);
}
function Pe(e) {
	return n(e) && (e.type === `ClassDeclaration` || e.type === `ClassExpression`);
}
function Fe(e) {
	return n(e) && e.type === `TSTypeAliasDeclaration`;
}
const R = `replace`,
	z = `suggestion`,
	B = `A more descriptive name will do too.`,
	Ie = {
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
	Le = {
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
	Re = [`i18n`, `l10n`],
	ze = /(?=[A-Z])|(?<=[_.-])/,
	Be = new Set(
		`any.as.boolean.break.case.catch.class.const.constructor.continue.debugger.declare.default.delete.do.else.enum.export.extends.false.finally.for.from.function.get.if.implements.import.in.instanceof.interface.let.module.new.null.number.of.package.private.protected.public.require.return.set.static.string.super.switch.symbol.this.throw.true.try.type.typeof.var.void.while.with.yield`.split(
			`.`,
		),
	),
	Ve = /^[A-Za-z]+$/;
function He(e) {
	return (e >= 65 && e <= 90) || (e >= 97 && e <= 122) || e === 36 || e === 95;
}
function V(e) {
	return e < 192
		? He(e)
		: e >= 12289 && e <= 55295
			? !0
			: e <= 767
				? e !== 215 && e !== 247
				: e <= 8191
					? e >= 880 && e !== 894
					: e <= 8591
						? (e >= 8204 && e <= 8205) || e >= 8304
						: e <= 12271
							? e >= 11264
							: e <= 64255
								? e >= 63744
								: e <= 65023
									? e >= 64512
									: e <= 65279
										? e >= 65136
										: e <= 65370
											? (e >= 65313 && e <= 65338) || e >= 65345
											: e >= 65382 && e <= 65500;
}
function Ue(e) {
	return !!(
		V(e) ||
		(e >= 48 && e <= 57) ||
		e === 8204 ||
		e === 8205 ||
		(e >= 768 && e <= 865) ||
		(e >= 8240 && e <= 8266)
	);
}
function H(e) {
	if (e.length === 0 || Be.has(e)) return !1;
	let t = e.codePointAt(0);
	if (t === void 0 || !V(t)) return !1;
	let n = t > 65535 ? 2 : 1;
	for (; n < e.length; ) {
		let t = e.codePointAt(n);
		if (t === void 0 || !Ue(t)) return !1;
		n += t > 65535 ? 2 : 1;
	}
	return !0;
}
function U(e) {
	return e === e.toUpperCase();
}
function W(e) {
	return U(e.charAt(0));
}
function G(e) {
	return e.charAt(0).toUpperCase() + e.slice(1);
}
function K(e) {
	return e.charAt(0).toLowerCase() + e.slice(1);
}
function q(e, t) {
	if (U(e) || t.allowList.get(e) === !0) return [];
	let n = t.replacements.get(K(e)) ?? t.replacements.get(e) ?? t.replacements.get(G(e));
	if (!n) return [];
	let r = W(e) ? G : K,
		i = [...n.keys()].filter((e) => n.get(e) ?? !1).map(r);
	return i.length > 0 ? [...i].toSorted() : [];
}
function We(e, t) {
	let n = t.replacements.get(e);
	if (!n) return !1;
	for (let e of n.values()) if (e) return !0;
	return !1;
}
function Ge(e, t = 1 / 0) {
	let n = e.reduce((e, { length: t }) => e * t, 1),
		r = Math.min(n, t);
	return {
		samples: Array.from({ length: r }, (t, n) => {
			let r = n,
				i = [];
			for (let t = e.length - 1; t >= 0; --t) {
				let n = e[t] ?? [],
					a = n.length,
					o = r % a;
				r = (r - o) / a;
				let s = n[o];
				s !== void 0 && i.unshift(s);
			}
			return i;
		}),
		total: n,
	};
}
function J(e, t, n = 3) {
	let { allowList: r, ignore: i } = t;
	if (U(e) || r.get(e) === !0 || i.some((t) => t.test(e))) return { total: 0 };
	let a = q(e, t);
	if (a.length > 0) return { samples: a.slice(0, n), total: a.length };
	let o = e.split(ze).filter(Boolean),
		s = !1,
		c = [],
		l = 0;
	for (let e of o) {
		let n = q(e, t);
		n.length > 0 ? ((s = !0), (c[l++] = n)) : (c[l++] = [e]);
	}
	if (!s) return { total: 0 };
	let { samples: u, total: d } = Ge(c, n);
	for (let e of u)
		for (let t = e.length - 1; t > 0; --t) {
			let n = e[t] ?? ``;
			Ve.test(n) && e[t - 1]?.endsWith(n) === !0 && e.splice(t, 1);
		}
	return { samples: u.map((e) => e.join(``)), total: d };
}
function Y(e, t, n) {
	let { samples: r = [], total: i } = t;
	if (i === 1) return { data: { discouragedName: e, nameTypeText: n, replacement: r[0] ?? `` }, messageId: R };
	let a = r.map((e) => `\`${e}\``).join(`, `),
		o = i - r.length;
	return (
		o > 0 && (a += `, ... (${o > 99 ? `99+` : o} more omitted)`),
		{ data: { discouragedName: e, nameTypeText: n, replacementsText: a }, messageId: z }
	);
}
function Ke() {
	return {
		allowList: new Map(Object.entries(Le)),
		checkDefaultAndNamespaceImports: `internal`,
		checkFilenames: !0,
		checkProperties: !1,
		checkShorthandImports: `internal`,
		checkShorthandProperties: !1,
		checkVariables: !0,
		ignore: Re.map((e) => new RegExp(e, `u`)),
		replacements: new Map(Object.entries(Ie).map(([e, t]) => [e, new Map(Object.entries(t))])),
	};
}
function X(e) {
	let t = [e],
		n = 1;
	for (let r of e.childScopes) {
		let e = X(r);
		for (let r of e) t[n++] = r;
	}
	return t;
}
function qe(e, t) {
	let n = t;
	for (; n !== null; ) {
		let t = n.set.get(e);
		if (t !== void 0) return t;
		n = n.upper;
	}
}
function Je(e, t) {
	return !t.some((t) => qe(e, t) !== void 0);
}
function Ye(e, t, n = () => !0) {
	let r = e;
	if (!(!H(r) && ((r = `${r}_`), !H(r)))) {
		for (; !Je(r, t) || !n(r, t); ) r = `${r}_`;
		return r;
	}
}
function Z(e) {
	let t = new Set();
	for (let n of e.identifiers) t.add(n);
	for (let { identifier: n } of e.references) t.add(n);
	return [...t];
}
function Xe(e, t) {
	return e.range[0] === t.range[0] && e.range[1] === t.range[1];
}
function Ze(e) {
	let { parent: t } = e;
	return !P(t) || t.local !== e ? !1 : Xe(t.local, t.imported);
}
function Qe(e) {
	if (!D(e)) return !1;
	let { parent: t } = e;
	return F(t) && t.shorthand && t.value === e;
}
function $e(e) {
	if (!D(e)) return !1;
	let { parent: t } = e;
	if ((Ae(t) && t.local === e) || (je(t) && t.local === e)) return !0;
	if (P(t) && t.local === e) {
		let { imported: e } = t;
		if (O(e) && e.name === `default`) return !0;
	}
	return j(t) && t.id === e && N(t.init);
}
function et(e) {
	if (!D(e)) return !1;
	let { parent: t } = e;
	if (j(t) && t.id === e) {
		let e = t.parent;
		return Me(e) ? L(e.parent) : !1;
	}
	return (Ne(t) && t.id === e) || (Pe(t) && t.id === e) || (Fe(t) && t.id === e) ? L(t.parent) : !1;
}
function tt(e) {
	return Z(e).every((e) => !et(e) && !k(e));
}
function nt(e) {
	if (!D(e)) return !1;
	let { parent: t } = e;
	if (Ee(t) && t.property === e && !t.computed) {
		let e = t.parent;
		if (De(e) && e.left === t) return !0;
	}
	return (F(t) && t.key === e && !t.computed && !t.shorthand && I(t.parent)) ||
		(Te(t) && t.exported === e && t.local !== e)
		? !0
		: (Oe(t) || ke(t)) && t.key === e && !t.computed;
}
function Q(e) {
	if (!D(e)) return !1;
	let { parent: t } = e;
	return F(t) && t.key === e && !t.computed && !t.shorthand && I(t.parent);
}
function rt(e) {
	if (e.type === `ImportBinding`) {
		let { parent: t } = e;
		if (t !== null && A(t) && M(t.source)) return t.source.value;
	}
	if (e.type === `Variable`) {
		let { node: t } = e;
		if (j(t) && N(t.init)) {
			let [e] = t.init.arguments;
			if (e !== void 0 && M(e)) return e.value;
		}
	}
}
function it(e) {
	let t = rt(e);
	return t === void 0 ? !1 : !t.includes(`node_modules`) && (t.startsWith(`.`) || t.startsWith(`/`));
}
function $(e, t) {
	return e === !1 ? !1 : e === `internal` ? it(t) : !0;
}
function at(e) {
	return e.defs.length === 1 ? e.defs[0]?.type === `ClassName` : !1;
}
function ot(e) {
	return (t, n) =>
		n.every((n) => {
			let r = e.get(n);
			return r === void 0 || !r.has(t);
		});
}
function st(e, t, n) {
	return ($e(t) && !$(n.checkDefaultAndNamespaceImports, e)) || (Ze(t) && !$(n.checkShorthandImports, e))
		? !0
		: !n.checkShorthandProperties && Qe(t);
}
function ct(e, t, n, r) {
	let i = [],
		a = 0,
		o = 0;
	for (let s of e) {
		let e = Ye(s, t, n);
		if (e !== void 0) {
			if (e !== s && We(s, r)) {
				o += 1;
				continue;
			}
			e.length > 0 && (i[a++] = e);
		}
	}
	return { droppedDiscouraged: o, safeSamples: i };
}
function lt(e, t, n) {
	let r = e.type === `Variable` && j(e.node) && e.node.init === null,
		i = e.type === `Parameter` && t.scope.type === `function` && t.scope.block.type === `ArrowFunctionExpression`,
		a = r || i;
	return (e, t) => !(!n(e, t) || (a && e === `arguments`));
}
function ut(e, t, n, r, i, a, o) {
	for (let e of i) (a.has(e) || a.set(e, new Set()), a.get(e)?.add(r));
	let s = Z(n);
	e({
		...t,
		fix(e) {
			let t = [],
				n = 0;
			for (let i of s) t[n++] = e.replaceText(i, r);
			return t;
		},
		node: o,
	});
}
function dt(e, t, n, r, i) {
	if (e.defs.length === 0) return;
	let [a] = e.defs;
	if (a === void 0) return;
	let o = a.name;
	if (!O(o) || st(a, o, t)) return;
	let s = lt(a, e, r),
		c = J(e.name, t);
	if (c.total === 0 || !c.samples) return;
	let { references: l } = e,
		u = [...l.map((e) => e.from), e.scope],
		{ safeSamples: d, droppedDiscouraged: f } = ct(c.samples, u, s, t),
		p = d.length > 0 ? d : c.samples,
		m = typeof c.samples.length == `number` && c.samples.length === c.total ? Math.max(0, c.total - f) : c.total,
		h = e.name === `fn` && m > 1 ? p.map((e) => (e === `function_` ? `function` : e)) : p,
		g = Y(o.name, { samples: h, total: m }, `variable`);
	if (m === 1 && d.length === 1 && tt(e)) {
		let [t] = d;
		if (t !== void 0) {
			ut(i, g, e, t, u, n, o);
			return;
		}
	}
	i({ ...g, node: o });
}
function ft(e, t) {
	if (!at(e)) {
		t(e);
		return;
	}
	if (e.scope.type === `class`) {
		let [n] = e.defs;
		if (n === void 0) {
			t(e);
			return;
		}
		let r = n.name;
		if (!O(r)) {
			t(e);
			return;
		}
		t(e);
	}
}
function pt(e, t) {
	for (let n of X(e)) for (let e of n.variables) ft(e, t);
}
const mt = a({
	meta: { name: `small-rules` },
	rules: {
		"ban-types": u,
		"no-commented-code": E,
		"prevent-abbreviations": o({
			create(e) {
				let t = Ke(),
					n = e.physicalFilename,
					r = new WeakMap(),
					i = ot(r),
					{ report: a } = e;
				function o(e) {
					dt(e, t, r, i, a);
				}
				return {
					Identifier(e) {
						if (!t.checkProperties || !D(e) || e.name === `__proto__`) return;
						let n = J(e.name, t);
						if (n.total === 0 || !nt(e)) return;
						let r = Y(e.name, n, `property`);
						if (n.total === 1 && n.samples && Q(e)) {
							let [t] = n.samples,
								{ parent: i } = e;
							if (t !== void 0 && F(i) && M(i.value) && H(t)) {
								a({
									...r,
									fix(n) {
										return n.replaceText(e, t);
									},
									node: e,
								});
								return;
							}
						}
						a({ ...r, node: e });
					},
					JSXOpeningElement(e) {
						if (!t.checkVariables || !k(e.name) || !W(e.name.name)) return;
						let n = J(e.name.name, t);
						n.total !== 0 && a({ ...Y(e.name.name, n, `variable`), node: e.name });
					},
					"Program:exit"(r) {
						if (t.checkFilenames && n !== `<input>` && n !== `<text>`) {
							let e = Math.max(n.lastIndexOf(`/`), n.lastIndexOf(`\\`)),
								i = n.slice(e + 1),
								o = i.lastIndexOf(`.`),
								s = o === -1 ? `` : i.slice(o),
								c = J(o === -1 ? i : i.slice(0, o), t);
							c.total > 0 &&
								c.samples &&
								a({
									...Y(i, { samples: c.samples.map((e) => `${e}${s}`), total: c.total }, `filename`),
									node: r,
								});
						}
						t.checkVariables && pt(e.sourceCode.getScope(r), o);
					},
				};
			},
			meta: {
				docs: { description: `Prevent abbreviations.`, recommended: !1 },
				fixable: `code`,
				messages: {
					[R]: `The {{nameTypeText}} \`{{discouragedName}}\` should be named \`{{replacement}}\`. ${B}`,
					[z]: `Please rename the {{nameTypeText}} \`{{discouragedName}}\`. Suggested names are: {{replacementsText}}. ${B}`,
				},
				type: `suggestion`,
			},
		}),
	},
});
export { mt as default };
