"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Form, Submission } from "../../shared/types/entities";
import type { PaginatedResponse } from "../../shared/types/api";
import { listSubmissions, updateSubmission } from "../../lib/api/submissions";
import { triggerAnalysis, getAnalysis } from "../../lib/api/analysis";
import { triggerExport } from "../../lib/api/export";
import { queryKeys } from "../../lib/query-keys";
import { useWebSocket, WsEventType } from "../../hooks/useWebSocket";
import { AuthGuard } from "../layout/AuthGuard";
import { SubmissionsTable } from "./SubmissionsTable";
import { SubmissionDetailDrawer } from "./SubmissionDetailDrawer";
import { DashboardStatsBar } from "./DashboardStatsBar";
import { AIAnalysisPanel } from "./AIAnalysisPanel";

interface DashboardClientProps {
  form: Form;
  initialSubmissions: PaginatedResponse<Submission> | null;
}

export function DashboardClient({ form, initialSubmissions }: DashboardClientProps) {
  const qc = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [liveSubmissions, setLiveSubmissions] = useState<Submission[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.submissions.list(form.id, { page: 1, pageSize: 25, search }),
    queryFn: () => listSubmissions(form.id, { page: 1, pageSize: 25, search }),
    initialData: initialSubmissions ?? undefined,
  });

  // WebSocket for real-time updates
  const { status: wsStatus } = useWebSocket(form.id, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEvent: useCallback((event: any) => {
      switch (event.type) {
        case WsEventType.NEW_SUBMISSION:
          setLiveSubmissions((prev) => [event.payload as Submission, ...prev]);
          toast.info("New submission received", { duration: 3000 });
          void qc.invalidateQueries({ queryKey: queryKeys.submissions.all(form.id) });
          break;
        case WsEventType.ANALYSIS_COMPLETE:
          toast.success("AI analysis complete!");
          void qc.invalidateQueries({ queryKey: queryKeys.analysis.latest(form.id) });
          setAnalysisOpen(true);
          break;
        case WsEventType.EXPORT_COMPLETE: {
          const payload = event.payload as { blobId: string };
          toast.success("Export ready — downloading…");
          if (payload.blobId) {
            const aggUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_ENDPOINT ?? "";
            window.open(`${aggUrl}/v1/blobs/${payload.blobId}`, "_blank");
          }
          break;
        }
        default: break;
      }
    }, [form.id, qc]),
  });

  const { mutate: updateMutate } = useMutation({
    mutationFn: ({ submissionId, updates }: { submissionId: string; updates: Parameters<typeof updateSubmission>[2] }) =>
      updateSubmission(form.id, submissionId, updates),
    onMutate: async ({ submissionId, updates }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: queryKeys.submissions.all(form.id) });
      const prev = qc.getQueryData<PaginatedResponse<Submission>>(
        queryKeys.submissions.list(form.id, { page: 1, pageSize: 25, search })
      );
      if (prev) {
        qc.setQueryData(queryKeys.submissions.list(form.id, { page: 1, pageSize: 25, search }), {
          ...prev,
          items: prev.items.map((s) => s.id === submissionId ? { ...s, ...updates } : s),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.submissions.list(form.id, { page: 1, pageSize: 25, search }), ctx.prev);
      }
      toast.error("Update failed");
    },
  });

  const allSubmissions = [...liveSubmissions, ...(data?.items ?? [])].filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
  );

  return (
    <AuthGuard>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Stats bar */}
        <DashboardStatsBar
          form={form}
          total={data?.total ?? 0}
          wsStatus={wsStatus}
          onAnalyze={() => { void triggerAnalysis(form.id).then(() => toast.info("Analysis started…")); }}
          onExport={() => { void triggerExport(form.id).then(() => toast.info("Export started…")); }}
          onToggleAnalysis={() => setAnalysisOpen((v) => !v)}
        />

        {/* AI Analysis panel */}
        {analysisOpen && <AIAnalysisPanel formId={form.id} onClose={() => setAnalysisOpen(false)} />}

        {/* Submissions table */}
        <div className="flex-1 overflow-hidden">
          <SubmissionsTable
            submissions={allSubmissions}
            isLoading={isLoading}
            search={search}
            onSearchChange={setSearch}
            onRowClick={setSelectedSubmission}
            onUpdate={(submissionId, updates) => updateMutate({ submissionId, updates })}
          />
        </div>
      </div>

      {/* Detail drawer */}
      <SubmissionDetailDrawer
        submission={selectedSubmission}
        form={form}
        onClose={() => setSelectedSubmission(null)}
        onUpdate={(updates) => {
          if (selectedSubmission) {
            updateMutate({ submissionId: selectedSubmission.id, updates });
            setSelectedSubmission((s) => s ? { ...s, ...updates } : s);
          }
        }}
      />
    </AuthGuard>
  );
}
