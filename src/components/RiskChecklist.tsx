"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Table,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { ScanFinding } from "./ScanButton";

type RiskChecklistProps = {
  scanId: string;
  findings: ScanFinding[];
  canRedact: boolean;
  onRedactComplete: (fileId: string) => void;
  onRequestWriteAccess: () => void;
};

const RISK_COLORS = {
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
  low: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-800" },
};

export default function RiskChecklist({
  scanId,
  findings,
  canRedact,
  onRedactComplete,
  onRequestWriteAccess,
}: RiskChecklistProps) {
  const [redacting, setRedacting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleRedact(finding: ScanFinding) {
    if (!canRedact) {
      onRequestWriteAccess();
      return;
    }

    setRedacting((prev) => ({ ...prev, [finding.file_id]: true }));
    setErrors((prev) => ({ ...prev, [finding.file_id]: "" }));

    try {
      const res = await fetch("/api/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_id: scanId,
          file_id: finding.file_id,
          file_type: finding.file_type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redaction failed");
      if (!data.success) throw new Error(data.message || "Redaction incomplete");

      onRedactComplete(finding.file_id);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [finding.file_id]: err instanceof Error ? err.message : "Redaction failed",
      }));
    } finally {
      setRedacting((prev) => ({ ...prev, [finding.file_id]: false }));
    }
  }

  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-6">
        <ShieldCheck className="h-8 w-8 text-green-600" />
        <div>
          <h3 className="font-semibold text-green-900">All Clear!</h3>
          <p className="text-sm text-green-700">No PII detected in your Drive files.</p>
        </div>
      </div>
    );
  }

  // Sort by risk level: high first
  const sorted = [...findings].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.risk_level] - order[b.risk_level];
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700">
        <ShieldAlert className="h-5 w-5 text-red-500" />
        <span className="font-semibold">
          {findings.length} file{findings.length !== 1 ? "s" : ""} with PII detected
        </span>
      </div>

      {!canRedact && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            To auto-fix issues, you need to{" "}
            <button
              onClick={onRequestWriteAccess}
              className="font-semibold underline hover:no-underline"
            >
              enable write access
            </button>
            {" "}to your Google Docs and Sheets.
          </p>
        </div>
      )}

      {sorted.map((finding) => {
        const colors = RISK_COLORS[finding.risk_level];
        const isRedacting = redacting[finding.file_id];
        const error = errors[finding.file_id];

        return (
          <div
            key={finding.file_id}
            className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {finding.redacted ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-5 w-5 ${colors.text}`} />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    {finding.file_type === "doc" ? (
                      <FileText className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Table className="h-4 w-4 text-green-500" />
                    )}
                    <span className="font-medium text-slate-900">{finding.file_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}>
                      {finding.risk_level}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {finding.pii_types.map((type) => (
                      <span
                        key={type}
                        className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  {finding.pii_details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {finding.pii_details.slice(0, 5).map((detail, i) => (
                        <li key={i} className="text-xs text-slate-600">
                          <span className="font-medium">{detail.type}</span>: {detail.value_preview}{" "}
                          <span className="text-slate-400">({detail.location})</span>
                        </li>
                      ))}
                      {finding.pii_details.length > 5 && (
                        <li className="text-xs text-slate-400">
                          +{finding.pii_details.length - 5} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {!finding.redacted && (
                <button
                  onClick={() => handleRedact(finding)}
                  disabled={isRedacting}
                  className="ml-4 shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  {isRedacting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Fixing...
                    </span>
                  ) : (
                    "Auto-Fix"
                  )}
                </button>
              )}

              {finding.redacted && (
                <span className="ml-4 flex items-center gap-1 text-sm font-medium text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  Fixed
                </span>
              )}
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
