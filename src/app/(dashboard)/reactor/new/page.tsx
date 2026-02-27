"use client";

export const dynamic = "force-dynamic";

import { ReactorForm, type ReactorFormPayload } from "@/components/reactor/reactor-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewReactorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (config: ReactorFormPayload) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/reactor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create configuration");
      }
      router.push("/reactor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/reactor"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
        <h1 className="text-2xl font-bold">New Reactor Config</h1>
        <p className="text-sm text-zinc-500">
          Configure your automated trading parameters
        </p>
      </div>

      <ReactorForm
        onSave={handleSave}
        saving={saving}
        error={error}
        onCancel={() => router.push("/reactor")}
      />
    </div>
  );
}
