"use client";

import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Fingerprint,
  Building,
  CreditCard,
  Landmark,
  Calendar,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  FileQuestion,
} from "lucide-react";
import type { ScanFinding, PiiCategorySummary } from "@/types/scan";
import { PII_SEVERITY } from "@/types/scan";

type ScanSummaryDashboardProps = {
  findings: ScanFinding[];
  activeFilter: string | null;
  onFilterChange: (type: string | null) => void;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  SSN: <Fingerprint className="h-3.5 w-3.5" />,
  EIN: <Building className="h-3.5 w-3.5" />,
  "Credit Card": <CreditCard className="h-3.5 w-3.5" />,
  "Bank Account": <Landmark className="h-3.5 w-3.5" />,
  "Routing Number": <Landmark className="h-3.5 w-3.5" />,
  "Tax ID": <Fingerprint className="h-3.5 w-3.5" />,
  Passport: <Fingerprint className="h-3.5 w-3.5" />,
  "Driver's License": <Fingerprint className="h-3.5 w-3.5" />,
  "Date of Birth": <Calendar className="h-3.5 w-3.5" />,
  "Phone Number": <Phone className="h-3.5 w-3.5" />,
  "Email Address": <Mail className="h-3.5 w-3.5" />,
  "Street Address": <MapPin className="h-3.5 w-3.5" />,
  "Client Financial": <DollarSign className="h-3.5 w-3.5" />,
};

const SEVERITY_COLORS = {
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    activeBg: "bg-red-100",
    activeBorder: "border-red-400",
    icon: "text-red-500",
    ring: "ring-red-300",
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    activeBg: "bg-yellow-100",
    activeBorder: "border-yellow-400",
    icon: "text-yellow-500",
    ring: "ring-yellow-300",
  },
  low: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    activeBg: "bg-blue-100",
    activeBorder: "border-blue-400",
    icon: "text-blue-500",
    ring: "ring-blue-300",
  },
};

function computeSummary(findings: ScanFinding[]): {
  categories: PiiCategorySummary[];
  byRisk: { high: number; medium: number; low: number };
  totalFindings: number;
} {
  const typeMap = new Map<string, { count: number; files: Set<string> }>();

  for (const finding of findings) {
    for (const detail of finding.pii_details) {
      if (!typeMap.has(detail.type)) {
        typeMap.set(detail.type, { count: 0, files: new Set() });
      }
      const entry = typeMap.get(detail.type)!;
      entry.count++;
      entry.files.add(finding.file_id);
    }
  }

  const categories: PiiCategorySummary[] = [];
  for (const [type, data] of typeMap) {
    categories.push({
      type,
      count: data.count,
      file_count: data.files.size,
      severity: PII_SEVERITY[type] || "low",
    });
  }

  // Sort: high severity first, then by count descending
  const order = { high: 0, medium: 1, low: 2 };
  categories.sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);

  const byRisk = { high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    byRisk[f.risk_level]++;
  }

  const totalFindings = findings.reduce((sum, f) => sum + f.pii_details.length, 0);

  return { categories, byRisk, totalFindings };
}

export default function ScanSummaryDashboard({
  findings,
  activeFilter,
  onFilterChange,
}: ScanSummaryDashboardProps) {
  const { categories, byRisk, totalFindings } = computeSummary(findings);

  if (findings.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      {/* Top row: risk level breakdown */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalFindings}</p>
          <p className="text-xs text-slate-500">Total Findings</p>
        </div>
        <button
          onClick={() => onFilterChange(activeFilter === "risk:high" ? null : "risk:high")}
          className={`rounded-lg p-3 text-center transition-all ${
            activeFilter === "risk:high"
              ? "bg-red-100 ring-2 ring-red-300"
              : "bg-red-50 hover:bg-red-100"
          }`}
        >
          <p className="text-2xl font-bold text-red-700">{byRisk.high}</p>
          <p className="text-xs text-red-600 flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" /> High Risk
          </p>
        </button>
        <button
          onClick={() => onFilterChange(activeFilter === "risk:medium" ? null : "risk:medium")}
          className={`rounded-lg p-3 text-center transition-all ${
            activeFilter === "risk:medium"
              ? "bg-yellow-100 ring-2 ring-yellow-300"
              : "bg-yellow-50 hover:bg-yellow-100"
          }`}
        >
          <p className="text-2xl font-bold text-yellow-700">{byRisk.medium}</p>
          <p className="text-xs text-yellow-600 flex items-center justify-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Medium
          </p>
        </button>
        <button
          onClick={() => onFilterChange(activeFilter === "risk:low" ? null : "risk:low")}
          className={`rounded-lg p-3 text-center transition-all ${
            activeFilter === "risk:low"
              ? "bg-blue-100 ring-2 ring-blue-300"
              : "bg-blue-50 hover:bg-blue-100"
          }`}
        >
          <p className="text-2xl font-bold text-blue-700">{byRisk.low}</p>
          <p className="text-xs text-blue-600 flex items-center justify-center gap-1">
            <Info className="h-3 w-3" /> Low
          </p>
        </button>
      </div>

      {/* Category pills */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          PII Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {activeFilter && (
            <button
              onClick={() => onFilterChange(null)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Clear filter
            </button>
          )}
          {categories.map((cat) => {
            const sev = SEVERITY_COLORS[cat.severity];
            const isActive = activeFilter === `type:${cat.type}`;
            const icon = ICON_MAP[cat.type] || <FileQuestion className="h-3.5 w-3.5" />;

            return (
              <button
                key={cat.type}
                onClick={() => onFilterChange(isActive ? null : `type:${cat.type}`)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? `${sev.activeBg} ${sev.activeBorder} ${sev.text} ring-2 ${sev.ring}`
                    : `${sev.bg} ${sev.border} ${sev.text} hover:${sev.activeBg}`
                }`}
              >
                <span className={sev.icon}>{icon}</span>
                {cat.type}
                <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-bold">
                  {cat.count}
                </span>
                <span className="text-[10px] opacity-60">
                  {cat.file_count} file{cat.file_count !== 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
