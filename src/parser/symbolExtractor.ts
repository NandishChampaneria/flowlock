import * as ts from "typescript";
import type {
  SymbolRegistry,
  FunctionSignature,
  ParameterSignature,
  InterfaceProperty,
} from "../types.js";
import { addFunction, addInterface, addTypeAlias } from "../model/symbolRegistry.js";

export function extractSymbols(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  registry: SymbolRegistry
): void {
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node)) {
      extractFunctionDeclaration(node, sourceFile, checker, registry);
    } else if (ts.isMethodDeclaration(node)) {
      extractMethodDeclaration(node, sourceFile, checker, registry);
    } else if (ts.isInterfaceDeclaration(node)) {
      extractInterface(node, sourceFile, registry);
    } else if (ts.isTypeAliasDeclaration(node)) {
      extractTypeAlias(node, sourceFile, checker, registry);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function extractFunctionDeclaration(
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  registry: SymbolRegistry
): void {
  const name = node.name?.getText(sourceFile);
  if (!name) return;

  const sig = buildFunctionSignature(node, sourceFile, checker, true, name);
  const key = makeFunctionKey(name, sourceFile.fileName);
  addFunction(registry, key, sig);
}

function extractMethodDeclaration(
  node: ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  registry: SymbolRegistry
): void {
  const name = node.name.getText(sourceFile);
  const parent = node.parent;
  if (!ts.isClassDeclaration(parent) || !parent.name) return;

  const className = parent.name.getText(sourceFile);
  const fullName = `${className}.${name}`;

  const sig = buildFunctionSignature(node, sourceFile, checker, false, fullName);
  const key = makeFunctionKey(fullName, sourceFile.fileName);
  addFunction(registry, key, sig);
}

function buildFunctionSignature(
  node: ts.FunctionDeclaration | ts.MethodDeclaration,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  isExported: boolean,
  displayName?: string
): FunctionSignature {
  const name =
    displayName ??
    ("name" in node && node.name
      ? node.name.getText(sourceFile)
      : "anonymous");

  const parameters: ParameterSignature[] = (node.parameters ?? []).map(
    (p) => extractParameter(p, sourceFile, checker)
  );

  let returnType = "void";
  if (node.type) {
    returnType = normalizeType(node.type, sourceFile, checker);
  } else {
    const sig = checker.getSignatureFromDeclaration(node);
    if (sig) {
      const type = checker.getReturnTypeOfSignature(sig);
      returnType = checker.typeToString(type);
    }
  }

  const modifiers = ts.getModifiers(node) ?? [];
  const exported =
    isExported &&
    modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  return {
    name,
    parameters,
    returnType: normalizeTypeString(returnType),
    filePath: sourceFile.fileName,
    isExported: exported,
  };
}

function extractParameter(
  param: ts.ParameterDeclaration,
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): ParameterSignature {
  const name = param.name.getText(sourceFile);
  const optional = !!param.questionToken;
  let type = "any";
  if (param.type) {
    type = normalizeType(param.type, sourceFile, checker);
  } else {
    const symbol = checker.getSymbolAtLocation(param.name);
    if (symbol) {
      const typeNode = checker.getTypeOfSymbolAtLocation(symbol, param);
      type = checker.typeToString(typeNode);
    }
  }
  return {
    name,
    type: normalizeTypeString(type),
    optional,
  };
}

function extractInterface(
  node: ts.InterfaceDeclaration,
  sourceFile: ts.SourceFile,
  registry: SymbolRegistry
): void {
  const name = node.name.getText(sourceFile);
  const properties: InterfaceProperty[] = [];

  for (const member of node.members) {
    if (ts.isPropertySignature(member)) {
      const propName = (member.name as ts.Identifier)?.getText(sourceFile);
      if (!propName) continue;
      const optional = !!member.questionToken;
      const type = member.type
        ? member.type.getText(sourceFile)
        : "any";
      properties.push({
        name: propName,
        type: normalizeTypeString(type),
        optional,
      });
    }
  }

  const key = makeInterfaceKey(name, sourceFile.fileName);
  addInterface(registry, key, {
    name,
    properties,
    filePath: sourceFile.fileName,
  });
}

function extractTypeAlias(
  node: ts.TypeAliasDeclaration,
  sourceFile: ts.SourceFile,
  _checker: ts.TypeChecker,
  registry: SymbolRegistry
): void {
  const name = node.name.getText(sourceFile);
  const definition = node.type.getText(sourceFile);
  const key = makeTypeKey(name, sourceFile.fileName);
  addTypeAlias(registry, key, {
    name,
    definition: normalizeTypeString(definition),
    filePath: sourceFile.fileName,
  });
}

function normalizeType(
  typeNode: ts.TypeNode,
  _sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): string {
  const type = checker.getTypeAtLocation(typeNode);
  return checker.typeToString(type);
}

function normalizeTypeString(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function makeFunctionKey(name: string, filePath: string): string {
  return `fn:${filePath}::${name}`;
}

function makeInterfaceKey(name: string, filePath: string): string {
  return `iface:${filePath}::${name}`;
}

function makeTypeKey(name: string, filePath: string): string {
  return `type:${filePath}::${name}`;
}
