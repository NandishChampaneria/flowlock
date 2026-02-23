export interface ParameterSignature {
  name: string;
  type: string;
  optional: boolean;
}

export interface FunctionSignature {
  name: string;
  parameters: ParameterSignature[];
  returnType: string;
  filePath: string;
  isExported: boolean;
}

export interface InterfaceProperty {
  name: string;
  type: string;
  optional: boolean;
}

export interface InterfaceDefinition {
  name: string;
  properties: InterfaceProperty[];
  filePath: string;
}

export interface TypeAliasDefinition {
  name: string;
  definition: string;
  filePath: string;
}

export interface SymbolRegistry {
  functions: Record<string, FunctionSignature>;
  interfaces: Record<string, InterfaceDefinition>;
  types: Record<string, TypeAliasDefinition>;
}

export interface ProjectSnapshot {
  symbols: SymbolRegistry;
}

export type SignatureChange =
  | { type: "parameter-added"; parameter: ParameterSignature; breaking: boolean }
  | { type: "parameter-removed"; parameter: ParameterSignature; breaking: true }
  | {
      type: "parameter-type-changed";
      before: ParameterSignature;
      after: ParameterSignature;
      breaking: true;
    }
  | { type: "return-type-changed"; before: string; after: string; breaking: true };

export interface FunctionDrift {
  name: string;
  filePathBefore: string;
  filePathAfter: string;
  changes: SignatureChange[];
}

export type SemverBump = "major" | "minor" | "patch";

export interface DriftReport {
  modifiedFunctions: FunctionDrift[];
  addedFunctions: string[];
  removedFunctions: string[];
  /** True if any change is breaking (removed fn, param removed, type changed, etc.). */
  hasBreakingChanges: boolean;
  /** Suggested semver bump based on change severity. */
  suggestedVersion: SemverBump;
}

/** Current snapshot storage format version. Bump when schema changes. */
export const SNAPSHOT_FORMAT_VERSION = 1;

/** Metadata stored alongside a snapshot for persistence and migration. */
export interface StoredSnapshotMetadata {
  /** Snapshot format version for migration. */
  version: number;
  /** ISO 8601 timestamp when snapshot was created. */
  createdAt: string;
  /** Path to tsconfig used for analysis (resolved at save time). */
  tsConfigPath: string;
  /** Optional git ref (branch/tag/commit) this snapshot represents. */
  gitRef?: string;
  /** Optional git commit SHA for reproducibility. */
  gitSha?: string;
}

/** A persisted snapshot with metadata for storage and comparison. */
export interface StoredSnapshot {
  metadata: StoredSnapshotMetadata;
  snapshot: ProjectSnapshot;
}
