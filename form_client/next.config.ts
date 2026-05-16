import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aggregator.testnet.walrus.space",
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus-testnet.walrus.space",
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus.space",
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus-mainnet.walrus.space",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://aggregator.testnet.walrus.space https://aggregator.walrus-testnet.walrus.space https://aggregator.walrus.space https://aggregator.walrus-mainnet.walrus.space",
              "connect-src 'self' https://fullnode.testnet.sui.io https://aggregator.testnet.walrus.space https://publisher.testnet.walrus.space http://localhost:* wss://localhost:* ws://localhost:* https://*.walrus.space",
              "frame-src https://challenges.cloudflare.com",
              "worker-src blob:",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/:path*", // Proxy to Backend
      },
      {
        source: "/ws/:path*",
        destination: "http://localhost:5000/ws/:path*", // Proxy WebSocket to Backend
      },
    ];
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001"],
    },
  },

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
