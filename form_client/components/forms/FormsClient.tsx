"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, FormInput } from "lucide-react";
import { listForms, deleteForm } from "../../lib/api/forms";
import type { Form } from "../../shared/types/entities";
import type { PaginatedResponse } from "../../shared/types/api";
import { queryKeys } from "../../lib/query-keys";
import { AuthGuard } from "../layout/AuthGuard";
import { FormCard } from "./FormCard";
import { EmptyState } from "../common/EmptyState";
import { SkeletonCard } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { toast } from "sonner";
import Link from "next/link";

interface FormsClientProps {
  initialData: PaginatedResponse<Form> | null;
}

export function FormsClient({ initialData }: FormsClientProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.forms.list(1, 20),
    queryFn: () => listForms({ page: 1, pageSize: 20 }),
    initialData: initialData ?? undefined,
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: (formId: string) => deleteForm(formId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.forms.all() });
      toast.success("Form deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">My Forms</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {data?.total ?? 0} form{(data?.total ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/builder">
            <Button variant="primary" size="md">
              <Plus className="h-4 w-4" />
              New form
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <EmptyState
            icon={FormInput}
            title="No forms yet"
            description="Create your first form and share it with the world. Every submission is on-chain and verifiable."
            action={{ label: "Create your first form", onClick: () => router.push("/builder") }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.items ?? []).map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onDelete={() => deleteMutate(form.id)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
