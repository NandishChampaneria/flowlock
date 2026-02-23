export type ID = string | number;

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface ApiRequest<T = unknown> {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: T;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export type AsyncResult<T> = Promise<Result<T>>;
