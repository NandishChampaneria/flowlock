import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import { analyzeProject, saveSnapshot, loadSnapshot, compareSnapshots } from "../index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const COMPLEX_TSCONFIG = join(__dirname, "../../test/fixtures/complex/tsconfig.json");

describe("Snapshot persistence", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(process.cwd(), "tmp", `flowlock-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("saves and loads a snapshot with round-trip fidelity", () => {
    const snapshot = analyzeProject(COMPLEX_TSCONFIG);
    const outputPath = join(tempDir, "snapshot.json");

    saveSnapshot(snapshot, COMPLEX_TSCONFIG, { outputPath, baseDir: process.cwd() });
    expect(existsSync(outputPath)).toBe(true);

    const stored = loadSnapshot(outputPath, { baseDir: process.cwd() });

    expect(stored.metadata.version).toBe(1);
    expect(stored.metadata.createdAt).toBeDefined();
    expect(stored.metadata.tsConfigPath).toBe(COMPLEX_TSCONFIG);
    expect(Object.keys(stored.snapshot.symbols.functions).length).toBe(
      Object.keys(snapshot.symbols.functions).length
    );

    const report = compareSnapshots(stored.snapshot, snapshot);
    expect(report.addedFunctions).toHaveLength(0);
    expect(report.removedFunctions).toHaveLength(0);
    expect(report.modifiedFunctions).toHaveLength(0);
  });

  it("includes git metadata when provided", () => {
    const snapshot = analyzeProject(COMPLEX_TSCONFIG);
    const outputPath = join(tempDir, "snapshot.json");

    saveSnapshot(snapshot, COMPLEX_TSCONFIG, {
      outputPath,
      baseDir: process.cwd(),
      gitRef: "main",
      gitSha: "abc1234",
    });

    const stored = loadSnapshot(outputPath, { baseDir: process.cwd() });
    expect(stored.metadata.gitRef).toBe("main");
    expect(stored.metadata.gitSha).toBe("abc1234");
  });

  it("creates output directory if it does not exist", () => {
    const snapshot = analyzeProject(COMPLEX_TSCONFIG);
    const outputPath = join(tempDir, "nested", "dir", "snapshot.json");

    const savedPath = saveSnapshot(snapshot, COMPLEX_TSCONFIG, {
      outputPath,
      baseDir: process.cwd(),
    });
    expect(savedPath).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
  });

  it("throws when loading non-existent file", () => {
    expect(() =>
      loadSnapshot(join(tempDir, "nonexistent.json"), { baseDir: process.cwd() })
    ).toThrow(
      /Snapshot file not found/
    );
  });

  it("throws when loading invalid JSON", () => {
    const badPath = join(tempDir, "bad.json");
    writeFileSync(badPath, "not valid json {", "utf-8");

    expect(() => loadSnapshot(badPath, { baseDir: process.cwd() })).toThrow(
      /Invalid snapshot file \(not valid JSON\)/
    );
  });

  it("throws when loading file with missing required fields", () => {
    const badPath = join(tempDir, "incomplete.json");
    writeFileSync(badPath, '{"foo": "bar"}', "utf-8");

    expect(() => loadSnapshot(badPath, { baseDir: process.cwd() })).toThrow(
      /missing required fields/
    );
  });

  it("throws when loading unsupported version", () => {
    const badPath = join(tempDir, "old-version.json");
    writeFileSync(
      badPath,
      JSON.stringify({
        metadata: { version: 99, createdAt: new Date().toISOString(), tsConfigPath: "/" },
        snapshot: { symbols: { functions: {}, interfaces: {}, types: {} } },
      }),
      "utf-8"
    );

    expect(() => loadSnapshot(badPath, { baseDir: process.cwd() })).toThrow(
      /Unsupported snapshot version/
    );
  });
});
