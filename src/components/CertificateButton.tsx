"use client";

import { useState } from "react";
import { Award, Loader2, Lock } from "lucide-react";

type CertificateButtonProps = {
  allClean: boolean;
  firmName?: string;
};

export default function CertificateButton({ allClean, firmName }: CertificateButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (firmName) params.set("firm", firmName);
      const res = await fetch(`/api/certificate?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PII-Compliance-Certificate-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (!allClean) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        <Lock className="h-4 w-4" />
        <span>Certificate unlocks when all files are clean</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
    >
      {downloading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Award className="h-5 w-5" />
          Download Compliance Certificate
        </>
      )}
    </button>
  );
}
