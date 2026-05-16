"use client";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import { ArrowRight, Layers, Shield, Database, CheckCircle2 } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function HeroSection() {
  const wallets = useWallets();
  const { mutate: connectWallet, isPending } = useConnectWallet();
  const currentAccount = useCurrentAccount();
  const { isAuthenticated } = useAuth();

  function handleConnect() {
    const w = wallets[0];
    if (w) connectWallet({ wallet: w });
    else toast.error("No Sui wallet detected. Install Sui Wallet or Suiet.");
  }

  return (
    <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6">
      {/* Background glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <motion.div 
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--color-brand-600)]/10 blur-[100px]" 
        />
        <motion.div 
          animate={{ x: [0, 20, 0], y: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-[oklch(60%_0.25_290)]/8 blur-[80px]" 
        />
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-4xl text-center"
      >
        {/* Pill badge */}
        <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/10 px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-400)] animate-pulse" />
          <span className="text-xs font-medium text-[var(--color-brand-400)]">
            On-chain · Sui Testnet
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1 variants={itemVariants} className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Forms that are{" "}
          <span className="gradient-text">cryptographically</span>
          <br />
          verifiable forever
        </motion.h1>

        <motion.p variants={itemVariants} className="mx-auto mb-10 max-w-2xl text-lg text-[var(--text-secondary)] leading-relaxed sm:text-xl">
          WalrusForms stores every submission on{" "}
          <span className="font-medium text-[var(--text-primary)]">Walrus</span>, records a receipt
          on{" "}
          <span className="font-medium text-[var(--text-primary)]">Sui</span>, and optionally
          encrypts responses with{" "}
          <span className="font-medium text-[var(--text-primary)]">Seal</span>. No trust required —
          anyone can verify independently.
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {isAuthenticated ? (
            <Link href="/builder">
              <Button size="lg" variant="primary">
                Create a form
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button size="lg" variant="primary" loading={isPending} onClick={handleConnect}>
              <Layers className="h-5 w-5" />
              {currentAccount ? "Sign in to build" : "Connect wallet to start"}
            </Button>
          )}
          <Link href="#how-it-works">
            <Button size="lg" variant="secondary">
              How it works
            </Button>
          </Link>
        </motion.div>

        {/* Trust badges */}
        <motion.div variants={itemVariants} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-tertiary)]">
          {[
            { icon: Shield, text: "Seal-encrypted privacy" },
            { icon: Database, text: "Walrus decentralized storage" },
            { icon: CheckCircle2, text: "On-chain verifiable receipts" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 transition-colors hover:text-[var(--text-primary)] cursor-default">
              <Icon className="h-4 w-4 text-[var(--color-brand-400)]" />
              <span>{text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
