"use client";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import { ArrowRight, CheckCircle2, BarChart3, Database, ShieldCheck, Plus, Type, List } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function HeroSection({ statsBadge }: { statsBadge?: React.ReactNode }) {
  const wallets = useWallets();
  const { mutate: connectWallet, isPending } = useConnectWallet();
  const currentAccount = useCurrentAccount();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleConnect() {
    const w = wallets[0];
    if (w) connectWallet({ wallet: w });
    else toast.error("No Sui wallet detected. Install Sui Wallet or Suiet.");
  }

  return (
    <section className="relative overflow-hidden bg-[var(--bg-base)] px-4 pb-16 pt-12 text-[var(--text-primary)] transition-colors duration-300 sm:px-6 lg:pb-24 lg:pt-20">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-500)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(70%_0.15_240)_0%,transparent_50%)] opacity-10 dark:opacity-20" />

      <div className="mx-auto max-w-7xl">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-16">
          
          {/* Left Column */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:col-span-6 lg:text-left"
          >
            {statsBadge && (
              <motion.div variants={itemVariants}>
                {statsBadge}
              </motion.div>
            )}
            
            <motion.h1 variants={itemVariants} className="text-5xl font-black tracking-tight sm:text-6xl md:text-7xl lg:text-[4.5rem] lg:leading-[1.05]">
              Put privacy <br className="hidden lg:block" />
              <span className="relative inline-block">
                first
                <svg aria-hidden="true" viewBox="0 0 418 42" className="absolute left-0 top-2/3 h-[0.4em] w-full fill-[var(--color-brand-300)] opacity-70" preserveAspectRatio="none"><path d="M203.371.916c-26.013-2.078-76.686 1.963-124.738 14.528-67.5 17.65-122.617 48.067-122.617 48.067L1.246 64.91s52.793-27.425 119.53-43.916c68.324-16.883 147.243-20.916 200.73-15.698 33.344 3.25 56.12 11.026 63.812 14.653l12.181-22.378c-9.018-4.226-31.954-12.756-72.396-16.655h.005zM294.025 8.163c-33.877-5.918-79.626-6.425-122.923-4.148-35.035 1.841-70.36 6.848-100.998 12.35L74.88 40.598c30.297-5.59 66.868-10.74 102.723-12.637 40.574-2.14 83.568-1.503 115.545 4.385l1.042-23.868-1.165-.315z"/></svg>
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] lg:mx-0 lg:text-xl">
              Fast, user-friendly and engaging — turn forms, votes, and applications into verifiable on-chain records with Walrus storage and Sui receipts.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              {mounted ? (
                isAuthenticated ? (
                  <Link href="/builder" className="w-full sm:w-auto">
                    <Button size="lg" variant="primary" className="w-full rounded-full bg-[var(--color-brand-600)] px-8 font-bold text-white shadow-lg hover:bg-[var(--color-brand-700)] h-12">
                      Open Builder
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    variant="primary"
                    loading={isPending}
                    onClick={handleConnect}
                    className="w-full sm:w-auto rounded-full bg-[var(--color-brand-600)] px-8 font-bold text-white shadow-lg hover:bg-[var(--color-brand-700)] h-12"
                  >
                    {currentAccount ? "Sign in to build" : "Connect Wallet"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )
              ) : (
                <div className="w-full sm:w-[180px] h-12 rounded-full bg-[var(--bg-muted)] animate-pulse" />
              )}
              
              <Link href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-8 font-bold text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] h-12"
                >
                  Book a demo
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-12 grid grid-cols-2 gap-8 border-t border-[var(--border-default)] pt-8 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-black text-[var(--text-primary)]">100%</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">On-chain storage</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--text-primary)]">~0s</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">Finality time</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="flex justify-center lg:justify-start items-center gap-1">
                  {[1,2,3,4,5].map(i => <ShieldCheck key={i} className="h-5 w-5 text-[var(--color-brand-500)]" fill="currentColor" />)}
                  <span className="ml-1 text-xl font-bold text-[var(--text-primary)]">5.0</span>
                </div>
                <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">Security rating</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - 3D Isometric UI */}
          <div className="relative mt-20 lg:col-span-6 lg:mt-0 flex h-[400px] sm:h-[500px] items-center justify-center perspective-[2000px]">
            <motion.div
              initial={{ opacity: 0, rotateX: 60, rotateZ: -45, y: 50 }}
              animate={{ opacity: 1, rotateX: 60, rotateZ: -45, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative w-[280px] sm:w-[360px] aspect-square"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Base Form Card */}
              <motion.div
                animate={{ z: [0, 20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-3xl bg-[var(--bg-elevated)] p-6 shadow-[20px_20px_60px_rgba(0,0,0,0.1),-1px_-1px_0_rgba(255,255,255,1)] dark:shadow-[20px_20px_60px_rgba(0,0,0,0.4),-1px_-1px_0_rgba(255,255,255,0.05)] border border-[var(--border-default)]"
              >
                <div className="h-6 w-32 rounded-full bg-[var(--bg-muted)] mb-6" />
                <div className="space-y-4">
                  <div className="h-12 w-full rounded-xl bg-[var(--bg-subtle)]" />
                  <div className="h-12 w-full rounded-xl bg-[var(--bg-subtle)]" />
                  <div className="h-24 w-full rounded-xl bg-[var(--bg-subtle)]" />
                  <div className="h-12 w-1/2 rounded-xl bg-[var(--color-brand-500)]" />
                </div>
              </motion.div>

              {/* Floating Builder Tool Card (Top Left) */}
              <motion.div
                animate={{ z: [50, 80, 50] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-12 -top-6 h-40 w-48 rounded-2xl bg-[var(--bg-elevated)]/90 p-4 shadow-[15px_15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[15px_15px_40px_rgba(0,0,0,0.4)] border border-[var(--border-subtle)] flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
                  <div className="h-5 w-5 rounded-md bg-[var(--color-brand-100)] flex items-center justify-center">
                    <Plus className="h-3.5 w-3.5 text-[var(--color-brand-600)]" />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Add Field</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                    <Type className="h-3 w-3 text-[var(--text-tertiary)]" />
                    <div className="h-2 w-16 bg-[var(--bg-muted)] rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--color-brand-300)] shadow-sm">
                    <List className="h-3 w-3 text-[var(--color-brand-500)]" />
                    <div className="h-2 w-12 bg-[var(--color-brand-200)] rounded-full" />
                  </div>
                </div>
              </motion.div>

              {/* Floating Chart Card (Top Right) */}
              <motion.div
                animate={{ z: [40, 70, 40] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-8 -top-12 h-48 w-60 rounded-2xl bg-[var(--bg-elevated)]/90 p-5 shadow-[15px_15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[15px_15px_40px_rgba(0,0,0,0.4)] border border-[var(--border-subtle)] flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 w-20 rounded-full bg-[var(--bg-muted)]" />
                  <BarChart3 className="h-5 w-5 text-[var(--color-brand-500)]" />
                </div>
                <div className="flex items-end gap-3 h-24 mt-4">
                  <div className="w-1/4 bg-[var(--color-brand-200)] rounded-t-md h-1/3" />
                  <div className="w-1/4 bg-[var(--color-brand-300)] rounded-t-md h-2/3" />
                  <div className="w-1/4 bg-[var(--color-brand-400)] rounded-t-md h-1/2" />
                  <div className="w-1/4 bg-[var(--color-brand-500)] rounded-t-md h-full" />
                </div>
              </motion.div>

              {/* Floating Status Card (Bottom Left) */}
              <motion.div
                animate={{ z: [30, 60, 30] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-8 -left-12 h-32 w-56 rounded-2xl bg-[var(--bg-elevated)]/90 p-4 shadow-[15px_15px_40px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[15px_15px_40px_rgba(0,0,0,0.4)] border border-[var(--border-subtle)] flex flex-col gap-3 justify-center"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />
                  <div className="h-3 w-24 rounded-full bg-[var(--bg-muted)]" />
                </div>
                <div className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-[var(--color-brand-500)]" />
                  <div className="h-3 w-32 rounded-full bg-[var(--bg-muted)]" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
