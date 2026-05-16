"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Brain, RefreshCw, AlertCircle } from "lucide-react";
import { getAnalysis, triggerAnalysis } from "../../lib/api/analysis";
import { queryKeys } from "../../lib/query-keys";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SkeletonCard } from "../ui/Skeleton";
import { toast } from "sonner";

interface AIAnalysisPanelProps {
  formId: string;
  onClose: () => void;
}

export function AIAnalysisPanel({ formId, onClose }: AIAnalysisPanelProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.analysis.latest(formId),
    queryFn: () => getAnalysis(formId),
    refetchInterval: (query) =>
      query.state.data?.jobStatus === "running" ? 5000 : false,
  });

  const { mutate: reAnalyze, isPending } = useMutation({
    mutationFn: () => triggerAnalysis(formId),
    onSuccess: () => {
      toast.info("Re-analysis started…");
      void qc.invalidateQueries({ queryKey: queryKeys.analysis.latest(formId) });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  return (
    <div className="shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[var(--color-brand-400)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Analysis</h2>
            {data?.jobStatus && (
              <Badge variant={data.jobStatus === "completed" ? "success" : data.jobStatus === "failed" ? "error" : "warning"}>
                {data.jobStatus}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => reAnalyze()} loading={isPending}>
              <RefreshCw className="h-3.5 w-3.5" />
              Re-analyze
            </Button>
            <button onClick={onClose} className="rounded p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] transition-colors" aria-label="Close analysis">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading && <SkeletonCard />}

        {data?.jobStatus === "running" && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-info-bg)] px-3 py-2 text-sm text-[var(--color-info)]">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analysis in progress… results will appear automatically when done.
          </div>
        )}

        {data?.jobStatus === "failed" && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-error-bg)] px-3 py-2 text-sm text-[var(--color-error)]">
            <AlertCircle className="h-4 w-4" />
            {data.error ?? "Analysis failed. Try again."}
          </div>
        )}

        {data?.result && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Sentiment */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Sentiment</p>
              <div className="text-sm text-[var(--text-primary)]">
                {typeof data.result.sentimentSummary === 'object' && data.result.sentimentSummary !== null ? (
                  <>
                    <p className="mb-1 font-medium capitalize">{data.result.sentimentSummary.overall}</p>
                    <div className="flex gap-3 text-xs">
                      <span className="text-[var(--color-success)]">Positive: {data.result.sentimentSummary.positive}</span>
                      <span className="text-[var(--text-secondary)]">Neutral: {data.result.sentimentSummary.neutral}</span>
                      <span className="text-[var(--color-error)]">Negative: {data.result.sentimentSummary.negative}</span>
                    </div>
                  </>
                ) : (
                  data.result.sentimentSummary
                )}
              </div>
            </div>

            {/* Themes */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Theme Clusters</p>
              <div className="space-y-1">
                {data.result.themeClusters?.slice(0, 5).map((t) => (
                  <div key={t.theme} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)]">{t.theme}</span>
                    <Badge variant="default">{t.count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Recommendations</p>
              <ul className="space-y-1">
                {data.result.priorityRecommendations?.slice(0, 4).map((r, i: number) => {
                  if (typeof r === 'object' && r !== null) {
                    return (
                      <li key={i} className="text-xs text-[var(--text-secondary)] mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{r.suggestedPriority ? `[${r.suggestedPriority}] ` : ''}</span>
                        {r.reason || JSON.stringify(r)}
                      </li>
                    );
                  }
                  return (
                    <li key={i} className="text-xs text-[var(--text-secondary)]">• {r}</li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
