"use client";

import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Mail,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  User,
} from "lucide-react";
import type { SenderRiskInfo } from "@/types/scan";

type SenderRiskPanelProps = {
  risk: SenderRiskInfo;
};

const AUTH_ICONS = {
  pass: <CheckCircle className="h-3 w-3 text-green-600" />,
  fail: <XCircle className="h-3 w-3 text-red-600" />,
  none: <HelpCircle className="h-3 w-3 text-slate-400" />,
  unknown: <HelpCircle className="h-3 w-3 text-slate-400" />,
};

const AUTH_LABELS = {
  pass: "text-green-700",
  fail: "text-red-700",
  none: "text-slate-500",
  unknown: "text-slate-500",
};

const RISK_CONFIGS = {
  low: {
    bg: "bg-green-50",
    border: "border-green-200",
    bar: "bg-green-500",
    icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
    label: "text-green-700",
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    bar: "bg-yellow-500",
    icon: <Shield className="h-4 w-4 text-yellow-600" />,
    label: "text-yellow-700",
  },
  high: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    bar: "bg-orange-500",
    icon: <ShieldAlert className="h-4 w-4 text-orange-600" />,
    label: "text-orange-700",
  },
  critical: {
    bg: "bg-red-50",
    border: "border-red-200",
    bar: "bg-red-500",
    icon: <ShieldOff className="h-4 w-4 text-red-600" />,
    label: "text-red-700",
  },
};

function RiskBar({ score }: { score: number }) {
  const segments = 5;
  const filled = Math.round((score / 100) * segments);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-4 rounded-sm ${
            i < filled
              ? score <= 25
                ? "bg-green-500"
                : score <= 50
                ? "bg-yellow-500"
                : score <= 75
                ? "bg-orange-500"
                : "bg-red-500"
              : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function SenderRiskPanel({ risk }: SenderRiskPanelProps) {
  const config = RISK_CONFIGS[risk.risk_label];

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Sender Risk
        </span>
        {config.icon}
      </div>

      {/* Identity */}
      <div className="mb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <User className="h-3 w-3 text-slate-400" />
          <span className="font-medium truncate">
            {risk.display_name || risk.email}
          </span>
        </div>
        {risk.display_name && (
          <p className="ml-[18px] text-[10px] text-slate-400 truncate">{risk.email}</p>
        )}
      </div>

      {/* Risk score bar */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <RiskBar score={risk.risk_score} />
          <span className={`text-xs font-bold ${config.label}`}>
            {risk.risk_score}
          </span>
        </div>
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${config.label}`}>
          {risk.risk_label} risk
        </p>
      </div>

      {/* P1/P2 sender match */}
      {risk.p1_sender && risk.p2_sender && (
        <div className="mb-2 rounded bg-white/60 p-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5">
            <Mail className="h-2.5 w-2.5" />
            <span>Sender Identity</span>
          </div>
          <div className="text-[10px] space-y-0.5 ml-3.5">
            <p className="text-slate-600">
              <span className="text-slate-400">P1:</span> {risk.p1_sender}
            </p>
            <p className="text-slate-600">
              <span className="text-slate-400">P2:</span> {risk.p2_sender}
            </p>
          </div>
          <div className="mt-1 ml-3.5">
            {risk.p1_p2_match ? (
              <span className="flex items-center gap-1 text-[10px] text-green-600">
                <CheckCircle className="h-2.5 w-2.5" /> Match
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-red-600">
                <AlertTriangle className="h-2.5 w-2.5" /> Mismatch — spoofing risk
              </span>
            )}
          </div>
        </div>
      )}

      {/* Email authentication */}
      <div className="mb-2 grid grid-cols-3 gap-1">
        {(["dmarc", "spf", "dkim"] as const).map((auth) => (
          <div
            key={auth}
            className="flex flex-col items-center rounded bg-white/60 px-1 py-1"
          >
            <span className="text-[9px] font-semibold text-slate-400 uppercase">
              {auth}
            </span>
            <div className="flex items-center gap-0.5 mt-0.5">
              {AUTH_ICONS[risk[auth]]}
              <span className={`text-[10px] font-medium ${AUTH_LABELS[risk[auth]]}`}>
                {risk[auth]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Communication stats */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-slate-500">
            <MessageSquare className="h-2.5 w-2.5" />
            Emails exchanged
          </span>
          <span className="font-semibold text-slate-700">
            {risk.communication_count}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="flex items-center gap-1 text-slate-500">
            <ArrowRightLeft className="h-2.5 w-2.5" />
            Direction
          </span>
          <span className={`font-semibold ${
            risk.direction === "external" ? "text-amber-600" : "text-slate-700"
          }`}>
            {risk.direction === "external" ? "External" : risk.direction === "internal" ? "Internal" : "Unknown"}
          </span>
        </div>

        {risk.first_contact && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-2.5 w-2.5" />
              First contact
            </span>
            <span className="font-medium text-slate-600">
              {new Date(risk.first_contact).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {risk.communication_count === 0 && (
          <div className="mt-1 rounded bg-red-100/60 px-1.5 py-1">
            <p className="text-[10px] text-red-700 font-medium">
              No prior communication — elevated risk
            </p>
          </div>
        )}

        {risk.communication_count === 1 && (
          <div className="mt-1 rounded bg-amber-100/60 px-1.5 py-1">
            <p className="text-[10px] text-amber-700 font-medium">
              One-time contact — review recommended
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
