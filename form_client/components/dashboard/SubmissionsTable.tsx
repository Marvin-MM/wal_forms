"use client";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ArrowUpDown, Search, Check } from "lucide-react";
import type { Submission } from "../../shared/types/entities";
import { PriorityBadge } from "../ui/Badge";
import { WalletAddress } from "../common/CopyButton";
import { SkeletonTable } from "../ui/Skeleton";
import { formatRelativeTime } from "../../lib/utils";
import { cn } from "../../lib/utils";

interface SubmissionsTableProps {
  submissions: Submission[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onRowClick: (s: Submission) => void;
  onUpdate: (id: string, updates: { isReviewed?: boolean }) => void;
}

export function SubmissionsTable({
  submissions, isLoading, search, onSearchChange, onRowClick, onUpdate
}: SubmissionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<Submission>[]>(() => [
    {
      id: "reviewed",
      header: "",
      size: 36,
      cell: ({ row }) => (
        <button
          aria-label={row.original.isReviewed ? "Reviewed" : "Mark as reviewed"}
          onClick={(e) => { e.stopPropagation(); onUpdate(row.original.id, { isReviewed: !row.original.isReviewed }); }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            row.original.isReviewed
              ? "border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "border-[var(--border-strong)] text-transparent hover:border-[var(--color-brand-500)]"
          )}
        >
          <Check className="h-3 w-3" />
        </button>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <button className="flex items-center gap-1 text-xs" onClick={() => column.toggleSorting()}>
          Time <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-secondary)]">{formatRelativeTime(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: "submitterWallet",
      header: "Submitter",
      cell: ({ getValue }) => {
        const addr = String(getValue() ?? "Anonymous");
        return addr.startsWith("0x")
          ? <WalletAddress address={addr} />
          : <span className="text-xs text-[var(--text-tertiary)]">Anonymous</span>;
      },
    },
    {
      accessorKey: "isEncrypted",
      header: "Enc",
      size: 50,
      cell: ({ getValue }) => (
        <span className={cn("text-xs font-mono", getValue() ? "text-[var(--color-brand-400)]" : "text-[var(--text-tertiary)]")}>
          {getValue() ? "🔒" : "—"}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ getValue }) => <PriorityBadge priority={getValue() as Submission["priority"]} />,
    },
    {
      accessorKey: "adminNotes",
      header: "Notes",
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-[160px]">
          {String(getValue() ?? "—")}
        </span>
      ),
    },
  ], [onUpdate]);

  const table = useReactTable({
    data: submissions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-2">
        <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search submissions…"
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          aria-label="Search submissions"
        />
      </div>

      {isLoading ? (
        <div className="p-4"><SkeletonTable rows={8} /></div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-center p-8">
          <div>
            <p className="font-medium text-[var(--text-secondary)]">No submissions yet</p>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">Share your form link to start collecting responses.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {table.getHeaderGroups().map((hg) => (
              <div key={hg.id} className="flex items-center gap-4 px-4 py-2">
                {hg.headers.map((header) => (
                  <div
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-xs font-medium text-[var(--text-tertiary)] shrink-0"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Virtualized rows */}
          <div ref={parentRef} className="flex-1 overflow-y-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <div
                    key={row.id}
                    style={{ position: "absolute", top: virtualRow.start, width: "100%", height: virtualRow.size }}
                    className={cn(
                      "flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 cursor-pointer",
                      "hover:bg-[var(--bg-muted)] transition-colors",
                      row.original.isReviewed && "opacity-60"
                    )}
                    onClick={() => onRowClick(row.original)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onRowClick(row.original)}
                    aria-label={`Submission from ${row.original.submitterWallet ?? "Anonymous"}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div key={cell.id} style={{ width: cell.column.getSize() }} className="shrink-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
