import type { ApiError, ApiSuccess } from "@live-crm/shared";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiError;

  if (!response.ok || "error" in payload) {
    const error =
      "error" in payload
        ? payload.error
        : { code: "REQUEST_FAILED", message: "Request failed" };
    throw new ApiClientError(error.message, error.code, error.details);
  }

  return payload.data;
}
