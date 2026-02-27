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
  ChevronDown,
  ChevronRight,
  Copy,
  User,
  Mail,
  ThumbsUp,
  ThumbsDown,
  X,
  Undo2,
} from "lucide-react";
import type { ScanFinding, SenderRiskInfo, FeedbackAction, FeedbackScope } from "@/types/scan";
import SenderRiskPanel from "./SenderRisk";

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

const DISMISS_REASONS = [
  { value: "false_positive", label: "False positive - not real PII" },
  { value: "public_info", label: "Public/non-sensitive information" },
  { value: "test_data", label: "Test/sample data" },
  { value: "already_handled", label: "Already handled elsewhere" },
  { value: "other", label: "Other" },
];

// --- Feedback state per finding detail ---
type FeedbackState = {
  action: FeedbackAction;
  scope: FeedbackScope;
  feedbackId?: string;
};

// --- Grouping / deduplication logic ---

type MergedDetail = {
  type: string;
  value_preview: string;
  location: string;
  file_name: string;
};

type FindingGroup = {
  key: string;
  canonical_name: string;
  risk_level: "high" | "medium" | "low";
  file_type: "doc" | "sheet";
  entries: ScanFinding[];
  merged_pii_types: string[];
  merged_pii_details: MergedDetail[];
  all_redacted: boolean;
  owner_email?: string;
  owner_name?: string;
  sender_risk?: SenderRiskInfo;
};

function groupFindings(findings: ScanFinding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();

  for (const finding of findings) {
    const normalizedName = finding.file_name.trim();
    const key = `${normalizedName}::${finding.risk_level}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        canonical_name: finding.file_name,
        risk_level: finding.risk_level,
        file_type: finding.file_type,
        entries: [],
        merged_pii_types: [],
        merged_pii_details: [],
        all_redacted: true,
        owner_email: finding.owner_email,
        owner_name: finding.owner_name,
        sender_risk: finding.sender_risk,
      });
    }

    const group = groups.get(key)!;
    group.entries.push(finding);

    if (!finding.redacted) group.all_redacted = false;

    for (const t of finding.pii_types) {
      if (!group.merged_pii_types.includes(t)) {
        group.merged_pii_types.push(t);
      }
    }

    for (const d of finding.pii_details) {
      const alreadyExists = group.merged_pii_details.some(
        (existing) =>
          existing.type === d.type &&
          existing.value_preview === d.value_preview &&
          existing.location === d.location
      );
      if (!alreadyExists) {
        group.merged_pii_details.push({
          ...d,
          file_name: finding.file_name,
        });
      }
    }

    if (!group.sender_risk && finding.sender_risk) {
      group.sender_risk = finding.sender_risk;
    }
    if (!group.owner_email && finding.owner_email) {
      group.owner_email = finding.owner_email;
      group.owner_name = finding.owner_name;
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  return [...groups.values()].sort((a, b) => order[a.risk_level] - order[b.risk_level]);
}

function groupDetailsByType(details: MergedDetail[]) {
  const byType = new Map<string, MergedDetail[]>();
  for (const d of details) {
    if (!byType.has(d.type)) byType.set(d.type, []);
    byType.get(d.type)!.push(d);
  }
  return byType;
}

// Unique key for a finding detail
function detailKey(detail: MergedDetail): string {
  return `${detail.type}::${detail.value_preview}::${detail.location}`;
}

// --- Dismiss Modal ---

function DismissModal({
  detail,
  onSubmit,
  onClose,
}: {
  detail: MergedDetail;
  onSubmit: (reason: string, notes: string, scope: FeedbackScope) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(DISMISS_REASONS[0].value);
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<FeedbackScope>("this");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(reason, notes, scope);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Dismiss Finding</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* What's being dismissed */}
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Finding</p>
          <p className="text-sm font-medium text-slate-800">
            {detail.type}: <span className="font-mono">{detail.value_preview}</span>
          </p>
          <p className="text-xs text-slate-400">{detail.location}</p>
        </div>

        {/* Reason */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {DISMISS_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add context about why this isn't PII..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* Scope */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-700 mb-2">Apply to</label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="this"
                checked={scope === "this"}
                onChange={() => setScope("this")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm text-slate-700">This match only</p>
                <p className="text-xs text-slate-400">Dismiss just this specific value</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="type"
                checked={scope === "type"}
                onChange={() => setScope("type")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm text-slate-700">All &ldquo;{detail.type}&rdquo; in this file</p>
                <p className="text-xs text-slate-400">Dismiss this PII type for this file</p>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="global"
                checked={scope === "global"}
                onChange={() => setScope("global")}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm text-slate-700">All &ldquo;{detail.type}&rdquo; everywhere</p>
                <p className="text-xs text-slate-400">Suppress this PII type in future scans</p>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Dismiss Finding"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

export default function RiskChecklist({
  scanId,
  findings,
  canRedact,
  onRedactComplete,
  onRequestWriteAccess,
}: RiskChecklistProps) {
  const [redacting, setRedacting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Feedback state: keyed by detailKey
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackState>>({});
  const [dismissTarget, setDismissTarget] = useState<MergedDetail | null>(null);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleType(groupKey: string, type: string) {
    const compositeKey = `${groupKey}::${type}`;
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(compositeKey) ? next.delete(compositeKey) : next.add(compositeKey);
      return next;
    });
  }

  async function handleConfirm(detail: MergedDetail, groupKey: string) {
    const key = detailKey(detail);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_type: detail.type,
          raw_preview: detail.value_preview,
          action: "confirm",
          apply_scope: "this",
          scan_id: scanId,
          file_name: detail.file_name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMap((prev) => ({
          ...prev,
          [key]: { action: "confirm", scope: "this", feedbackId: data.feedback?.id },
        }));
      }
    } catch {
      // Silently fail — non-critical
    }
  }

  function openDismissModal(detail: MergedDetail) {
    setDismissTarget(detail);
  }

  async function handleDismissSubmit(reason: string, notes: string, scope: FeedbackScope) {
    if (!dismissTarget) return;
    const key = detailKey(dismissTarget);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_type: dismissTarget.type,
          raw_preview: dismissTarget.value_preview,
          action: "dismiss",
          reason,
          notes,
          apply_scope: scope,
          scan_id: scanId,
          file_name: dismissTarget.file_name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMap((prev) => ({
          ...prev,
          [key]: { action: "dismiss", scope, feedbackId: data.feedback?.id },
        }));
      }
    } catch {
      // Silently fail
    }
    setDismissTarget(null);
  }

  async function handleUndoFeedback(detail: MergedDetail) {
    const key = detailKey(detail);
    const fb = feedbackMap[key];
    if (!fb?.feedbackId) {
      setFeedbackMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    try {
      await fetch(`/api/feedback?id=${fb.feedbackId}`, { method: "DELETE" });
    } catch {
      // continue anyway
    }
    setFeedbackMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleRedactGroup(group: FindingGroup) {
    if (!canRedact) {
      onRequestWriteAccess();
      return;
    }

    for (const entry of group.entries) {
      if (entry.redacted) continue;

      setRedacting((prev) => ({ ...prev, [entry.file_id]: true }));
      setErrors((prev) => ({ ...prev, [entry.file_id]: "" }));

      try {
        const res = await fetch("/api/redact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scan_id: scanId,
            file_id: entry.file_id,
            file_type: entry.file_type,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Redaction failed");
        if (!data.success) throw new Error(data.message || "Redaction incomplete");

        onRedactComplete(entry.file_id);
      } catch (err) {
        setErrors((prev) => ({
          ...prev,
          [entry.file_id]: err instanceof Error ? err.message : "Redaction failed",
        }));
      } finally {
        setRedacting((prev) => ({ ...prev, [entry.file_id]: false }));
      }
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

  const groups = groupFindings(findings);
  const uniqueFiles = new Set(findings.map((f) => f.file_id)).size;

  // Count dismissed findings
  const dismissedCount = Object.values(feedbackMap).filter((f) => f.action === "dismiss").length;

  return (
    <div className="space-y-3">
      {/* Dismiss modal */}
      {dismissTarget && (
        <DismissModal
          detail={dismissTarget}
          onSubmit={handleDismissSubmit}
          onClose={() => setDismissTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <span className="font-semibold">
            {uniqueFiles} file{uniqueFiles !== 1 ? "s" : ""} with PII detected
            {groups.length < findings.length && (
              <span className="ml-1 text-sm font-normal text-slate-500">
                ({findings.length} entries, {groups.length} groups)
              </span>
            )}
          </span>
        </div>
        {dismissedCount > 0 && (
          <span className="text-xs text-slate-400">
            {dismissedCount} dismissed
          </span>
        )}
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

      {groups.map((group) => {
        const colors = RISK_COLORS[group.risk_level];
        const isExpanded = expandedGroups.has(group.key);
        const isGroupRedacting = group.entries.some((e) => redacting[e.file_id]);
        const groupErrors = group.entries
          .map((e) => errors[e.file_id])
          .filter(Boolean);
        const detailsByType = groupDetailsByType(group.merged_pii_details);
        const duplicateCount = group.entries.length;

        // Check if all details in this group are dismissed
        const allDismissed = group.merged_pii_details.every(
          (d) => feedbackMap[detailKey(d)]?.action === "dismiss"
        );

        return (
          <div
            key={group.key}
            className={`rounded-xl border ${colors.border} ${
              allDismissed ? "bg-slate-50 opacity-60" : colors.bg
            } overflow-hidden transition-opacity`}
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex w-full items-start justify-between p-4 text-left hover:brightness-95 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {group.all_redacted || allDismissed ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${colors.text}`} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.file_type === "doc" ? (
                      <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    ) : (
                      <Table className="h-4 w-4 shrink-0 text-green-500" />
                    )}
                    <span className={`font-medium truncate ${allDismissed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                      {group.canonical_name}
                    </span>
                    {duplicateCount > 1 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        <Copy className="h-3 w-3" />
                        {duplicateCount}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}>
                      {group.risk_level}
                    </span>
                    {allDismissed && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                        dismissed
                      </span>
                    )}
                  </div>

                  {/* PII type badges */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {group.merged_pii_types.map((type) => (
                      <span
                        key={type}
                        className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700"
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  {/* Owner line */}
                  {group.owner_email && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="h-3 w-3" />
                      <span>
                        Owner: <span className="font-medium text-slate-600">{group.owner_name || group.owner_email}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="text-xs text-slate-400">
                  {group.merged_pii_details.length} finding{group.merged_pii_details.length !== 1 ? "s" : ""}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-200/50 px-4 pb-4">
                <div className="flex gap-4 mt-3">
                  {/* Left: PII details grouped by type */}
                  <div className="flex-1 min-w-0">
                    {[...detailsByType.entries()].map(([type, details]) => {
                      const typeKey = `${group.key}::${type}`;
                      const isTypeExpanded = expandedTypes.has(typeKey);
                      const previewCount = 3;

                      return (
                        <div key={type} className="mb-3 last:mb-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleType(group.key, type);
                            }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                          >
                            {isTypeExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <Mail className="h-3 w-3 text-slate-400" />
                            {type}
                            <span className="font-normal text-slate-400">
                              ({details.length})
                            </span>
                          </button>

                          <ul className="ml-5 mt-1 space-y-1">
                            {(isTypeExpanded ? details : details.slice(0, previewCount)).map(
                              (detail, i) => {
                                const key = detailKey(detail);
                                const fb = feedbackMap[key];
                                const isDismissed = fb?.action === "dismiss";
                                const isConfirmed = fb?.action === "confirm";

                                return (
                                  <li
                                    key={i}
                                    className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-xs transition-colors ${
                                      isDismissed
                                        ? "bg-slate-100 text-slate-400 line-through"
                                        : isConfirmed
                                        ? "bg-green-50 text-slate-700"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className={`font-mono ${isDismissed ? "text-slate-400" : "text-slate-800"}`}>
                                        {detail.value_preview}
                                      </span>{" "}
                                      <span className="text-slate-400">({detail.location})</span>
                                      {duplicateCount > 1 && (
                                        <span className="ml-1 text-slate-300">
                                          [{detail.file_name.slice(0, 25)}]
                                        </span>
                                      )}
                                    </div>

                                    {/* Feedback buttons */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {fb ? (
                                        <>
                                          <span className={`text-[10px] font-medium ${
                                            isConfirmed ? "text-green-600" : "text-slate-400"
                                          }`}>
                                            {isConfirmed ? "Confirmed" : "Dismissed"}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUndoFeedback(detail);
                                            }}
                                            className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                            title="Undo"
                                          >
                                            <Undo2 className="h-3 w-3" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleConfirm(detail, group.key);
                                            }}
                                            className="rounded p-0.5 text-slate-400 hover:bg-green-100 hover:text-green-600"
                                            title="Confirm as real PII"
                                          >
                                            <ThumbsUp className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openDismissModal(detail);
                                            }}
                                            className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                                            title="Dismiss / false positive"
                                          >
                                            <ThumbsDown className="h-3 w-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </li>
                                );
                              }
                            )}
                            {!isTypeExpanded && details.length > previewCount && (
                              <li className="text-xs text-slate-400 italic px-1.5">
                                +{details.length - previewCount} more
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })}

                    {/* Auto-Fix button */}
                    <div className="mt-3 flex items-center gap-3">
                      {!group.all_redacted && !allDismissed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRedactGroup(group);
                          }}
                          disabled={isGroupRedacting}
                          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isGroupRedacting ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Fixing {duplicateCount > 1 ? `${duplicateCount} files` : ""}...
                            </span>
                          ) : (
                            `Auto-Fix${duplicateCount > 1 ? ` All ${duplicateCount}` : ""}`
                          )}
                        </button>
                      )}

                      {(group.all_redacted || allDismissed) && (
                        <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                          <CheckCircle className="h-4 w-4" />
                          {allDismissed ? "All Dismissed" : "Fixed"}
                        </span>
                      )}
                    </div>

                    {groupErrors.length > 0 && (
                      <div className="mt-2">
                        {groupErrors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600">{err}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Sender Risk panel */}
                  {group.sender_risk && (
                    <div className="w-64 shrink-0">
                      <SenderRiskPanel risk={group.sender_risk} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
