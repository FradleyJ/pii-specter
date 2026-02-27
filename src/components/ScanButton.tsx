"use client";

import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";
import type { ScanResult } from "@/types/scan";

// Re-export types for backward compatibility with other components
export type { ScanResult, ScanFinding, SenderRiskInfo } from "@/types/scan";

type ScanButtonProps = {
  onScanComplete: (result: ScanResult) => void;
  knownContactsOnly?: boolean;
};

export default function ScanButton({ onScanComplete, knownContactsOnly }: ScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knownContactsOnly: knownContactsOnly ?? false }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }
      const result = await res.json();
      onScanComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleScan}
        disabled={scanning}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {scanning ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Scanning Drive...
          </>
        ) : (
          <>
            <FileSearch className="h-5 w-5" />
            Scan My Drive
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
