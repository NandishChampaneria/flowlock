import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { analyzeProject, compareSnapshots } from "../index.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIXTURES_DIR = path.join(__dirname, "../../test/fixtures");
const SAMPLE_PATH = path.join(FIXTURES_DIR, "sample.ts");
const TSCONFIG_PATH = path.join(FIXTURES_DIR, "tsconfig.json");
const COMPLEX_TSCONFIG = path.join(FIXTURES_DIR, "complex/tsconfig.json");
const COMPLEX_API_PATH = path.join(FIXTURES_DIR, "complex/api.ts");

const BEFORE_CONTENT = `export function greet(name: string): string {
  return \`Hello, \${name}\`;
}

export function add(a: number, b: number): number {
  return a + b;
}
`;

const AFTER_CONTENT = `export function greet(name: string, greeting?: string): string {
  return \`\${greeting ?? "Hello"}, \${name}\`;
}

export function add(a: number, b: number): number {
  return a + b;
}
`;

describe("FlowLock", () => {
  it("analyzes a project and extracts symbols", () => {
    const tsConfigPath = path.join(__dirname, "../../tsconfig.json");
    const snapshot = analyzeProject(tsConfigPath);

    expect(snapshot.symbols).toBeDefined();
    expect(snapshot.symbols.functions).toBeDefined();
    expect(snapshot.symbols.interfaces).toBeDefined();
    expect(snapshot.symbols.types).toBeDefined();
  });

  it("analyzes FlowLock itself (real project)", () => {
    const tsConfigPath = path.join(__dirname, "../../tsconfig.json");
    const snapshot = analyzeProject(tsConfigPath);

    const fns = Object.keys(snapshot.symbols.functions);
    expect(fns.some((k) => k.includes("analyzeProject"))).toBe(true);
    expect(fns.some((k) => k.includes("compareSnapshots"))).toBe(true);
    expect(fns.some((k) => k.includes("extractSymbols"))).toBe(true);
    expect(fns.some((k) => k.includes("compareSignatures"))).toBe(true);
  });

  it("compares two identical snapshots and finds no drift", () => {
    const tsConfigPath = path.join(__dirname, "../../tsconfig.json");
    const snapshot = analyzeProject(tsConfigPath);
    const report = compareSnapshots(snapshot, snapshot);

    expect(report.addedFunctions).toHaveLength(0);
    expect(report.removedFunctions).toHaveLength(0);
    expect(report.modifiedFunctions).toHaveLength(0);
  });

  it("detects drift when function signature changes", () => {
    const original = readFileSync(SAMPLE_PATH, "utf-8");
    try {
      writeFileSync(SAMPLE_PATH, BEFORE_CONTENT);
      const before = analyzeProject(TSCONFIG_PATH);

      writeFileSync(SAMPLE_PATH, AFTER_CONTENT);
      const after = analyzeProject(TSCONFIG_PATH);

      const report = compareSnapshots(before, after);

      expect(report.addedFunctions).toHaveLength(0);
      expect(report.removedFunctions).toHaveLength(0);
      expect(report.modifiedFunctions).toHaveLength(1);
      expect(report.modifiedFunctions[0].name).toBe("greet");
      expect(report.modifiedFunctions[0].changes).toContainEqual(
        expect.objectContaining({
          type: "parameter-added",
          parameter: expect.objectContaining({
            name: "greeting",
            type: "string",
            optional: true,
          }),
        })
      );
    } finally {
      writeFileSync(SAMPLE_PATH, original);
    }
  });

  it("analyzes a complex multi-file project with generics, classes, and interfaces", () => {
    const snapshot = analyzeProject(COMPLEX_TSCONFIG);

    const fnKeys = Object.keys(snapshot.symbols.functions);
    const ifaceKeys = Object.keys(snapshot.symbols.interfaces);
    const typeKeys = Object.keys(snapshot.symbols.types);

    expect(fnKeys.length).toBeGreaterThanOrEqual(10);
    expect(ifaceKeys.length).toBeGreaterThanOrEqual(4);
    expect(typeKeys.length).toBeGreaterThanOrEqual(3);

    expect(fnKeys.some((k) => k.includes("fetchApi"))).toBe(true);
    expect(fnKeys.some((k) => k.includes("createRequest"))).toBe(true);
    expect(fnKeys.some((k) => k.includes("UserService.getUser"))).toBe(true);
    expect(fnKeys.some((k) => k.includes("UserService.createUser"))).toBe(true);

    expect(ifaceKeys.some((k) => k.includes("User"))).toBe(true);
    expect(ifaceKeys.some((k) => k.includes("ApiRequest"))).toBe(true);

    expect(typeKeys.some((k) => k.includes("Result"))).toBe(true);
    expect(typeKeys.some((k) => k.includes("ID"))).toBe(true);
  });

  it("detects multiple drift types in a complex project", () => {
    const original = readFileSync(COMPLEX_API_PATH, "utf-8");
    try {
      const before = analyzeProject(COMPLEX_TSCONFIG);

      writeFileSync(
        COMPLEX_API_PATH,
        `import type { ApiRequest, ApiResponse, Result } from "./types.js";

export async function fetchApi<T, B = unknown>(
  request: ApiRequest<B>
): Promise<Result<ApiResponse<T>>> {
  const response = await fetch(request.path, {
    method: request.method,
    body: request.body ? JSON.stringify(request.body) : undefined,
    headers: request.headers ?? {},
  });
  const data = (await response.json()) as T;
  return { ok: true, value: { status: response.status, data, headers: {} } };
}

export function createRequest<T>(
  method: ApiRequest["method"],
  path: string,
  body?: T,
  headers?: Record<string, string>
): ApiRequest<T> {
  return { method, path, body, headers };
}

export function transformResponse<T, U>(
  response: ApiResponse<T>,
  transform: (data: T) => U
): ApiResponse<U> {
  return { ...response, data: transform(response.data) };
}
`
      );

      const after = analyzeProject(COMPLEX_TSCONFIG);
      const report = compareSnapshots(before, after);

      expect(report.addedFunctions).toHaveLength(0);
      expect(report.removedFunctions).toHaveLength(0);

      const createRequestDrift = report.modifiedFunctions.find(
        (d) => d.name === "createRequest"
      );
      expect(createRequestDrift).toBeDefined();
      expect(createRequestDrift!.changes).toContainEqual(
        expect.objectContaining({
          type: "parameter-added",
          parameter: expect.objectContaining({
            name: "headers",
            optional: true,
          }),
        })
      );
    } finally {
      writeFileSync(COMPLEX_API_PATH, original);
    }
  });
});
