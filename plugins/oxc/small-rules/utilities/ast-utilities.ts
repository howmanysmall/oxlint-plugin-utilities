import { isRecord } from "./type-utilities";

import type { ESTree } from "#src";

export function hasName(
	node: unknown,
): node is (ESTree.BindingIdentifier | ESTree.IdentifierName | ESTree.IdentifierReference) & { name: string } {
	return isRecord(node) && "name" in node && typeof node.name === "string";
}

export function isIdentifierName(node: unknown): node is ESTree.IdentifierName {
	return isRecord(node) && node.type === "Identifier";
}

export function isJsxIdentifier(node: unknown): node is ESTree.JSXIdentifier {
	return isRecord(node) && node.type === "JSXIdentifier" && "name" in node;
}

export function isImportDeclaration(node: unknown): node is ESTree.ImportDeclaration {
	return isRecord(node) && node.type === "ImportDeclaration";
}

export function isVariableDeclarator(node: unknown): node is ESTree.VariableDeclarator {
	return isRecord(node) && node.type === "VariableDeclarator";
}

export function isStringLiteral(node: unknown): node is ESTree.StringLiteral {
	return isRecord(node) && node.type === "Literal" && typeof node.value === "string";
}

export function isCallExpression(node: unknown): node is ESTree.CallExpression {
	return isRecord(node) && node.type === "CallExpression";
}

export function isStaticRequire(node: unknown): node is ESTree.CallExpression {
	if (!isCallExpression(node)) return false;
	if (node.optional) return false;

	const { callee } = node;
	if (!isIdentifierName(callee) || callee.name !== "require" || node.arguments.length !== 1) return false;

	const [argument] = node.arguments;
	return argument !== undefined && isStringLiteral(argument);
}

export function isImportSpecifierNode(node: unknown): node is ESTree.ImportSpecifier {
	return isRecord(node) && node.type === "ImportSpecifier";
}

export function isExportSpecifierNode(node: unknown): node is ESTree.ExportSpecifier {
	return isRecord(node) && node.type === "ExportSpecifier";
}

export function isPropertyNode(node: unknown): node is ESTree.ObjectProperty {
	return isRecord(node) && node.type === "Property";
}

export function isMemberExpressionNode(node: unknown): node is ESTree.MemberExpression {
	return isRecord(node) && node.type === "MemberExpression";
}

export function isAssignmentExpressionNode(node: unknown): node is ESTree.AssignmentExpression {
	return isRecord(node) && node.type === "AssignmentExpression";
}

export function isObjectExpressionNode(node: unknown): node is ESTree.ObjectExpression {
	return isRecord(node) && node.type === "ObjectExpression";
}

export function isMethodDefinitionNode(node: unknown): node is ESTree.MethodDefinition {
	return isRecord(node) && (node.type === "MethodDefinition" || node.type === "TSAbstractMethodDefinition");
}

export function isPropertyDefinitionNode(node: unknown): node is ESTree.PropertyDefinition {
	return isRecord(node) && (node.type === "PropertyDefinition" || node.type === "TSAbstractPropertyDefinition");
}

export function isImportDefaultSpecifierNode(node: unknown): node is ESTree.ImportDefaultSpecifier {
	return isRecord(node) && node.type === "ImportDefaultSpecifier";
}

export function isImportNamespaceSpecifierNode(node: unknown): node is ESTree.ImportNamespaceSpecifier {
	return isRecord(node) && node.type === "ImportNamespaceSpecifier";
}

export function isVariableDeclarationNode(node: unknown): node is ESTree.VariableDeclaration {
	return isRecord(node) && node.type === "VariableDeclaration";
}

export function isExportNamedDeclarationNode(node: unknown): node is ESTree.ExportNamedDeclaration {
	return isRecord(node) && node.type === "ExportNamedDeclaration";
}

export function isFunctionDeclarationNode(node: unknown): node is ESTree.Function {
	return isRecord(node) && (node.type === "FunctionDeclaration" || node.type === "FunctionExpression");
}

export function isClassNode(node: unknown): node is ESTree.Class {
	return isRecord(node) && (node.type === "ClassDeclaration" || node.type === "ClassExpression");
}

export function isTSTypeAliasDeclarationNode(node: unknown): node is ESTree.TSTypeAliasDeclaration {
	return isRecord(node) && node.type === "TSTypeAliasDeclaration";
}
