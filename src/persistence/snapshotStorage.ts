import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { validatePath } from "../security/validation.js";
import type { ProjectSnapshot, StoredSnapshot } from "../types.js";
import { SNAPSHOT_FORMAT_VERSION } from "../types.js";

export interface SaveSnapshotOptions {
  /** Path to save the snapshot (default: `.flowlock/snapshot.json`). */
  outputPath?: string;
  /** Base directory for path validation (default: process.cwd()). */
  baseDir?: string;
  /** Git ref this snapshot represents (e.g. `main`, `v1.0.0`). */
  gitRef?: string;
  /** Git commit SHA for reproducibility. */
  gitSha?: string;
}

const DEFAULT_OUTPUT_PATH = ".flowlock/snapshot.json";

/**
 * Saves a project snapshot to disk with metadata for later comparison.
 * Creates the output directory if it does not exist.
 *
 * @param snapshot - The snapshot to persist
 * @param tsConfigPath - Path to the tsconfig used to generate the snapshot
 * @param options - Optional output path and git metadata
 * @returns The path where the snapshot was saved
 *
 * @example
 * ```ts
 * const snapshot = analyzeProject("./tsconfig.json");
 * saveSnapshot(snapshot, "./tsconfig.json", { outputPath: ".flowlock/main.json", gitRef: "main" });
 * ```
 */
export function saveSnapshot(
  snapshot: ProjectSnapshot,
  tsConfigPath: string,
  options: SaveSnapshotOptions = {}
): string {
  const baseDir = options.baseDir ?? process.cwd();
  const outputPath = validatePath(
    options.outputPath ?? DEFAULT_OUTPUT_PATH,
    baseDir
  );
  const resolvedTsConfig = validatePath(tsConfigPath, baseDir);

  const stored: StoredSnapshot = {
    metadata: {
      version: SNAPSHOT_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      tsConfigPath: resolvedTsConfig,
      gitRef: options.gitRef,
      gitSha: options.gitSha,
    },
    snapshot,
  };

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(stored, null, 2), "utf-8");
  return outputPath;
}

/**
 * Loads a previously saved snapshot from disk.
 *
 * @param path - Path to the stored snapshot file
 * @returns The stored snapshot with metadata
 * @throws If the file does not exist, is invalid JSON, or has an unsupported version
 *
 * @example
 * ```ts
 * const stored = loadSnapshot(".flowlock/main.json");
 * const report = compareSnapshots(stored.snapshot, analyzeProject("./tsconfig.json"));
 * ```
 */
export interface LoadSnapshotOptions {
  /** Base directory for path validation (default: process.cwd()). */
  baseDir?: string;
}

export function loadSnapshot(
  path: string,
  options: LoadSnapshotOptions = {}
): StoredSnapshot {
  const baseDir = options.baseDir ?? process.cwd();
  const resolvedPath = validatePath(path, baseDir);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Snapshot file not found: ${resolvedPath}`);
  }

  const raw = readFileSync(resolvedPath, "utf-8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid snapshot file (not valid JSON): ${message}`);
  }

  if (!isStoredSnapshot(parsed)) {
    throw new Error(
      "Invalid snapshot file: missing required fields (metadata, snapshot)"
    );
  }

  if (parsed.metadata.version !== SNAPSHOT_FORMAT_VERSION) {
    throw new Error(
      `Unsupported snapshot version: ${parsed.metadata.version}. ` +
        `Current version is ${SNAPSHOT_FORMAT_VERSION}. ` +
        "Please regenerate the snapshot."
    );
  }

  return parsed;
}

function isStoredSnapshot(value: unknown): value is StoredSnapshot {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.metadata === "object" &&
    obj.metadata !== null &&
    typeof (obj.metadata as Record<string, unknown>).version === "number" &&
    typeof obj.snapshot === "object" &&
    obj.snapshot !== null
  );
}
