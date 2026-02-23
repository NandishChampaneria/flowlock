import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const FIXTURES = join(ROOT, "test/fixtures/complex");

function flowlock(args: string, cwd = FIXTURES): string {
  return execSync(`node ${join(ROOT, "dist/cli.js")} ${args}`, {
    cwd,
    encoding: "utf-8",
  });
}

describe("CLI", () => {
  it("flowlock snapshot --no-save prints analysis", () => {
    const out = flowlock("snapshot --no-save -c tsconfig.json");
    expect(out).toMatch(/Analyzed:.*functions.*interfaces.*types/);
  });

  it("flowlock snapshot saves to output path", () => {
    const out = flowlock(
      "snapshot -c tsconfig.json -o .flowlock/cli-test.json"
    );
    expect(out).toMatch(/Snapshot saved to/);
    expect(out).toContain("cli-test.json");
  });

  it("flowlock check fails when baseline file does not exist", () => {
    expect(() =>
      flowlock("check -b .flowlock/nonexistent.json --fail-on breaking")
    ).toThrow();
  });

  it("flowlock compare current current shows no drift", () => {
    const out = flowlock("compare current current -c tsconfig.json");
    expect(out).toMatch(/No drift detected/);
  });

  it("flowlock compare outputs suggested version", () => {
    const out = flowlock("compare current current -c tsconfig.json");
    expect(out).toMatch(/Suggested version bump: patch/);
  });

  it("flowlock --version prints version", () => {
    const out = flowlock("--version");
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
