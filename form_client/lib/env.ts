import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_WS_BASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUI_RPC_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_SUI_NETWORK: z.enum(["testnet", "mainnet", "devnet"]).default("testnet"),
  NEXT_PUBLIC_SUI_PACKAGE_ADDRESS: z.string().min(1),
  NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
  NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS: z.string().min(1),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL,
    NEXT_PUBLIC_SUI_RPC_ENDPOINT: process.env.NEXT_PUBLIC_SUI_RPC_ENDPOINT,
    NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
    NEXT_PUBLIC_SUI_PACKAGE_ADDRESS: process.env.NEXT_PUBLIC_SUI_PACKAGE_ADDRESS,
    NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT,
    NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS: process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS,
  });

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    // In production builds this would throw; in dev we warn and use defaults
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
  }

  return parsed.data ?? {
    NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
    NEXT_PUBLIC_WS_BASE_URL: "ws://localhost:3000",
    NEXT_PUBLIC_SUI_RPC_ENDPOINT: "https://fullnode.testnet.sui.io:443",
    NEXT_PUBLIC_SUI_NETWORK: "testnet" as const,
    NEXT_PUBLIC_SUI_PACKAGE_ADDRESS: "0x0",
    NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT: "https://aggregator.walrus-testnet.walrus.space",
    NEXT_PUBLIC_WALRUS_PUBLISHER_ENDPOINT: "https://publisher.walrus-testnet.walrus.space",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS: "0x0",
  };
}

export const env = validateEnv();
