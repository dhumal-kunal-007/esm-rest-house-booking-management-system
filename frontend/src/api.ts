export const AUTH_TOKEN_KEY =
  "esm-auth-token";

const LOCAL_API_ORIGIN = "http://localhost:5000";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || LOCAL_API_ORIGIN
).replace(/\/+$/, "");

export const saveAuthToken = (
  token: string
): void => {
  localStorage.setItem(
    AUTH_TOKEN_KEY,
    token
  );
};

export const getAuthToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_KEY);

export const clearAuthToken = (): void => {
  localStorage.removeItem(
    AUTH_TOKEN_KEY
  );
};

export const apiFetch = (
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> => {
  const headers =
    new Headers(init.headers);

  const token =
    localStorage.getItem(
      AUTH_TOKEN_KEY
    );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  const requestInput =
    typeof input === "string" &&
    (input === LOCAL_API_ORIGIN ||
      input.startsWith(`${LOCAL_API_ORIGIN}/`))
      ? `${API_BASE_URL}${input.slice(LOCAL_API_ORIGIN.length)}`
      : input;

  return fetch(requestInput, {
    ...init,
    headers,
  });
};
