"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { useConnectWallet, useWallets } from "@mysten/dapp-kit";
import { toast } from "sonner";

export function LandingCTA() {
  const { isAuthenticated } = useAuth();
  const wallets = useWallets();
  const { mutate: connectWallet, isPending } = useConnectWallet();

  return (
    <section className="relative py-32 px-4 sm:px-6 overflow-hidden" aria-labelledby="cta-heading">
      {/* Background glow for CTA */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-[var(--color-brand-600)]/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="relative rounded-3xl p-[1px] overflow-hidden"
        >
          {/* Animated border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand-400)] via-[var(--color-brand-600)] to-[var(--color-brand-400)] animate-spin opacity-50" style={{ animationDuration: '8s' }} />
          
          <div className="relative rounded-3xl bg-[var(--bg-elevated)]/90 backdrop-blur-xl px-8 py-16 shadow-2xl">
            <h2 id="cta-heading" className="mb-6 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Start building verifiable forms
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-[var(--text-secondary)]">
              Connect your Sui wallet to create your first form. Submissions are live on-chain in minutes.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isAuthenticated ? (
                <Link href="/builder">
                  <Button size="lg" variant="primary">
                    Open builder <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  variant="primary"
                  loading={isPending}
                  onClick={() => {
                    const w = wallets[0];
                    if (w) connectWallet({ wallet: w });
                    else toast.error("No Sui wallet detected.");
                  }}
                >
                  Connect wallet & start
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Link href="/verify/0x0">
                <Button size="lg" variant="ghost" className="hover:bg-[var(--bg-subtle)] transition-colors">
                  See verification demo
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
