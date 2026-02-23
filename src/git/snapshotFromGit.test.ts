import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  snapshotFromGitRef,
  saveSnapshotFromGitRef,
  loadSnapshot,
  analyzeProject,
  compareSnapshots,
} from "../index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function runGit(cwd: string, ...args: string[]): string {
  return execSync(`git ${args.join(" ")}`, {
    cwd,
    encoding: "utf-8",
  }).trim();
}

describe("Git integration", () => {
  let tempRepo: string;

  beforeEach(() => {
    tempRepo = mkdtempSync(join(tmpdir(), "flowlock-git-test-"));
    runGit(tempRepo, "init");
    runGit(tempRepo, "config user.email test@test.com");
    runGit(tempRepo, "config user.name Test");

    const tsconfig = {
      compilerOptions: { target: "ES2022", module: "NodeNext", strict: true },
      include: ["*.ts"],
    };
    writeFileSync(
      join(tempRepo, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2)
    );
    writeFileSync(
      join(tempRepo, "api.ts"),
      `export function greet(name: string): string { return "Hello"; }\n`
    );
    runGit(tempRepo, "add .");
    runGit(tempRepo, "commit -m initial");
  });

  afterEach(() => {
    if (existsSync(tempRepo)) {
      rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  it("creates snapshot from current HEAD", () => {
    const stored = snapshotFromGitRef("tsconfig.json", "HEAD", { cwd: tempRepo });

    expect(stored.metadata.gitRef).toBe("HEAD");
    expect(stored.metadata.gitSha).toBeDefined();
    expect(Object.keys(stored.snapshot.symbols.functions).length).toBeGreaterThan(0);
    expect(
      Object.keys(stored.snapshot.symbols.functions).some((k) => k.includes("greet"))
    ).toBe(true);
  });

  it("creates snapshot from main branch", () => {
    runGit(tempRepo, "branch -m main");
    const stored = snapshotFromGitRef("tsconfig.json", "main", { cwd: tempRepo });

    expect(stored.metadata.gitRef).toBe("main");
    expect(stored.snapshot.symbols.functions).toBeDefined();
  });

  it("saveSnapshotFromGitRef persists to disk", () => {
    const outputPath = join(tempRepo, ".flowlock", "baseline.json");
    const savedPath = saveSnapshotFromGitRef(
      "tsconfig.json",
      "HEAD",
      outputPath,
      { cwd: tempRepo }
    );

    expect(savedPath).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);

    const loaded = loadSnapshot(outputPath, { baseDir: tempRepo });
    expect(loaded.metadata.gitRef).toBe("HEAD");
    expect(loaded.snapshot.symbols.functions).toBeDefined();
  });

  it("snapshot from git matches current when no changes", () => {
    const stored = snapshotFromGitRef("tsconfig.json", "HEAD", { cwd: tempRepo });
    const current = analyzeProject(join(tempRepo, "tsconfig.json"));

    const report = compareSnapshots(stored.snapshot, current);
    expect(report.addedFunctions).toHaveLength(0);
    expect(report.removedFunctions).toHaveLength(0);
    expect(report.modifiedFunctions).toHaveLength(0);
  });

  it("detects drift when code changes after baseline", () => {
    const baseline = snapshotFromGitRef("tsconfig.json", "HEAD", { cwd: tempRepo });

    writeFileSync(
      join(tempRepo, "api.ts"),
      `export function greet(name: string, prefix?: string): string { return "Hi"; }\n`
    );

    const current = analyzeProject(join(tempRepo, "tsconfig.json"));
    const report = compareSnapshots(baseline.snapshot, current);

    expect(report.addedFunctions).toHaveLength(0);
    expect(report.removedFunctions).toHaveLength(0);
    expect(report.modifiedFunctions).toHaveLength(1);
    expect(report.modifiedFunctions[0].name).toBe("greet");
    expect(report.modifiedFunctions[0].changes).toContainEqual(
      expect.objectContaining({
        type: "parameter-added",
        parameter: expect.objectContaining({ name: "prefix", optional: true }),
      })
    );
  });

  it("throws when not a git repository", () => {
    const nonRepo = mkdtempSync(join(tmpdir(), "flowlock-nongit-"));
    try {
      expect(() =>
        snapshotFromGitRef("tsconfig.json", "HEAD", { cwd: nonRepo })
      ).toThrow(/Not a git repository/);
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});
