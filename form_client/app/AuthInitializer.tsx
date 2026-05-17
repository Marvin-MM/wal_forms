"use client";
/**
 * Attempts a silent token refresh on app mount.
 * Renders nothing — purely a side-effect component.
 */
import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { env } from "../lib/env";
import { setAccessToken } from "../lib/api/client";

export function AuthInitializer() {
  const { setAuth, setInitialized } = useAuthStore();
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = typeof window === "undefined" 
          ? `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh` 
          : "/api/auth/refresh";
          
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
        });

        if (cancelled) return;

        if (res.ok) {
          const body = (await res.json()) as { data?: { accessToken?: string } };
          const token = body.data?.accessToken;
          if (token) {
            const address = currentAccount?.address ?? "";
            setAccessToken(token);
            setAuth(token, address);
          }
        }
      } catch {
        // Silent refresh failed — user is not authenticated
      } finally {
        if (!cancelled) setInitialized();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
