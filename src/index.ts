export { analyzeProject } from "./parser/projectParser.js";
export { compareSnapshots } from "./analyzer/driftAnalyzer.js";
export {
  saveSnapshot,
  loadSnapshot,
  type SaveSnapshotOptions,
  type LoadSnapshotOptions,
} from "./persistence/snapshotStorage.js";
export {
  snapshotFromGitRef,
  saveSnapshotFromGitRef,
} from "./git/snapshotFromGit.js";
export type {
  ProjectSnapshot,
  DriftReport,
  SymbolRegistry,
  FunctionSignature,
  ParameterSignature,
  InterfaceDefinition,
  InterfaceProperty,
  TypeAliasDefinition,
  FunctionDrift,
  SignatureChange,
  StoredSnapshot,
  StoredSnapshotMetadata,
  SemverBump,
} from "./types.js";
export { SNAPSHOT_FORMAT_VERSION } from "./types.js";
