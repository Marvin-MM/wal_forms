/**
 * Base API client — typed fetch wrapper with JWT attachment and token refresh.
 * Works in both Node.js (server components) and browser (client components).
 */
import { env } from "../env";
import { ApiError, type ApiResponse } from "../../shared/types/api";

// In-memory token store — never touches localStorage or cookies
let inMemoryAccessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const url = typeof window === "undefined"
      ? `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`
      : "/api/auth/refresh";

    const res = await fetch(url, {
      method: "POST",
      credentials: "include", // send httpOnly refresh cookie
    });

    if (!res.ok) {
      inMemoryAccessToken = null;
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      return null;
    }

    const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
    const newToken = body.data?.accessToken ?? null;
    inMemoryAccessToken = newToken;
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
    return newToken;
  } catch {
    inMemoryAccessToken = null;
    refreshQueue.forEach((cb) => cb(null));
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip attaching JWT. Used for public endpoints. */
  skipAuth?: boolean;
  /** Override base URL for external requests. */
  baseUrl?: string;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, baseUrl, ...rest } = options;
  // For server-side rendering, hit backend directly. For client-side, use the Next.js proxy.
  const isServer = typeof window === "undefined";
  const defaultBase = isServer ? env.NEXT_PUBLIC_API_BASE_URL : "/api";
  const base = baseUrl ?? defaultBase;
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> | undefined),
  };

  if (!skipAuth && inMemoryAccessToken) {
    headers["Authorization"] = `Bearer ${inMemoryAccessToken}`;
  }

  const init: RequestInit = {
    ...rest,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await fetch(url, init);

  // Attempt token refresh on 401 (browser only)
  if (res.status === 401 && !skipAuth && typeof window !== "undefined") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...init, headers });
    }
  }

  if (!res.ok) {
    let errorBody: ApiResponse | null = null;
    try {
      errorBody = (await res.json()) as ApiResponse;
    } catch {
      // ignore parse failure
    }

    throw new ApiError(
      errorBody?.error?.code ?? "UNKNOWN_ERROR",
      errorBody?.error?.message ?? `HTTP ${res.status}`,
      res.status,
      errorBody?.error?.details
    );
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json.data as T;
}
