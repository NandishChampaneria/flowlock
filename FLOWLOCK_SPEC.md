# FlowLock

## Semantic Drift Detection Engine for TypeScript

------------------------------------------------------------------------

## 1. Introduction

FlowLock is a static analysis engine written in TypeScript that detects
semantic drift in TypeScript projects.

Semantic drift occurs when: - A function signature changes - A return
type changes - A type definition changes - An interface changes -
Related parts of the codebase still rely on old assumptions

FlowLock is a pure TypeScript analysis library (no CLI, no UI).

------------------------------------------------------------------------

## 2. Goals (MVP)

FlowLock must:

1.  Parse a TypeScript project using tsconfig.json
2.  Extract:
    -   Function declarations
    -   Exported functions
    -   Class methods
    -   Interfaces
    -   Type aliases
3.  Normalize extracted symbols
4.  Build a symbol registry
5.  Compare two project snapshots
6.  Detect signature-level drift
7.  Return a structured drift report

------------------------------------------------------------------------

## 3. Public API

The library must export:

``` ts
export function analyzeProject(tsConfigPath: string): ProjectSnapshot;

export function compareSnapshots(
  before: ProjectSnapshot,
  after: ProjectSnapshot
): DriftReport;
```

------------------------------------------------------------------------

## 4. Directory Structure

src/ ├── index.ts ├── types.ts ├── parser/ │ ├── projectParser.ts │ ├──
symbolExtractor.ts ├── model/ │ ├── symbolRegistry.ts ├── analyzer/ │
├── signatureComparator.ts │ ├── driftAnalyzer.ts

------------------------------------------------------------------------

## 5. Core Data Models

### ProjectSnapshot

``` ts
export interface ProjectSnapshot {
  symbols: SymbolRegistry;
}
```

### SymbolRegistry

``` ts
export interface SymbolRegistry {
  functions: Record<string, FunctionSignature>;
  interfaces: Record<string, InterfaceDefinition>;
  types: Record<string, TypeAliasDefinition>;
}
```

### FunctionSignature

``` ts
export interface FunctionSignature {
  name: string;
  parameters: ParameterSignature[];
  returnType: string;
  filePath: string;
  isExported: boolean;
}
```

### ParameterSignature

``` ts
export interface ParameterSignature {
  name: string;
  type: string;
  optional: boolean;
}
```

### InterfaceDefinition

``` ts
export interface InterfaceDefinition {
  name: string;
  properties: InterfaceProperty[];
  filePath: string;
}
```

### InterfaceProperty

``` ts
export interface InterfaceProperty {
  name: string;
  type: string;
  optional: boolean;
}
```

### TypeAliasDefinition

``` ts
export interface TypeAliasDefinition {
  name: string;
  definition: string;
  filePath: string;
}
```

### DriftReport

``` ts
export interface DriftReport {
  modifiedFunctions: FunctionDrift[];
  addedFunctions: string[];
  removedFunctions: string[];
}
```

### FunctionDrift

``` ts
export interface FunctionDrift {
  name: string;
  filePathBefore: string;
  filePathAfter: string;
  changes: SignatureChange[];
}
```

### SignatureChange

``` ts
export type SignatureChange =
  | { type: "parameter-added"; parameter: ParameterSignature }
  | { type: "parameter-removed"; parameter: ParameterSignature }
  | { type: "parameter-type-changed"; before: ParameterSignature; after: ParameterSignature }
  | { type: "return-type-changed"; before: string; after: string };
```

------------------------------------------------------------------------

## 6. Parsing Requirements

-   Use TypeScript Compiler API
-   Respect tsconfig include/exclude
-   Resolve types using TypeChecker
-   Normalize type strings
-   Capture file paths
-   Detect exported declarations
-   Detect class methods
-   Ignore node_modules

------------------------------------------------------------------------

## 7. Drift Detection Rules

Detect:

1.  Added function
2.  Removed function
3.  Parameter added
4.  Parameter removed
5.  Parameter type changed
6.  Return type changed

Comparison must be strict and deterministic.

------------------------------------------------------------------------

## 8. Engineering Constraints

-   Strict TypeScript mode enabled
-   No unnecessary `any`
-   Small focused modules
-   Clear separation between parser and analyzer layers
-   No console logs in core logic

------------------------------------------------------------------------

## 9. Implementation Order

1.  types.ts
2.  symbolRegistry.ts
3.  projectParser.ts
4.  symbolExtractor.ts
5.  signatureComparator.ts
6.  driftAnalyzer.ts
7.  index.ts

------------------------------------------------------------------------

## 10. Future Extensions

-   Usage graph tracking
-   Semantic impact scoring
-   Git integration
-   Snapshot persistence
-   Multi-language adapters
-   VSCode extension
-   CLI wrapper

------------------------------------------------------------------------

End of Specification
