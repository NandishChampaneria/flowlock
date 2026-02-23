/**
 * Integration test: full baseline → change → compare workflow.
 * Verifies the production use case end-to-end.
 */
import { describe, it, expect } from "vitest";
import { writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  analyzeProject,
  saveSnapshot,
  loadSnapshot,
  compareSnapshots,
} from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "../../test/fixtures/complex");
const TSCONFIG = join(FIXTURES, "tsconfig.json");
const API_PATH = join(FIXTURES, "api.ts");

describe("Full workflow integration", () => {
  it("save baseline → modify code → load baseline → compare → detect drift", () => {
    const baselinePath = join(FIXTURES, ".flowlock", "workflow-baseline.json");

    const original = readFileSync(API_PATH, "utf-8");
    try {
      const snapshot = analyzeProject(TSCONFIG);
      saveSnapshot(snapshot, TSCONFIG, {
        outputPath: baselinePath,
        gitRef: "main",
      });

      const modified = readFileSync(API_PATH, "utf-8").replace(
        "body?: T\n): ApiRequest<T>",
        "body?: T,\n  headers?: Record<string, string>\n): ApiRequest<T>"
      );
      writeFileSync(API_PATH, modified);

      const stored = loadSnapshot(baselinePath);
      const current = analyzeProject(TSCONFIG);
      const report = compareSnapshots(stored.snapshot, current);

      expect(report.modifiedFunctions.length).toBeGreaterThan(0);
      const createRequest = report.modifiedFunctions.find(
        (d) => d.name === "createRequest"
      );
      expect(createRequest).toBeDefined();
      expect(createRequest!.changes.some((c) => c.type === "parameter-added")).toBe(
        true
      );
    } finally {
      writeFileSync(API_PATH, original);
      const flowlockDir = join(FIXTURES, ".flowlock");
      if (existsSync(flowlockDir)) {
        rmSync(flowlockDir, { recursive: true, force: true });
      }
    }
  });
});
