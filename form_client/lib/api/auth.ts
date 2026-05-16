import { apiRequest } from "./client";

export interface NonceResponse {
  nonce: string;
  message: string;
}

export interface AuthTokens {
  accessToken: string;
}

export async function requestNonce(walletAddress: string): Promise<NonceResponse> {
  return apiRequest<NonceResponse>("/auth/nonce", {
    method: "POST",
    body: { walletAddress },
    skipAuth: true,
  });
}

export async function verifySiWS(params: {
  walletAddress: string;
  signedMessage: string;
  signature: string;
  nonce: string;
}): Promise<AuthTokens> {
  return apiRequest<AuthTokens>("/auth/verify", {
    method: "POST",
    body: params,
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  await apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}
