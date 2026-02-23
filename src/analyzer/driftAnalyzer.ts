import type {
  ProjectSnapshot,
  DriftReport,
  FunctionDrift,
  SemverBump,
} from "../types.js";
import { compareSignatures } from "./signatureComparator.js";

export function compareSnapshots(
  before: ProjectSnapshot,
  after: ProjectSnapshot
): DriftReport {
  const beforeKeys = new Set(Object.keys(before.symbols.functions));
  const afterKeys = new Set(Object.keys(after.symbols.functions));

  const addedFunctions: string[] = [];
  const removedFunctions: string[] = [];
  const modifiedFunctions: FunctionDrift[] = [];

  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      addedFunctions.push(key);
    } else {
      const beforeFn = before.symbols.functions[key];
      const afterFn = after.symbols.functions[key];
      if (beforeFn && afterFn) {
        const changes = compareSignatures(beforeFn, afterFn);
        if (changes.length > 0) {
          modifiedFunctions.push({
            name: afterFn.name,
            filePathBefore: beforeFn.filePath,
            filePathAfter: afterFn.filePath,
            changes,
          });
        }
      }
    }
  }

  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      removedFunctions.push(key);
    }
  }

  addedFunctions.sort();
  removedFunctions.sort();

  const hasBreakingChanges = computeHasBreakingChanges(
    modifiedFunctions,
    removedFunctions
  );
  const suggestedVersion = computeSuggestedVersion(
    modifiedFunctions,
    addedFunctions,
    removedFunctions
  );

  return {
    modifiedFunctions,
    addedFunctions,
    removedFunctions,
    hasBreakingChanges,
    suggestedVersion,
  };
}

function computeHasBreakingChanges(
  modified: FunctionDrift[],
  removed: string[]
): boolean {
  if (removed.length > 0) return true;
  return modified.some((fn) => fn.changes.some((c) => c.breaking));
}

function computeSuggestedVersion(
  modified: FunctionDrift[],
  added: string[],
  removed: string[]
): SemverBump {
  if (removed.length > 0) return "major";
  const hasBreakingModification = modified.some((fn) =>
    fn.changes.some((c) => c.breaking)
  );
  if (hasBreakingModification) return "major";
  if (added.length > 0 || modified.length > 0) return "minor";
  return "patch";
}
