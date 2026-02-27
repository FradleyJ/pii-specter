import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient, getUserInfo } from "@/lib/auth";
import { saveUserFeedback, getUserFeedbackForScan, deleteUserFeedback } from "@/lib/supabase";
import type { FeedbackAction, FeedbackScope } from "@/types/scan";
import { createHash } from "crypto";

function hashPreview(preview: string): string {
  return createHash("sha256").update(preview.toLowerCase().trim()).digest("hex").slice(0, 16);
}

// POST /api/feedback — save user feedback on a finding
export async function POST(request: NextRequest) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const body = await request.json();

    const {
      finding_type,
      raw_preview,
      action,
      reason,
      notes,
      apply_scope,
      scan_id,
      file_name,
    } = body as {
      finding_type: string;
      raw_preview?: string;
      action: FeedbackAction;
      reason?: string;
      notes?: string;
      apply_scope: FeedbackScope;
      scan_id?: string;
      file_name?: string;
    };

    if (!finding_type || !action || !apply_scope) {
      return NextResponse.json(
        { error: "Missing required fields: finding_type, action, apply_scope" },
        { status: 400 }
      );
    }

    const feedback = await saveUserFeedback({
      user_id: userInfo.id!,
      finding_type,
      pattern_hash: raw_preview ? hashPreview(raw_preview) : undefined,
      raw_preview,
      action,
      reason,
      notes,
      apply_scope,
      scan_id,
      file_name,
    });

    return NextResponse.json({ success: true, feedback });
  } catch (err) {
    console.error("Feedback save error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// GET /api/feedback?scan_id=xxx — get feedback for a scan
export async function GET(request: NextRequest) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const scanId = request.nextUrl.searchParams.get("scan_id");

    if (!scanId) {
      return NextResponse.json({ error: "scan_id is required" }, { status: 400 });
    }

    const feedback = await getUserFeedbackForScan(userInfo.id!, scanId);
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("Feedback fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch feedback", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback?id=xxx — undo a feedback action
export async function DELETE(request: NextRequest) {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const feedbackId = request.nextUrl.searchParams.get("id");
    if (!feedbackId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await deleteUserFeedback(feedbackId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete feedback", detail: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
