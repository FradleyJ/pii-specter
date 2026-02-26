import { NextResponse } from "next/server";
import { getAuthedClient, getUserInfo, hasWriteScopes } from "@/lib/auth";
import { listRecentFiles, getDocContent, getSheetContent } from "@/lib/drive";
import { scanTextForPII } from "@/lib/regex";
import { scanWithGemini } from "@/lib/gemini";
import { saveScanResult, type ScanFinding, type PiiDetail } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST() {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const files = await listRecentFiles(client);

    const findings: ScanFinding[] = [];

    for (const file of files) {
      const isDoc = file.mimeType.includes("document");
      const isSheet = file.mimeType.includes("spreadsheet");

      let text = "";
      let locationMap: Map<number, string> = new Map();

      if (isDoc) {
        const { text: docText, elements } = await getDocContent(client, file.id);
        text = docText;
        elements.forEach((el, i) => locationMap.set(el.startIndex, `paragraph ${i + 1}`));
      } else if (isSheet) {
        const { text: sheetText, cells } = await getSheetContent(client, file.id);
        text = sheetText;
        cells.forEach((cell) => locationMap.set(0, `cell ${cell.cell}`));
      }

      if (!text.trim()) continue;

      // Phase 1: Regex pre-filter
      const regexMatches = scanTextForPII(text);

      // Phase 2: Gemini deep analysis
      const geminiResult = await scanWithGemini(text);

      // Combine findings
      const piiTypes = new Set<string>();
      const piiDetails: PiiDetail[] = [];

      for (const match of regexMatches) {
        piiTypes.add(match.type);
        piiDetails.push({
          type: match.type,
          value_preview: match.maskedValue,
          location: findNearestLocation(match.index, locationMap) || `index ${match.index}`,
        });
      }

      for (const finding of geminiResult.findings) {
        piiTypes.add(finding.type);
        // Only add if not already captured by regex
        if (!piiDetails.some((d) => d.type === finding.type && d.location === finding.location)) {
          piiDetails.push({
            type: finding.type,
            value_preview: "[Detected by AI]",
            location: finding.location,
          });
        }
      }

      if (piiTypes.size > 0) {
        const highSeverityTypes = ["SSN", "EIN", "CreditCard", "BankAccount"];
        const hasHigh = [...piiTypes].some((t) => highSeverityTypes.includes(t));

        findings.push({
          file_id: file.id,
          file_name: file.name,
          file_type: isDoc ? "doc" : "sheet",
          pii_types: [...piiTypes],
          pii_details: piiDetails,
          risk_level: hasHigh ? "high" : piiDetails.length > 3 ? "medium" : "low",
          redacted: false,
          verified_clean: false,
        });
      }
    }

    // Check token scopes for write capability
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("google_tokens");
    const tokens = tokenCookie ? JSON.parse(tokenCookie.value) : {};
    const canRedact = hasWriteScopes(tokens);

    const scanResult = await saveScanResult({
      user_id: userInfo.id!,
      user_email: userInfo.email!,
      scanned_at: new Date().toISOString(),
      total_files: files.length,
      files_with_pii: findings.length,
      all_clean: findings.length === 0,
      findings,
    });

    return NextResponse.json({
      scan_id: scanResult.id,
      total_files: files.length,
      files_with_pii: findings.length,
      all_clean: findings.length === 0,
      findings,
      can_redact: canRedact,
    });
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json(
      { error: "Scan failed", detail: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function findNearestLocation(index: number, locationMap: Map<number, string>): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const [key, value] of locationMap) {
    const dist = Math.abs(key - index);
    if (dist < minDist) {
      minDist = dist;
      nearest = value;
    }
  }
  return nearest;
}
