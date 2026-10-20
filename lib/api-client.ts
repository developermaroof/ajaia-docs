// Browser-side helper for calling our JSON API.
import type { ApiError } from "./types";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: ApiError,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; form?: FormData };

export async function apiFetch<T>(url: string, { json, form, headers, ...init }: ApiInit = {}): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
    // For FormData the browser sets the multipart Content-Type (with its boundary) itself.
    body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
  });
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => undefined)) as ApiError | undefined;
  throw new ApiRequestError(
    response.status,
    body?.error ?? `Request failed with status ${response.status}.`,
    body,
  );
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

// Our API's messages are written for people; anything else (network failures) gets a plain one.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return "Couldn't reach the server. Check your connection and try again.";
}

export function goToLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.assign(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
}
