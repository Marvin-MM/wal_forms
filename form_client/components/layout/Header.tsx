"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Blocks, FileText, Layers, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnectButton } from "./WalletConnectButton";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";

const publicLinks = [
  { href: "#features-heading", label: "Features", icon: Sparkles },
  { href: "#how-it-works", label: "Proof Flow", icon: Blocks },
  { href: "/verify/0x0", label: "Verify", icon: ShieldCheck },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-violet-200/60 bg-white/78 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-[#05070f]/80">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-full pr-2 font-black text-slate-950 transition dark:text-white"
          aria-label="WalrusForms home"
        >
          <span className="hidden text-lg tracking-tight sm:block">WalForms</span>
          <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-violet-700 md:inline-flex dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
            Sui native
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white/75 p-1 shadow-sm md:flex dark:border-white/10 dark:bg-white/[0.06]"
          aria-label="Main navigation"
        >
          {publicLinks.map(({ href, label, icon: Icon }) => {
            const isRoute = href.startsWith("/");
            const isActive = isRoute && pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "group inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                  isActive
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-violet-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 text-violet-500 transition group-hover:text-violet-700 dark:text-violet-200" />
                {label}
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              href="/forms"
              className={cn(
                "group inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                pathname.startsWith("/forms")
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-violet-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              )}
            >
              <FileText className="h-4 w-4 text-violet-500 dark:text-violet-200" />
              My Forms
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Link
              href="/builder"
              className="hidden h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] transition hover:bg-violet-700 sm:inline-flex dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
            >
              <Plus className="h-4 w-4" />
              New Form
            </Link>
          )}
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <ThemeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
