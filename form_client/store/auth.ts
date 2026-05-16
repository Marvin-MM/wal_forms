"use client";
/**
 * Authentication Zustand store.
 * Access token lives in memory ONLY — never localStorage, sessionStorage, or cookies.
 */
import { create } from "zustand";
import { setAccessToken } from "../lib/api/client";

interface AuthState {
  /** In-memory access token. Never persisted. */
  accessToken: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  /** True while the silent refresh check is running on app load. */
  isInitializing: boolean;

  // Actions
  setAuth: (token: string, walletAddress: string) => void;
  clearAuth: () => void;
  setInitialized: () => void;
  setWalletAddress: (address: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  walletAddress: null,
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (token, walletAddress) => {
    setAccessToken(token);
    set({ accessToken: token, walletAddress, isAuthenticated: true });
  },

  clearAuth: () => {
    setAccessToken(null);
    set({ accessToken: null, walletAddress: null, isAuthenticated: false });
  },

  setInitialized: () => {
    set({ isInitializing: false });
  },

  setWalletAddress: (address) => {
    set({ walletAddress: address });
  },
}));
