"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Client-side auth guard for fully-client-rendered protected surfaces.
 * Server-side redirect is handled by middleware.ts for SSR routes.
 */
export function AuthGuard({ children, fallbackPath = "/" }: AuthGuardProps) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace(`${fallbackPath}?auth=required`);
    }
  }, [isAuthenticated, isInitializing, router, fallbackPath]);

  if (isInitializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--color-brand-500)]" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
