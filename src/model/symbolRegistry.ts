import type {
  SymbolRegistry,
  FunctionSignature,
  InterfaceDefinition,
  TypeAliasDefinition,
} from "../types.js";

export function createEmptyRegistry(): SymbolRegistry {
  return {
    functions: {},
    interfaces: {},
    types: {},
  };
}

export function addFunction(
  registry: SymbolRegistry,
  key: string,
  fn: FunctionSignature
): void {
  registry.functions[key] = fn;
}

export function addInterface(
  registry: SymbolRegistry,
  key: string,
  iface: InterfaceDefinition
): void {
  registry.interfaces[key] = iface;
}

export function addTypeAlias(
  registry: SymbolRegistry,
  key: string,
  typeAlias: TypeAliasDefinition
): void {
  registry.types[key] = typeAlias;
}
