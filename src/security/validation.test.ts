import { describe, it, expect } from "vitest";
import { validateGitRef, validatePath } from "./validation.js";

describe("Security validation", () => {
  describe("validateGitRef", () => {
    it("accepts valid refs", () => {
      expect(validateGitRef("main")).toBe("main");
      expect(validateGitRef("origin/main")).toBe("origin/main");
      expect(validateGitRef("v1.0.0")).toBe("v1.0.0");
      expect(validateGitRef("abc1234")).toBe("abc1234");
    });

    it("rejects refs with shell metacharacters", () => {
      expect(() => validateGitRef("main; rm -rf /")).toThrow(/invalid characters/);
      expect(() => validateGitRef('main"')).toThrow(/invalid characters/);
      expect(() => validateGitRef("main$")).toThrow(/invalid characters/);
    });

    it("rejects refs with control characters", () => {
      expect(() => validateGitRef("main\n")).toThrow(/invalid characters/);
      expect(() => validateGitRef("main\t")).toThrow(/invalid characters/);
    });

    it("rejects empty ref", () => {
      expect(() => validateGitRef("")).toThrow(/cannot be empty/);
      expect(() => validateGitRef("   ")).toThrow(/cannot be empty/);
    });

    it("rejects non-string", () => {
      expect(() => validateGitRef(null as unknown as string)).toThrow(
        /must be a string/
      );
    });
  });

  describe("validatePath", () => {
    const base = "/home/project";

    it("accepts paths within base", () => {
      expect(validatePath("tsconfig.json", base)).toContain("tsconfig");
      expect(validatePath(".flowlock/snapshot.json", base)).toContain(
        "flowlock"
      );
    });

    it("rejects path traversal", () => {
      expect(() => validatePath("../../../etc/passwd", base)).toThrow(
        /outside allowed directory/
      );
      expect(() => validatePath("..", base)).toThrow(/outside allowed/);
    });

    it("rejects empty path", () => {
      expect(() => validatePath("", base)).toThrow(/cannot be empty/);
    });

    it("rejects non-string", () => {
      expect(() => validatePath(null as unknown as string, base)).toThrow(
        /must be a string/
      );
    });
  });
});
