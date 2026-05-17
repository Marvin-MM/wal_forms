"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnectButton } from "./WalletConnectButton";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

const publicLinks = [
  { href: "#features-heading", label: "Product" },
  { href: "#how-it-works", label: "Why us" },
  { href: "/verify/0x0", label: "Verify" },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Smart hide on scroll
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    
    if (latest <= 50) {
      setIsAtTop(true);
      setHidden(false);
    } else {
      setIsAtTop(false);
      if (latest > previous && latest > 150) {
        setHidden(true); // scrolling down -> hide
      } else if (latest < previous) {
        setHidden(false); // scrolling up -> show
      }
    }
  });

  // Pages where header should be standard sticky and not floating/hiding
  const isFixedPage = pathname.startsWith("/builder") || pathname.startsWith("/f/");

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const headerContent = (
    <div className="mx-auto flex h-16 sm:h-20 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      
      {/* Left: Logo */}
      <Link
        href="/"
        className="group flex items-center transition hover:opacity-80"
        aria-label="WalrusForms home"
      >
        {/* Mobile Icon (Hidden on sm and larger) */}
        <img 
          src="/logo-icon.png" 
          alt="WalrusForms Icon" 
          className="sm:hidden w-16 items-start justify-start dark:bg-white dark:p-1.5 dark:rounded-xl" 
        />
        
        {/* Desktop Logo (Visible on sm and larger) */}
        <img 
          src="/wal-logo.png" 
          alt="WalrusForms Logo" 
          className="hidden sm:flex h-8 w-auto object-contain dark:bg-white dark:p-1 dark:rounded-lg" 
        />
      </Link>

      {/* Center: Navigation (Desktop) */}
      <nav
        className="hidden items-center gap-8 md:flex"
        aria-label="Main navigation"
      >
        {publicLinks.map(({ href, label }) => {
          const isRoute = href.startsWith("/");
          const isActive = isRoute && pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "text-sm font-semibold transition-colors",
                isActive
                  ? "text-[var(--color-brand-500)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {label}
            </Link>
          );
        })}

        {isAuthenticated && (
          <Link
            href="/forms"
            className={cn(
              "text-sm font-semibold transition-colors",
              pathname.startsWith("/forms")
                ? "text-[var(--color-brand-500)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            My Forms
          </Link>
        )}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <Link
            href="/builder"
            className="hidden h-10 items-center gap-2 rounded-full bg-[var(--bg-muted)] px-4 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] sm:inline-flex"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">New Form</span>
          </Link>
        )}
        <ThemeToggle className="hidden sm:flex" />
        <div className="hidden sm:block w-px h-6 bg-[var(--border-default)]" />
        <WalletConnectButton />
        
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] md:hidden transition-colors"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <motion.header
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 }
      }}
      animate={isFixedPage ? "visible" : hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={cn(
        "sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/80 backdrop-blur-xl transition-all duration-300",
        !isAtTop && "shadow-sm bg-[var(--bg-base)]/90"
      )}
    >
      {headerContent}
      
      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col gap-4 p-4">
              {publicLinks.map(({ href, label }) => {
                const isRoute = href.startsWith("/");
                const isActive = isRoute && pathname === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={cn(
                      "block text-base font-semibold transition-colors",
                      isActive
                        ? "text-[var(--color-brand-500)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
              {isAuthenticated && (
                <>
                  <Link
                    href="/forms"
                    className={cn(
                      "block text-base font-semibold transition-colors",
                      pathname.startsWith("/forms")
                        ? "text-[var(--color-brand-500)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    My Forms
                  </Link>
                  <Link
                    href="/builder"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] text-sm font-bold text-white transition hover:bg-[var(--color-brand-700)]"
                  >
                    <Plus className="h-4 w-4" />
                    New Form
                  </Link>
                </>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">Theme</span>
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
