"use client";

import { ReactorForm, type ReactorFormPayload } from "@/components/reactor/reactor-form";
import { ReactorInsights } from "@/components/reactor/reactor-insights";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useReactorConfig } from "@/hooks/use-reactor";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";

interface ReactorDetailPageProps {
  params: Promise<{ id: string }>;
}

type Tab = "insights" | "edit";

export default function ReactorDetailPage({ params }: ReactorDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { config, loading, error: fetchError, refetch } = useReactorConfig(id);

  const tabParam = searchParams.get("tab");
  const activeTab: Tab = tabParam === "edit" ? "edit" : "insights";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [snapshotData, setSnapshotData] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState("");

  function setTab(tab: Tab) {
    const url = tab === "edit" ? `/reactor/${id}?tab=edit` : `/reactor/${id}`;
    router.replace(url);
  }

  async function handleSave(payload: ReactorFormPayload) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/reactor/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update configuration");
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!config) return;
    setActionLoading("toggle");
    try {
      await fetch(`/api/reactor/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !config.is_active }),
      });
      await refetch();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    await fetch(`/api/reactor/${id}`, { method: "DELETE" });
    setDeleteModalOpen(false);
    router.push("/reactor");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (fetchError || !config) {
    return (
      <div className="py-32 text-center text-zinc-500">
        {fetchError || "Config not found."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/reactor"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to configs
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {config.instrument.replace("_", "/")}
            </h1>
            <Badge variant={config.is_active ? "success" : "default"}>
              {config.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            loading={actionLoading === "delete"}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>

        {/* Tab Toggle */}
        <div className="mt-4 flex gap-1 rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-1 w-fit">
          <button
            onClick={() => setTab("edit")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              activeTab === "edit"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setTab("insights")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
              activeTab === "insights"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            Insights
          </button>
        </div>
      </div>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete config"
        message="Are you sure you want to delete this reactor configuration? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading === "delete"}
      />

      {/* Tab Content */}
      {activeTab === "edit" ? (
        <div className="space-y-8">
          <ReactorForm
            initialConfig={config}
            onSave={handleSave}
            saving={saving}
            error={error}
            onCancel={() => router.push("/reactor")}
          />

          {/* Test Snapshot */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              loading={snapshotLoading}
              onClick={async () => {
                setSnapshotLoading(true);
                setSnapshotError("");
                setSnapshotData(null);
                try {
                  const res = await fetch(`/api/snapshot?instrument=${config.instrument}`);
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || "Snapshot unavailable");
                  }
                  const data = await res.json();
                  setSnapshotData(JSON.stringify(data, null, 2));
                } catch (err) {
                  setSnapshotError(err instanceof Error ? err.message : "Failed to fetch snapshot");
                } finally {
                  setSnapshotLoading(false);
                }
              }}
            >
              Test Snapshot
            </Button>
          </div>

          {snapshotError && (
            <p className="text-sm text-red-400">{snapshotError}</p>
          )}
          {snapshotData && (
            <Card>
              <CardContent className="py-4">
                <pre className="max-h-[600px] overflow-auto text-xs leading-relaxed text-zinc-400">
                  {snapshotData}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <ReactorInsights
          config={config}
          onToggleActive={handleToggleActive}
          toggleLoading={actionLoading === "toggle"}
        />
      )}
    </div>
  );
}
