"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit2, LayoutDashboard, Link2, Trash2, Lock, Unlock, Clock } from "lucide-react";
import type { Form } from "../../shared/types/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/Dialog";
import { CopyButton } from "../common/CopyButton";
import { formatRelativeTime } from "../../lib/utils";

interface FormCardProps {
  form: Form;
  onDelete: () => void;
  isDeleting: boolean;
}

export function FormCard({ form, onDelete, isDeleting }: FormCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/f/${form.id}`;

  return (
    <>
      <Card hover className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 flex-1">{form.title}</CardTitle>
            {form.isPrivate ? (
              <Badge variant="info"><Lock className="mr-1 h-3 w-3" />Private</Badge>
            ) : (
              <Badge variant="default"><Unlock className="mr-1 h-3 w-3" />Public</Badge>
            )}
          </div>
          {form.description && (
            <CardDescription className="line-clamp-2">{form.description}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
            <span>{form.schemaVersion} version{form.schemaVersion !== 1 ? "s" : ""}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(form.createdAt)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex-wrap gap-2">
          <CopyButton value={shareUrl} label="Copy link" size="sm" />
          <Link href={`/builder/${form.id}`}>
            <Button variant="ghost" size="sm">
              <Edit2 className="h-3.5 w-3.5" />Edit
            </Button>
          </Link>
          <Link href={`/dashboard/${form.id}`}>
            <Button variant="ghost" size="sm">
              <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        title="Delete form?"
        description={`"${form.title}" and all its submissions will be permanently removed from the platform. On-chain records remain.`}
        confirmLabel="Delete form"
        loading={isDeleting}
      />
    </>
  );
}
