"use client";

import { useEffect, useState } from "react";
import { Shield, LogOut, Clock, ChevronRight } from "lucide-react";
import ScanButton, { type ScanResult, type ScanFinding } from "@/components/ScanButton";
import RiskChecklist from "@/components/RiskChecklist";
import CertificateButton from "@/components/CertificateButton";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<string | null>(null);

  useEffect(() => {
    // Read user info from cookies
    const email = document.cookie.match(/user_email=([^;]+)/)?.[1] || "";
    const name = document.cookie.match(/user_name=([^;]+)/)?.[1] || "";
    setUserEmail(decodeURIComponent(email));
    setUserName(decodeURIComponent(name));

    // Fetch last scan info
    fetch("/api/monitor/stub")
      .then((res) => res.json())
      .then((data) => {
        if (data.last_scan) {
          setLastScanned(data.last_scan.scanned_at);
          setMonitorStatus(data.message);
        }
      })
      .catch(() => {});
  }, []);

  function handleScanComplete(result: ScanResult) {
    setScanResult(result);
    setLastScanned(new Date().toISOString());
  }

  function handleRedactComplete(fileId: string) {
    if (!scanResult) return;
    const updated = scanResult.findings.map((f) =>
      f.file_id === fileId ? { ...f, redacted: true } : f
    );
    const allClean = updated.every((f) => f.redacted || f.pii_types.length === 0);
    setScanResult({ ...scanResult, findings: updated, all_clean: allClean });
  }

  function handleRequestWriteAccess() {
    window.location.href = "/api/auth/login?write=true";
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const allClean = scanResult?.all_clean ?? false;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-slate-900">PII Scanner</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{userName || userEmail}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Status bar */}
        {lastScanned && (
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span>
              Last scanned:{" "}
              {new Date(lastScanned).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {monitorStatus && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-400">{monitorStatus}</span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <ScanButton onScanComplete={handleScanComplete} />
          <CertificateButton allClean={allClean} />
        </div>

        {/* Results */}
        {scanResult && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Scan Results</h2>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{scanResult.total_files}</p>
                  <p className="text-sm text-slate-500">Files Scanned</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{scanResult.files_with_pii}</p>
                  <p className="text-sm text-slate-500">Files with PII</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className={`text-2xl font-bold ${allClean ? "text-green-600" : "text-amber-600"}`}>
                    {allClean ? "Clean" : "Action Needed"}
                  </p>
                  <p className="text-sm text-slate-500">Status</p>
                </div>
              </div>
            </div>

            {/* Findings */}
            <RiskChecklist
              scanId={scanResult.scan_id}
              findings={scanResult.findings}
              canRedact={scanResult.can_redact}
              onRedactComplete={handleRedactComplete}
              onRequestWriteAccess={handleRequestWriteAccess}
            />
          </div>
        )}

        {/* Empty state */}
        {!scanResult && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">Ready to Scan</h3>
            <p className="mt-2 text-sm text-slate-500">
              Click &quot;Scan My Drive&quot; to check your last 50 Google Docs and Sheets for PII.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
