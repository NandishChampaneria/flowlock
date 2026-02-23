/**
 * Security validation utilities.
 * Prevents path traversal, command injection, and unsafe path operations.
 */

import { resolve, relative } from "path";

/** Characters that could enable command injection in shell contexts. */
const UNSAFE_REF_CHARS = /["'`$\\;|&<>()\s]/;

/** Maximum path length to prevent DoS. */
const MAX_PATH_LENGTH = 4096;

/**
 * Validates a git ref for safe use in shell commands.
 * Rejects refs containing shell metacharacters or control characters.
 *
 * @param ref - Git ref (branch, tag, or commit SHA)
 * @returns The ref if valid
 * @throws If ref contains unsafe characters
 */
export function validateGitRef(ref: string): string {
  if (typeof ref !== "string") {
    throw new Error("Git ref must be a string");
  }
  const trimmed = ref.trim();
  if (trimmed.length === 0) {
    throw new Error("Git ref cannot be empty");
  }
  if (trimmed.length > 256) {
    throw new Error("Git ref exceeds maximum length (256)");
  }
  if (/[\x00-\x1f\x7f]/.test(ref) || UNSAFE_REF_CHARS.test(ref)) {
    throw new Error(
      "Git ref contains invalid characters. Use only alphanumeric, hyphens, dots, slashes."
    );
  }
  return trimmed;
}

/**
 * Validates a file path and resolves it safely.
 * Rejects paths that escape the base directory or exceed length limits.
 *
 * @param path - Path to validate
 * @param baseDir - Base directory (default: cwd)
 * @returns Resolved absolute path
 * @throws If path is invalid or escapes base
 */
export function validatePath(path: string, baseDir?: string): string {
  if (typeof path !== "string") {
    throw new Error("Path must be a string");
  }
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    throw new Error("Path cannot be empty");
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(`Path exceeds maximum length (${MAX_PATH_LENGTH})`);
  }
  const base = resolve(baseDir ?? process.cwd());
  const resolved = resolve(base, trimmed);
  const rel = relative(base, resolved);
  if (rel.startsWith("..") || rel.startsWith("/")) {
    throw new Error("Path resolves outside allowed directory");
  }
  return resolved;
}

/**
 * Validates that a path does not contain path traversal sequences
 * before resolution.
 */
export function sanitizePathComponent(component: string): string {
  if (component.includes("..") || component.startsWith("/")) {
    throw new Error("Invalid path component");
  }
  return component;
}
