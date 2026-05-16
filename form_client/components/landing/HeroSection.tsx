"use client";
import { useConnectWallet, useWallets, useCurrentAccount } from "@mysten/dapp-kit";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Database,
  FileText,
  Layers,
  LockKeyhole,
  Play,
  Vote,
  WandSparkles,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

const spinnerCards = [
  {
    title: "Receipts",
    subtitle: "Sui Proof",
    tag: "0x verified",
    icon: Blocks,
    gradient: "from-violet-500 via-indigo-500 to-cyan-400",
    tilt: "-rotate-[18deg]",
  },
  {
    title: "Storage",
    subtitle: "Walrus Blob",
    tag: "sealed",
    icon: Database,
    gradient: "from-cyan-400 via-sky-500 to-violet-500",
    tilt: "-rotate-[10deg]",
  },
  {
    title: "Forms",
    subtitle: "Builder",
    tag: "new",
    icon: FileText,
    gradient: "from-violet-400 via-fuchsia-500 to-indigo-500",
    tilt: "rotate-0",
  },
  {
    title: "Private",
    subtitle: "Seal Policy",
    tag: "encrypted",
    icon: LockKeyhole,
    gradient: "from-indigo-500 via-violet-500 to-purple-400",
    tilt: "rotate-[10deg]",
  },
  {
    title: "Voting",
    subtitle: "DAO Flow",
    tag: "token gate",
    icon: Vote,
    gradient: "from-cyan-500 via-teal-400 to-indigo-500",
    tilt: "rotate-[18deg]",
  },
  {
    title: "Analysis",
    subtitle: "AI Summary",
    tag: "instant",
    icon: WandSparkles,
    gradient: "from-purple-500 via-violet-500 to-cyan-400",
    tilt: "rotate-[26deg]",
  },
];

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
    <section className="relative isolate overflow-hidden bg-[#fbfbff] px-4 pb-0 pt-10 text-slate-950 transition-colors duration-300 dark:bg-[#05070f] dark:text-white sm:px-6 lg:pt-12">
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_26%,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_18%_70%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(180deg,#ffffff_0%,#fbfbff_56%,#f2efff_100%)] dark:bg-[radial-gradient(circle_at_50%_24%,rgba(139,92,246,0.24),transparent_30%),radial-gradient(circle_at_18%_70%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(180deg,#05070f_0%,#0b1020_56%,#101127_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-64 bg-[linear-gradient(90deg,rgba(124,58,237,0.06)_1px,transparent_1px),linear-gradient(rgba(14,165,233,0.06)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)]"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex max-w-7xl flex-col items-center text-center"
      >

        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <h1 className="text-5xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl md:text-7xl lg:text-[3.25rem]">
            WalForms
          </h1>
          
        </motion.div>

        <motion.p variants={itemVariants} className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-md">
          Bring forms, votes, applications, and feedback on-chain with Walrus storage, Sui receipts,
          Seal privacy, and an interface that feels fast enough for real product teams.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link href="/builder">
              <Button size="lg" variant="primary" className="h-11 rounded-full bg-slate-950 px-8 text-sm text-white hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100">
                Open builder
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              variant="primary"
              loading={isPending}
              onClick={handleConnect}
              className="h-11 rounded-full bg-slate-950 px-8 text-sm text-white hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
            >
              {currentAccount ? "Sign in to build" : "Connect wallet"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Link href="#how-it-works">
            <Button
              size="lg"
              variant="secondary"
              className="h-11 rounded-full border-slate-950 bg-white px-8 text-sm text-slate-950 hover:bg-slate-50 dark:border-white/25 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10"
            >
              Learn More
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="relative mt-7 h-[310px] w-full overflow-hidden sm:h-[340px] lg:h-[370px]">
          <div
            aria-hidden
            className="absolute left-1/2 top-[190px] z-0 h-[560px] w-[1240px] -translate-x-1/2 rounded-[100%] border-t border-violet-200 bg-violet-100/70 dark:border-violet-300/15 dark:bg-violet-300/10 sm:top-[214px] lg:top-[230px]"
          />
          <motion.div
            aria-hidden
            animate={{ rotate: -360 }}
            transition={{ duration: 54, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-[70px] z-10 h-[820px] w-[820px] -translate-x-1/2 rounded sm:top-[74px] sm:h-[920px] sm:w-[920px] lg:top-[76px] lg:h-[1040px] lg:w-[1040px]"
          >
            {Array.from({ length: 18 }).map((_, index) => {
              const angle = index * 20;
              const card = spinnerCards[index % spinnerCards.length]!;
              return (
                <div
                  key={`${card.title}-${index}`}
                  className="absolute left-1/2 top-0 -translate-x-1/9 origin-[50%_410px] sm:origin-[50%_460px] lg:origin-[50%_520px]"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <SpinnerCard {...card} />
                </div>
              );
            })}
          </motion.div>

          <div
            aria-hidden
            className="absolute bottom-0 left-1/2 z-20 h-20 w-[460px] -translate-x-1/2 rounded-t-full bg-[conic-gradient(from_180deg,#8b5cf6,#c4b5fd,#67e8f9,#8b5cf6)] opacity-95 dark:opacity-80 sm:h-24 sm:w-[600px]"
          />
          <div
            aria-hidden
            className="absolute bottom-0 left-1/2 z-30 h-16 w-[360px] -translate-x-1/2 rounded-t-full bg-[#fbfbff] dark:bg-[#05070f] sm:h-20 sm:w-[500px]"
          />

          <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
            <span className="h-1.5 w-7 rounded-full bg-slate-800 dark:bg-white" />
            {Array.from({ length: 7 }).map((_, index) => (
              <span key={index} className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-white/25" />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function SpinnerCard({
  title,
  subtitle,
  tag,
  icon: Icon,
  gradient,
  tilt,
}: {
  title: string;
  subtitle: string;
  tag: string;
  icon: typeof Blocks;
  gradient: string;
  tilt: string;
}) {
  return (
    <div className={`w-[138px] rounded-2xl bg-violet-300 p-2 shadow-xl shadow-violet-400/20 sm:w-[158px] ${tilt}`}>
      <div className={`relative h-[112px] overflow-hidden rounded-xl bg-gradient-to-br ${gradient} sm:h-[128px]`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] [background-size:18px_18px]"
        />
        <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/25 blur-2xl" />
        <Icon className="absolute bottom-4 right-4 h-12 w-12 text-white/80" strokeWidth={1.4} />
        <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
        <span className="absolute bottom-3 left-3 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold uppercase text-white">
          {tag}
        </span>
      </div>
      <div className="px-1 pb-1 pt-2 text-left">
        <h3 className="text-2xl font-black leading-none tracking-tight text-white">{title}</h3>
        <div className="mt-2 inline-flex rounded-md bg-white/20 px-2 py-1 text-[10px] font-semibold text-white/90">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
