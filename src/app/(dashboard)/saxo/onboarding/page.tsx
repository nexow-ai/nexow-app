"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  UserPlus,
  FileUp,
  CheckCircle,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STEPS = [
  "Client details",
  "Create signup",
  "Upload documents",
  "Complete application",
  "Status",
];

const DOCUMENT_TYPES = [
  "IdentityCard",
  "ProofOfResidency",
  "ProofOfAddress",
  "SourceOfWealth",
  "Signature",
];

type OnboardingOptions = Record<string, unknown>;
type SignupResult = { ClientId?: string; ClientKey?: string; SignupId?: string };
type StatusResult = { OnboardingState?: string; PendingReasons?: string[] };

export default function SaxoOnboardingPage() {
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    countryOfResidence: "GB",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [signup, setSignup] = useState<SignupResult | null>(null);

  const [uploads, setUploads] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const res = await fetch("/api/saxo/onboarding/options", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setOptionsError(data.detail ?? data.error ?? "Failed to load options");
        setOptions(null);
        return;
      }
      setOptions(data);
    } catch (e) {
      setOptionsError("Could not load options");
      setOptions(null);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const buildSignupBody = useCallback(() => {
    return {
      PersonalInformation: {
        FirstName: form.firstName,
        LastName: form.lastName,
        EmailAddress: form.email,
        DateOfBirth: form.dateOfBirth || undefined,
        CountryOfResidence: form.countryOfResidence || undefined,
      },
      AccountInformation: {},
    };
  }, [form]);

  const handleCreateSignup = useCallback(async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/saxo/onboarding/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSignupBody()),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message ?? data.error ?? "Failed to create signup"
        );
        return;
      }
      setSignup({
        ClientId: data.ClientId,
        ClientKey: data.ClientKey,
        SignupId: data.SignupId,
      });
      setStep(2);
    } catch (e) {
      setCreateError("Failed to create signup");
    } finally {
      setCreateLoading(false);
    }
  }, [buildSignupBody]);

  const handleUpload = useCallback(
    async (documentType: string) => {
      const file = uploads[documentType];
      if (!file || !signup?.SignupId) return;
      setUploading(documentType);
      setUploadErrors((prev) => ({ ...prev, [documentType]: "" }));
      try {
        const formData = new FormData();
        formData.set("documentType", documentType);
        formData.set("file", file);
        const res = await fetch(
          `/api/saxo/onboarding/signups/${encodeURIComponent(signup.SignupId)}/attachments`,
          { method: "POST", body: formData }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUploadErrors((prev) => ({
            ...prev,
            [documentType]: data.detail ?? data.error ?? "Upload failed",
          }));
          return;
        }
        setUploads((prev) => ({ ...prev, [documentType]: null }));
      } finally {
        setUploading(null);
      }
    },
    [signup?.SignupId, uploads]
  );

  const handleComplete = useCallback(async () => {
    if (!signup?.SignupId) return;
    setCompleteLoading(true);
    setCompleteError(null);
    try {
      const res = await fetch(
        `/api/saxo/onboarding/signups/${encodeURIComponent(signup.SignupId)}/complete`,
        { method: "PUT" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCompleteError(
          data.detail ?? data.error ?? "Failed to complete application"
        );
        return;
      }
      setStep(4);
      if (signup.ClientKey) {
        setStatusLoading(true);
        try {
          const statusRes = await fetch(
            `/api/saxo/onboarding/status/${encodeURIComponent(signup.ClientKey)}`
          );
          const statusData = await statusRes.json();
          if (statusRes.ok) setStatus(statusData);
        } finally {
          setStatusLoading(false);
        }
      }
    } catch (e) {
      setCompleteError("Failed to complete application");
    } finally {
      setCompleteLoading(false);
    }
  }, [signup?.SignupId, signup?.ClientKey]);

  const fetchStatus = useCallback(async () => {
    if (!signup?.ClientKey) return;
    setStatusLoading(true);
    try {
      const res = await fetch(
        `/api/saxo/onboarding/status/${encodeURIComponent(signup.ClientKey)}`
      );
      const data = await res.json();
      if (res.ok) setStatus(data);
    } finally {
      setStatusLoading(false);
    }
  }, [signup?.ClientKey]);

  useEffect(() => {
    if (step === 4 && signup?.ClientKey && !status) fetchStatus();
  }, [step, signup?.ClientKey, status, fetchStatus]);

  const countries = (options?.Countries as { Code?: string; Name?: string }[]) ?? [];
  const hasCountryList = countries.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/saxo"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Saxo Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Saxo onboarding
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Complete client signup, upload documents, and submit the application.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              step === i
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Step 0: Client details form */}
      {step === 0 && (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Client details
          </CardTitle>
          <CardContent className="mt-4 space-y-4">
            {optionsLoading ? (
              <div className="flex items-center gap-2 py-6 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading options…
              </div>
            ) : optionsError ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {optionsError}
                <Button variant="ghost" size="sm" onClick={fetchOptions}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="First name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    placeholder="John"
                  />
                  <Input
                    label="Last name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    placeholder="Doe"
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="john@example.com"
                />
                <Input
                  label="Date of birth (YYYY-MM-DD)"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                  }
                  placeholder="1990-01-15"
                />
                {hasCountryList ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-300">
                      Country of residence
                    </label>
                    <select
                      value={form.countryOfResidence}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          countryOfResidence: e.target.value,
                        }))
                      }
                      className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {countries.map((c: { Code?: string; Name?: string }) => (
                        <option key={c.Code} value={c.Code}>
                          {c.Name ?? c.Code}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    label="Country of residence (ISO code)"
                    value={form.countryOfResidence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        countryOfResidence: e.target.value.toUpperCase().slice(0, 2),
                      }))
                    }
                    placeholder="GB"
                  />
                )}
                <Button onClick={() => setStep(1)} className="mt-4">
                  Next: Create signup
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Create signup */}
      {step === 1 && (
        <Card>
          <CardTitle>Create signup</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p className="text-sm text-zinc-400">
              Submit the client details to create a signup. You will then upload
              documents and complete the application.
            </p>
            {createError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {createError}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                disabled={createLoading}
              >
                Back
              </Button>
              <Button onClick={handleCreateSignup} loading={createLoading}>
                Create signup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload documents */}
      {step === 2 && signup && (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-cyan-400" />
            Upload documents
          </CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p className="text-sm text-zinc-400">
              Signup created. ClientKey:{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                {signup.ClientKey}
              </code>{" "}
              — SignupId:{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                {signup.SignupId}
              </code>
              . Upload required documents (PDF or image). Then complete the
              application.
            </p>
            <div className="space-y-4">
              {DOCUMENT_TYPES.map((docType) => (
                <div
                  key={docType}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 sm:flex-row sm:items-end sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-sm font-medium text-zinc-400">
                      {docType.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-zinc-200"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setUploads((u) => ({ ...u, [docType]: f ?? null }));
                        setUploadErrors((e2) => ({ ...e2, [docType]: "" }));
                      }}
                    />
                    {uploadErrors[docType] && (
                      <p className="mt-1 text-xs text-red-400">
                        {uploadErrors[docType]}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!uploads[docType] || uploading === docType}
                    onClick={() => handleUpload(docType)}
                  >
                    {uploading === docType ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next: Complete application</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete application */}
      {step === 3 && signup && (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            Complete application
          </CardTitle>
          <CardContent className="mt-4 space-y-4">
            <p className="text-sm text-zinc-400">
              Submit the application to Saxo. After this, Saxo will process the
              signup and you can check the onboarding status.
            </p>
            {completeError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {completeError}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleComplete} loading={completeLoading}>
                Complete application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Status */}
      {step === 4 && (
        <Card>
          <CardTitle>Onboarding status</CardTitle>
          <CardContent className="mt-4 space-y-4">
            {statusLoading ? (
              <div className="flex items-center gap-2 py-6 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading status…
              </div>
            ) : status ? (
              <>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
                  <p className="text-sm font-medium text-zinc-300">
                    State:{" "}
                    <span className="text-emerald-400">
                      {status.OnboardingState ?? "—"}
                    </span>
                  </p>
                  {status.PendingReasons && status.PendingReasons.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-sm text-amber-400">
                      {status.PendingReasons.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm" onClick={fetchStatus}>
                    Refresh status
                  </Button>
                  <Link href="/saxo">
                    <Button>Back to Saxo Dashboard</Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                No status yet. Complete the application step first, or check back
                later.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
