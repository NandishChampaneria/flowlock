import { execSync } from "child_process";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { join, resolve, relative } from "path";
import { tmpdir } from "os";
import { analyzeProject } from "../parser/projectParser.js";
import { saveSnapshot } from "../persistence/snapshotStorage.js";
import { validateGitRef, validatePath } from "../security/validation.js";
import type { ProjectSnapshot, StoredSnapshot } from "../types.js";
import { SNAPSHOT_FORMAT_VERSION } from "../types.js";

export interface SnapshotFromGitOptions {
  /** Working directory (default: process.cwd()). Must be a git repository. */
  cwd?: string;
  /** Run `npm install` in the worktree before analysis (for projects with external deps). */
  installDeps?: boolean;
}

/**
 * Creates a project snapshot from a git ref (branch, tag, or commit SHA)
 * without modifying the current working tree.
 *
 * Uses `git worktree` to create a temporary checkout, analyzes it, then cleans up.
 * Requires git to be installed and the directory to be a git repository.
 *
 * @param tsConfigPath - Path to tsconfig (relative to repo root)
 * @param gitRef - Git ref to analyze (e.g. `main`, `origin/main`, `v1.0.0`, `abc1234`)
 * @param options - Working directory and optional npm install
 * @returns The snapshot with metadata including git ref and SHA
 *
 * @example
 * ```ts
 * const stored = snapshotFromGitRef("./tsconfig.json", "main");
 * const current = analyzeProject("./tsconfig.json");
 * const report = compareSnapshots(stored.snapshot, current);
 * ```
 */
export function snapshotFromGitRef(
  tsConfigPath: string,
  gitRef: string,
  options: SnapshotFromGitOptions = {}
): StoredSnapshot {
  const cwd = options.cwd ?? process.cwd();
  const safeRef = validateGitRef(gitRef);
  const safeTsConfig = validatePath(tsConfigPath, cwd);

  if (!isGitRepository(cwd)) {
    throw new Error(`Not a git repository: ${cwd}`);
  }

  const worktreePath = mkdtempSync(join(tmpdir(), "flowlock-"));
  let worktreeCreated = false;

  try {
    execSync(`git worktree add "${worktreePath}" "${safeRef}" --detach`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    worktreeCreated = true;

    if (options.installDeps) {
      const packageJsonPath = join(worktreePath, "package.json");
      if (existsSync(packageJsonPath)) {
        execSync("npm install", {
          cwd: worktreePath,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      }
    }

    const relativeTsConfig = relative(cwd, safeTsConfig);
    const rawSnapshot = analyzeProject(
      join(worktreePath, relativeTsConfig || tsConfigPath)
    );
    const sha = getGitSha(worktreePath, safeRef);
    const resolvedTsConfig = resolve(cwd, tsConfigPath);

    const snapshot = normalizeSnapshotPaths(rawSnapshot, worktreePath, cwd);

    const stored: StoredSnapshot = {
      metadata: {
        version: SNAPSHOT_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        tsConfigPath: resolvedTsConfig,
        gitRef: safeRef,
        gitSha: sha,
      },
      snapshot,
    };

    return stored;
  } finally {
    if (worktreeCreated) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    } else {
      rmSync(worktreePath, { recursive: true, force: true });
    }
  }
}

/**
 * Saves a snapshot from a git ref to disk. Convenience for CI workflows.
 *
 * @param tsConfigPath - Path to tsconfig (relative to repo root)
 * @param gitRef - Git ref to analyze
 * @param outputPath - Where to save (default: `.flowlock/baseline-{ref}.json`)
 * @param options - Additional options
 * @returns Path where snapshot was saved
 */
export function saveSnapshotFromGitRef(
  tsConfigPath: string,
  gitRef: string,
  outputPath?: string,
  options: SnapshotFromGitOptions = {}
): string {
  const stored = snapshotFromGitRef(tsConfigPath, gitRef, options);
  const safeRef = gitRef.replace(/[^a-zA-Z0-9.-]/g, "_");
  const outPath = outputPath ?? `.flowlock/baseline-${safeRef}.json`;
  const cwd = options.cwd ?? process.cwd();
  return saveSnapshot(stored.snapshot, resolve(cwd, tsConfigPath), {
    outputPath: outPath,
    baseDir: cwd,
    gitRef,
    gitSha: stored.metadata.gitSha,
  });
}

function isGitRepository(dir: string): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeSnapshotPaths(
  snapshot: ProjectSnapshot,
  fromPrefix: string,
  toPrefix: string
): ProjectSnapshot {
  const normalize = (p: string) =>
    p.startsWith(fromPrefix) ? p.replace(fromPrefix, toPrefix) : p;

  const functions: ProjectSnapshot["symbols"]["functions"] = {};
  for (const [key, fn] of Object.entries(snapshot.symbols.functions)) {
    const newPath = normalize(fn.filePath);
    const newKey = key.replace(fn.filePath, newPath);
    functions[newKey] = { ...fn, filePath: newPath };
  }

  const interfaces: ProjectSnapshot["symbols"]["interfaces"] = {};
  for (const [key, iface] of Object.entries(snapshot.symbols.interfaces)) {
    const newPath = normalize(iface.filePath);
    const newKey = key.replace(iface.filePath, newPath);
    interfaces[newKey] = { ...iface, filePath: newPath };
  }

  const types: ProjectSnapshot["symbols"]["types"] = {};
  for (const [key, type] of Object.entries(snapshot.symbols.types)) {
    const newPath = normalize(type.filePath);
    const newKey = key.replace(type.filePath, newPath);
    types[newKey] = { ...type, filePath: newPath };
  }

  return {
    symbols: { functions, interfaces, types },
  };
}

function getGitSha(worktreePath: string, ref: string): string | undefined {
  try {
    return execSync(`git rev-parse "${ref}"`, {
      cwd: worktreePath,
      encoding: "utf-8",
    }).trim();
  } catch {
    return undefined;
  }
}
