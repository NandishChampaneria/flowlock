import type { ApiRequest, ApiResponse, Result } from "./types.js";

export async function fetchApi<T, B = unknown>(
  request: ApiRequest<B>
): Promise<Result<ApiResponse<T>>> {
  const response = await fetch(request.path, {
    method: request.method,
    body: request.body ? JSON.stringify(request.body) : undefined,
    headers: request.headers,
  });
  const data = (await response.json()) as T;
  return {
    ok: true,
    value: { status: response.status, data, headers: {} },
  };
}

export function createRequest<T>(
  method: ApiRequest["method"],
  path: string,
  body?: T
): ApiRequest<T> {
  return { method, path, body };
}

export function transformResponse<T, U>(
  response: ApiResponse<T>,
  transform: (data: T) => U
): ApiResponse<U> {
  return {
    ...response,
    data: transform(response.data),
  };
}
