"use client";
import { useState, useEffect } from "react";
import { Clock, Lock, AlertCircle, XCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { cn } from "../../lib/utils";

// ── Countdown Page ─────────────────────────────────────────────────────────────

interface CountdownPageProps {
  formTitle: string;
  formDescription: string | null;
  opensAt: Date;
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function CountdownPage({ formTitle, formDescription, opensAt }: CountdownPageProps) {
  const { days, hours, minutes, seconds } = useCountdown(opensAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] px-4">
      <div className="mx-auto max-w-md w-full text-center space-y-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-500)]/10">
          <Clock className="h-8 w-8 text-[var(--color-brand-400)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{formTitle}</h1>
          {formDescription && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{formDescription}</p>
          )}
        </div>
        <div>
          <p className="mb-4 text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">
            Opens in
          </p>
          <div className="flex justify-center gap-3">
            {[
              { value: days, label: "Days" },
              { value: hours, label: "Hours" },
              { value: minutes, label: "Min" },
              { value: seconds, label: "Sec" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 min-w-[64px]"
              >
                <span className="text-3xl font-black tabular-nums text-[var(--text-primary)]">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Form Closed Page ───────────────────────────────────────────────────────────

interface FormClosedPageProps {
  formTitle: string;
  closedAt: Date | null;
}

export function FormClosedPage({ formTitle, closedAt }: FormClosedPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] px-4">
      <div className="mx-auto max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-error-bg)]">
          <XCircle className="h-8 w-8 text-[var(--color-error)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{formTitle}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This form is no longer accepting responses.
          </p>
          {closedAt && (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">
              Closed on {closedAt.toLocaleDateString(undefined, { dateStyle: "long" })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Form Full Page ─────────────────────────────────────────────────────────────

interface FormFullPageProps {
  formTitle: string;
}

export function FormFullPage({ formTitle }: FormFullPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] px-4">
      <div className="mx-auto max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-warning-bg)]">
          <AlertCircle className="h-8 w-8 text-[var(--color-warning)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{formTitle}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This form has reached its maximum number of responses.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Password Gate Page ─────────────────────────────────────────────────────────

interface PasswordGatePageProps {
  formTitle: string;
  formDescription: string | null;
  onPasswordSubmit: (password: string) => void;
  error?: string | null;
}

export function PasswordGatePage({
  formTitle,
  formDescription,
  onPasswordSubmit,
  error,
}: PasswordGatePageProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] px-4">
      <div className="mx-auto max-w-sm w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-500)]/10">
            <Lock className="h-8 w-8 text-[var(--color-brand-400)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{formTitle}</h1>
          {formDescription && (
            <p className="text-sm text-[var(--text-secondary)]">{formDescription}</p>
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            This form is password-protected.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onPasswordSubmit(password);
          }}
          className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6"
        >
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            error={error ?? undefined}
          />
          <Button type="submit" variant="primary" className={cn("w-full")} disabled={!password}>
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Not Authorized Page ────────────────────────────────────────────────────────

export function NotAuthorizedPage({ formTitle }: { formTitle: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] px-4">
      <div className="mx-auto max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-error-bg)]">
          <Lock className="h-8 w-8 text-[var(--color-error)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{formTitle}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            You are not authorized to submit this form.
          </p>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            Your wallet address is not on the allowlist.
          </p>
        </div>
      </div>
    </div>
  );
}
