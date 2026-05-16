"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { WalletProvider, SuiClientProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { env } from "../lib/env";
import { AuthInitializer } from "./AuthInitializer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" as const },
  mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" as const },
  devnet: { url: getJsonRpcFullnodeUrl("devnet"), network: "devnet" as const },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider
          networks={networkConfig}
          defaultNetwork={env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet" | "devnet"}
        >
          <WalletProvider autoConnect={true}>
            <AuthInitializer />
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                },
              }}
            />
          </WalletProvider>
        </SuiClientProvider>
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
