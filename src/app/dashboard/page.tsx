"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Shield, LogOut, Clock, ChevronRight, Download, History, ChevronDown } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import RiskChecklist from "@/components/RiskChecklist";
import CertificateButton from "@/components/CertificateButton";
import ScanSummaryDashboard from "@/components/ScanSummaryDashboard";
import ContactsFilterToggle from "@/components/ContactsFilterToggle";
import type { ScanResult, StoredScan } from "@/types/scan";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<StoredScan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [knownContactsOnly, setKnownContactsOnly] = useState(false);

  useEffect(() => {
    const email = document.cookie.match(/user_email=([^;]+)/)?.[1] || "";
    const name = document.cookie.match(/user_name=([^;]+)/)?.[1] || "";
    setUserEmail(decodeURIComponent(email));
    setUserName(decodeURIComponent(name));

    // Fetch last scan info + restore findings
    fetch("/api/monitor/stub")
      .then((res) => res.json())
      .then((data) => {
        if (data.last_scan) {
          setLastScanned(data.last_scan.scanned_at);
          setMonitorStatus(data.message);
        }
      })
      .catch(() => {});

    // Load the most recent scan with full findings
    fetch("/api/scan/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.scans && data.scans.length > 0) {
          const latest = data.scans[0];
          setScanResult({
            scan_id: latest.id,
            total_files: latest.total_files,
            files_with_pii: latest.files_with_pii,
            all_clean: latest.all_clean,
            findings: latest.findings || [],
            can_redact: false, // will be updated if user has write scopes
          });
          setLastScanned(latest.scanned_at);
          setScanHistory(data.scans);
        }
      })
      .catch(() => {});
  }, []);

  function handleScanComplete(result: ScanResult) {
    setScanResult(result);
    setLastScanned(new Date().toISOString());
    // Refresh history
    fetch("/api/scan/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.scans) setScanHistory(data.scans);
      })
      .catch(() => {});
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

  function loadHistoricalScan(scan: StoredScan) {
    setScanResult({
      scan_id: scan.id,
      total_files: scan.total_files,
      files_with_pii: scan.files_with_pii,
      all_clean: scan.all_clean,
      findings: scan.findings || [],
      can_redact: false,
    });
    setLastScanned(scan.scanned_at);
    setShowHistory(false);
  }

  const downloadResults = useCallback(
    (format: "csv" | "json") => {
      if (!scanResult || scanResult.findings.length === 0) return;

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "json") {
        content = JSON.stringify(
          {
            scan_id: scanResult.scan_id,
            scanned_at: lastScanned,
            total_files: scanResult.total_files,
            files_with_pii: scanResult.files_with_pii,
            all_clean: scanResult.all_clean,
            findings: scanResult.findings,
          },
          null,
          2
        );
        mimeType = "application/json";
        extension = "json";
      } else {
        // CSV export
        const rows: string[][] = [
          [
            "File Name",
            "File Type",
            "Risk Level",
            "PII Types",
            "PII Details",
            "Owner Email",
            "Owner Name",
            "Redacted",
          ],
        ];
        for (const f of scanResult.findings) {
          rows.push([
            f.file_name,
            f.file_type,
            f.risk_level,
            f.pii_types.join("; "),
            f.pii_details
              .map((d) => `${d.type}: ${d.value_preview} (${d.location})`)
              .join("; "),
            f.owner_email || "",
            f.owner_name || "",
            f.redacted ? "Yes" : "No",
          ]);
        }
        content = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
        mimeType = "text/csv";
        extension = "csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pii-scan-${new Date(lastScanned || Date.now()).toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [scanResult, lastScanned]
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const allClean = scanResult?.all_clean ?? false;

  // Compute filtered findings based on active filter
  const filteredFindings = useMemo(() => {
    if (!scanResult || !activeFilter) return scanResult?.findings || [];

    const findings = scanResult.findings;

    if (activeFilter.startsWith("risk:")) {
      const riskLevel = activeFilter.replace("risk:", "");
      return findings.filter((f) => f.risk_level === riskLevel);
    }

    if (activeFilter.startsWith("type:")) {
      const piiType = activeFilter.replace("type:", "");
      return findings.filter((f) =>
        f.pii_types.includes(piiType) ||
        f.pii_details.some((d) => d.type === piiType)
      );
    }

    return findings;
  }, [scanResult, activeFilter]);

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
          <ScanButton onScanComplete={handleScanComplete} knownContactsOnly={knownContactsOnly} />
          <CertificateButton allClean={allClean} />
          <ContactsFilterToggle enabled={knownContactsOnly} onChange={setKnownContactsOnly} />

          {/* Download dropdown */}
          {scanResult && scanResult.findings.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="invisible absolute left-0 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg group-hover:visible">
                <button
                  onClick={() => downloadResults("csv")}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => downloadResults("json")}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Download JSON
                </button>
              </div>
            </div>
          )}

          {/* History toggle */}
          {scanHistory.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <History className="h-4 w-4" />
              History ({scanHistory.length})
            </button>
          )}
        </div>

        {/* Scan history panel */}
        {showHistory && scanHistory.length > 1 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Previous Scans</h3>
            <div className="space-y-2">
              {scanHistory.map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => loadHistoricalScan(scan)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                    scanResult?.scan_id === scan.id
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-700">
                      {new Date(scan.scanned_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500">{scan.total_files} files</span>
                    <span className={scan.files_with_pii > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                      {scan.files_with_pii > 0 ? `${scan.files_with_pii} with PII` : "Clean"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {scanResult && (
          <div className="space-y-6">
            {/* Top-level summary: files scanned row */}
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

            {/* Category summary dashboard with clickable pills + risk breakdown */}
            {scanResult.findings.length > 0 && (
              <ScanSummaryDashboard
                findings={scanResult.findings}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            )}

            {/* Findings (filtered) */}
            <RiskChecklist
              scanId={scanResult.scan_id}
              findings={filteredFindings}
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
              Click &quot;Scan My Drive&quot; to check your last 15 Google Docs and Sheets for PII.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
