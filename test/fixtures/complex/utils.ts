import type { Result } from "./types.js";

export function mapResult<T, U>(
  result: Result<T>,
  fn: (value: T) => U
): Result<U> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return { ok: false, error: result.error };
}

export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

export function coalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  return values.find((v): v is T => v != null);
}
