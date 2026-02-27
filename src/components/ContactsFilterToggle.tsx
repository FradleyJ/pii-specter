"use client";

import { Users } from "lucide-react";

type ContactsFilterToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function ContactsFilterToggle({
  enabled,
  onChange,
}: ContactsFilterToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          enabled ? "bg-blue-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex items-center gap-1.5">
        <Users className={`h-4 w-4 ${enabled ? "text-blue-600" : "text-slate-400"}`} />
        <span className={`text-sm font-medium ${enabled ? "text-blue-700" : "text-slate-600"}`}>
          Known contacts only
        </span>
      </div>
    </div>
  );
}
