"use client";
import { BarChart3, Bell, Download, Wifi, WifiOff, Brain } from "lucide-react";
import type { Form } from "../../shared/types/entities";
import type { WsStatus } from "../../hooks/useWebSocket";
import { Button } from "../ui/Button";
import Link from "next/link";
import { cn } from "../../lib/utils";

interface DashboardStatsBarProps {
  form: Form;
  total: number;
  wsStatus: WsStatus;
  onAnalyze: () => void;
  onExport: () => void;
  onExportVisible: () => void;
  onToggleAnalysis: () => void;
  onToggleAnalytics: () => void;
  onToggleNotifications: () => void;
}

export function DashboardStatsBar({
  form,
  total,
  wsStatus,
  onAnalyze,
  onExport,
  onExportVisible,
  onToggleAnalysis,
  onToggleAnalytics,
  onToggleNotifications,
}: DashboardStatsBarProps) {
  const isConnected = wsStatus === "authenticated";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{form.title}</h1>
          <p className="text-xs text-[var(--text-tertiary)]">{total} submission{total !== 1 ? "s" : ""}</p>
        </div>
        <div className={cn("flex items-center gap-1.5 text-xs", isConnected ? "text-[var(--color-success)]" : "text-[var(--text-tertiary)]")}>
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Live" : wsStatus}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/dashboard/${form.id}/admins`}>
          <Button variant="ghost" size="sm">Admins</Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={onToggleAnalysis}>
          <Brain className="h-4 w-4" />
          AI
        </Button>
        <Button variant="ghost" size="sm" onClick={onAnalyze}>
          <Brain className="h-4 w-4" />
          Run AI
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleAnalytics}>
          <BarChart3 className="h-4 w-4" />
          Metrics
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleNotifications}>
          <Bell className="h-4 w-4" />
          Alerts
        </Button>
        <Button variant="ghost" size="sm" onClick={onExport}>
          <Download className="h-4 w-4" />
          Full export
        </Button>
        <Button variant="ghost" size="sm" onClick={onExportVisible}>
          <Download className="h-4 w-4" />
          Visible CSV
        </Button>
      </div>
    </div>
  );
}
