import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, hasWriteScopes } from "@/lib/auth";
import { getDocContent, getSheetContent } from "@/lib/drive";
import { scanTextForPII } from "@/lib/regex";
import { verifyCleanDocument } from "@/lib/gemini";
import { updateFindingRedacted } from "@/lib/supabase";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify write scopes
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("google_tokens");
  const tokens = tokenCookie ? JSON.parse(tokenCookie.value) : {};
  if (!hasWriteScopes(tokens)) {
    return NextResponse.json(
      { error: "Write permissions required. Please enable Auto-Fix first." },
      { status: 403 }
    );
  }

  const { scan_id, file_id, file_type } = await req.json();

  if (!scan_id || !file_id || !file_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    if (file_type === "doc") {
      await redactDocument(client, file_id);
    } else if (file_type === "sheet") {
      await redactSpreadsheet(client, file_id);
    }

    // Verify with Gemini after redaction
    let verifiedText = "";
    if (file_type === "doc") {
      const { text } = await getDocContent(client, file_id);
      verifiedText = text;
    } else {
      const { text } = await getSheetContent(client, file_id);
      verifiedText = text;
    }

    const verification = await verifyCleanDocument(verifiedText);

    // Second pass if issues remain
    if (!verification.isClean) {
      if (file_type === "doc") {
        await redactDocument(client, file_id);
      } else {
        await redactSpreadsheet(client, file_id);
      }

      // Re-verify
      if (file_type === "doc") {
        const { text } = await getDocContent(client, file_id);
        verifiedText = text;
      } else {
        const { text } = await getSheetContent(client, file_id);
        verifiedText = text;
      }

      const secondVerification = await verifyCleanDocument(verifiedText);
      if (!secondVerification.isClean) {
        return NextResponse.json({
          success: false,
          message: "Some PII may remain after redaction. Manual review recommended.",
          remainingIssues: secondVerification.remainingIssues,
        });
      }
    }

    // Update Supabase
    await updateFindingRedacted(scan_id, file_id);

    return NextResponse.json({
      success: true,
      verified_clean: true,
      message: "File redacted and verified clean.",
    });
  } catch (err) {
    console.error("Redact error:", err);
    return NextResponse.json(
      { error: "Redaction failed", detail: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function redactDocument(
  client: InstanceType<typeof google.auth.OAuth2>,
  docId: string
) {
  const { text, elements } = await getDocContent(client, docId);
  const matches = scanTextForPII(text);

  if (matches.length === 0) return;

  // Build batch update requests — process from end to start to preserve indices
  const sortedMatches = [...matches].sort((a, b) => b.index - a.index);

  const requests = sortedMatches.map((match) => {
    // Find the element containing this match
    const element = elements.find(
      (el) => match.index >= el.startIndex && match.index < el.endIndex
    );
    if (!element) return null;

    const startInDoc = element.startIndex + (match.index - elements[0]?.startIndex || 0);
    const endInDoc = startInDoc + match.value.length;

    return {
      replaceAllText: {
        containsText: {
          text: match.value,
          matchCase: true,
        },
        replaceText: `[${match.type} REDACTED]`,
      },
    };
  }).filter(Boolean);

  if (requests.length > 0) {
    const docs = google.docs({ version: "v1", auth: client });
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: requests as object[] },
    });
  }
}

async function redactSpreadsheet(
  client: InstanceType<typeof google.auth.OAuth2>,
  spreadsheetId: string
) {
  const { cells } = await getSheetContent(client, spreadsheetId);
  const sheets = google.sheets({ version: "v4", auth: client });

  const updates: { range: string; values: string[][] }[] = [];

  for (const cell of cells) {
    const matches = scanTextForPII(cell.value);
    if (matches.length > 0) {
      let redactedValue = cell.value;
      for (const match of matches) {
        redactedValue = redactedValue.replace(match.value, `[${match.type} REDACTED]`);
      }
      updates.push({
        range: `${cell.sheet}!${cell.cell}`,
        values: [[redactedValue]],
      });
    }
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updates,
      },
    });
  }
}
