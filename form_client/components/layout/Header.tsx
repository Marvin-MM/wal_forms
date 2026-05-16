"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, LayoutDashboard, FileText, Plus } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnectButton } from "./WalletConnectButton";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";

const navLinks = [
  { href: "/forms", label: "My Forms", icon: FileText, requiresAuth: true },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-base)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3 font-bold text-[var(--text-primary)] transition-opacity"
          aria-label="WalrusForms home"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand-400)] to-[var(--color-brand-600)] shadow-sm shadow-[var(--color-brand-500)]/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <Layers className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg tracking-tight hidden sm:block">WalrusForms</span>
        </Link>

        {/* Nav & Actions Container */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4" aria-label="Main navigation">
            {navLinks.map(({ href, label, icon: Icon, requiresAuth }) => {
              if (requiresAuth && !isAuthenticated) return null;
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-default)]"
                      : "text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-[var(--color-brand-500)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]")} />
                  <span className="hidden sm:inline-block">{label}</span>
                </Link>
              );
            })}

            {isAuthenticated && (
              <Link
                href="/builder"
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-all duration-300",
                  "bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] shadow-md shadow-[var(--color-brand-500)]/25",
                  "hover:shadow-lg hover:shadow-[var(--color-brand-500)]/40 hover:-translate-y-0.5"
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline-block">New Form</span>
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 border-l border-[var(--border-default)] pl-2 sm:pl-4">
            <ThemeToggle />
            <WalletConnectButton />
          </div>
        </div>

      </div>
    </header>
  );
}
