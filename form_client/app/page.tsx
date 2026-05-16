import { Suspense } from "react";
import type { Metadata } from "next";
import { getHealth } from "../lib/api/misc";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { HeroSection } from "../components/landing/HeroSection";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { StatsBar } from "../components/landing/StatsBar";
import { HowItWorks } from "../components/landing/HowItWorks";
import { LandingCTA } from "../components/landing/LandingCTA";

export const metadata: Metadata = {
  title: "WalrusForms — On-Chain Forms on Sui",
  description:
    "Create verifiable, decentralized forms on the Sui blockchain. Every submission is stored on Walrus, optionally encrypted with Seal, and verifiable forever on-chain.",
};

async function fetchStats() {
  try {
    return await getHealth();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const statsPromise = fetchStats();

  return (
    <div className="min-h-screen bg-[var(--bg-base)] overflow-x-hidden">
      <Header />
      <main>
        <HeroSection />
        <Suspense fallback={<div className="h-20" />}>
          <StatsBarWrapper statsPromise={statsPromise} />
        </Suspense>
        <FeatureGrid />
        <HowItWorks />
        <LandingCTA />
      </main>
      <Footer />
    </div>
  );
}

async function StatsBarWrapper({ statsPromise }: { statsPromise: ReturnType<typeof fetchStats> }) {
  const health = await statsPromise;
  return <StatsBar health={health} />;
}
