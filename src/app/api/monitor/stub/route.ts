import { NextResponse } from "next/server";
import { getAuthedClient, getUserInfo } from "@/lib/auth";
import { getLatestScan } from "@/lib/supabase";

export async function GET() {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const lastScan = await getLatestScan(userInfo.id!);

    return NextResponse.json({
      monitoring_enabled: false,
      message: "Weekly monitoring is coming soon. For now, run manual scans from the dashboard.",
      last_scan: lastScan
        ? {
            scanned_at: lastScan.scanned_at,
            total_files: lastScan.total_files,
            files_with_pii: lastScan.files_with_pii,
            all_clean: lastScan.all_clean,
          }
        : null,
    });
  } catch (err) {
    console.error("Monitor stub error:", err);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
