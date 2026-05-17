import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: {
    default: "WalrusForms — On-Chain Forms on Sui",
    template: "%s | WalrusForms",
  },
  description:
    "Create verifiable, on-chain forms on the Sui blockchain. Submissions stored on Walrus, encrypted with Seal, verified forever.",
  keywords: ["forms", "sui", "blockchain", "walrus", "web3", "on-chain", "decentralized"],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "WalrusForms — On-Chain Forms on Sui",
    description: "Create verifiable, on-chain forms. Every submission cryptographically provable.",
    siteName: "WalrusForms",
  },
  twitter: {
    card: "summary_large_image",
    title: "WalrusForms",
    description: "Create verifiable, on-chain forms on Sui.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo-icon.png",
    shortcut: "/logo-icon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        `}</style>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
