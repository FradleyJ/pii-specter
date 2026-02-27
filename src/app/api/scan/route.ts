import { NextResponse } from "next/server";
import { getAuthedClient, getUserInfo, hasWriteScopes, hasGmailScope } from "@/lib/auth";
import { listRecentFiles, getDocContent, getSheetContent } from "@/lib/drive";
import { scanTextForPII } from "@/lib/regex";
import { scanWithGemini } from "@/lib/gemini";
import { saveScanResult, getUserExclusions } from "@/lib/supabase";
import { analyzeSenderRisk, getKnownContacts } from "@/lib/gmail";
import { cookies } from "next/headers";
import type { ScanFinding, PiiDetail, UserExclusion } from "@/types/scan";
import { normalizePiiType, PII_SEVERITY } from "@/types/scan";
import { createHash } from "crypto";

function hashPreview(preview: string): string {
  return createHash("sha256").update(preview.toLowerCase().trim()).digest("hex").slice(0, 16);
}

function isExcluded(
  detail: PiiDetail,
  exclusions: UserExclusion[]
): "dismissed" | "excluded" | null {
  for (const ex of exclusions) {
    // Global exclusion for this PII type
    if (ex.apply_scope === "global" && ex.finding_type === detail.type) {
      return ex.finding_type === detail.type ? (ex.finding_type ? "excluded" : "dismissed") : null;
    }
    // Type-level: match on type
    if (ex.apply_scope === "type" && ex.finding_type === detail.type) {
      return "dismissed";
    }
    // Specific: match on pattern hash
    if (ex.apply_scope === "this" && ex.pattern_hash && ex.pattern_hash === hashPreview(detail.value_preview)) {
      return "dismissed";
    }
  }
  return null;
}

export async function POST(req: Request) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse optional request body
  let knownContactsOnly = false;
  try {
    const body = await req.json();
    knownContactsOnly = body.knownContactsOnly === true;
  } catch {
    // No body or invalid JSON — defaults to false
  }

  try {
    const userInfo = await getUserInfo(client);
    let files = await listRecentFiles(client);

    // Check if Gmail scope is available for sender risk analysis
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("google_tokens");
    const tokens = tokenCookie ? JSON.parse(tokenCookie.value) : {};
    const canRedact = hasWriteScopes(tokens);
    const canAnalyzeEmail = hasGmailScope(tokens);

    // Filter files to known contacts only (requires Gmail scope)
    if (knownContactsOnly && canAnalyzeEmail) {
      const contacts = await getKnownContacts(client);
      const totalBefore = files.length;
      files = files.filter((file) => {
        // Always include user's own files
        if (file.ownerEmail?.toLowerCase() === userInfo.email?.toLowerCase()) {
          return true;
        }
        // Check if owner, last modifier, or any sharer is a known contact
        const emailsToCheck = [
          file.ownerEmail,
          file.lastModifiedBy,
          ...(file.sharedBy || []),
        ].filter(Boolean) as string[];
        return emailsToCheck.some((email) => contacts.has(email.toLowerCase()));
      });
      console.log(`[Known Contacts Filter] ${totalBefore} files → ${files.length} from known contacts`);
    }

    // Load user exclusions for scan suppression
    let exclusions: UserExclusion[] = [];
    try {
      exclusions = await getUserExclusions(userInfo.id!);
    } catch {
      // user_feedback table may not exist yet — proceed without suppression
    }

    const findings: ScanFinding[] = [];

    // Cache sender risk results to avoid redundant Gmail API calls
    const senderRiskCache = new Map<string, Awaited<ReturnType<typeof analyzeSenderRisk>>>();

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
        const normalizedType = normalizePiiType(match.type);
        piiTypes.add(normalizedType);
        piiDetails.push({
          type: normalizedType,
          value_preview: match.maskedValue,
          location: findNearestLocation(match.index, locationMap) || `index ${match.index}`,
        });
      }

      for (const finding of geminiResult.findings) {
        const normalizedType = normalizePiiType(finding.type);
        piiTypes.add(normalizedType);
        // Only add if not already captured by regex (compare normalized types)
        if (!piiDetails.some((d) => d.type === normalizedType && d.location === finding.location)) {
          piiDetails.push({
            type: normalizedType,
            value_preview: finding.masked_preview || `[AI: ${normalizedType}]`,
            location: finding.location,
          });
        }
      }

      // Apply user exclusions — mark suppressed findings
      const processedDetails: PiiDetail[] = [];
      const activePiiTypes = new Set<string>();
      let hasSuppressed = false;

      for (const detail of piiDetails) {
        const exclusionStatus = isExcluded(detail, exclusions);
        if (exclusionStatus === "excluded") {
          // Fully excluded — skip entirely
          hasSuppressed = true;
          continue;
        }
        activePiiTypes.add(detail.type);
        processedDetails.push(detail);
      }

      if (activePiiTypes.size > 0) {
        const hasHigh = [...activePiiTypes].some((t) => PII_SEVERITY[t] === "high");

        // Determine target email for sender risk (owner or sharer)
        const targetEmail = file.ownerEmail || file.lastModifiedBy;
        let senderRisk: ScanFinding["sender_risk"] = undefined;

        if (canAnalyzeEmail && targetEmail && targetEmail !== userInfo.email) {
          // Check cache first
          if (!senderRiskCache.has(targetEmail)) {
            try {
              const riskResult = await analyzeSenderRisk(
                client,
                targetEmail,
                userInfo.email!,
                targetEmail === file.ownerEmail,
                file.ownerName
              );
              senderRiskCache.set(targetEmail, riskResult);
            } catch (err) {
              console.error(`Sender risk analysis failed for ${targetEmail}:`, err);
            }
          }

          senderRisk = senderRiskCache.get(targetEmail);
        }

        findings.push({
          file_id: file.id,
          file_name: file.name,
          file_type: isDoc ? "doc" : "sheet",
          pii_types: [...activePiiTypes],
          pii_details: processedDetails,
          risk_level: hasHigh ? "high" : processedDetails.length > 3 ? "medium" : "low",
          redacted: false,
          verified_clean: false,
          owner_email: file.ownerEmail,
          owner_name: file.ownerName,
          shared_by: file.sharedBy,
          last_modified_by: file.lastModifiedBy,
          sender_risk: senderRisk,
        });
      }
    }

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
