"use client";
/**
 * Auth orchestration hook — handles SiWS flow and silent refresh on mount.
 */
import { useCallback, useEffect } from "react";
import { useSignPersonalMessage, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { useAuthStore } from "../store/auth";
import { requestNonce, verifySiWS, logout as apiLogout } from "../lib/api/auth";

export function useAuth() {
  const { setAuth, clearAuth, setInitialized, isAuthenticated, isInitializing, walletAddress } =
    useAuthStore();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  // Sign-in with wallet (SiWS)
  const signIn = useCallback(async () => {
    if (!currentAccount?.address) {
      throw new Error("No wallet connected. Please connect your wallet first.");
    }

    const address = currentAccount.address;

    // 1. Request nonce from server
    const { nonce } = await requestNonce(address);

    const message = `Welcome to WalrusForms!\n\nPlease sign this message to authenticate your wallet.\n\nNonce: ${nonce}`;

    // 2. Sign the message with the wallet
    const { signature } = await signMessage({
      message: new TextEncoder().encode(message),
    });

    // 3. Verify signature with server → get access token
    const { accessToken } = await verifySiWS({
      walletAddress: address,
      signedMessage: message,
      signature,
      nonce,
    });

    setAuth(accessToken, address);
    return accessToken;
  }, [currentAccount?.address, signMessage, setAuth]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    clearAuth();
    disconnectWallet();
  }, [clearAuth, disconnectWallet]);

  return {
    signIn,
    signOut,
    isAuthenticated,
    isInitializing,
    walletAddress,
    connectedAddress: currentAccount?.address ?? null,
    isWalletConnected: !!currentAccount,
  };
}
