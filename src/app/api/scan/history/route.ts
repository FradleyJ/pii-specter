import { NextResponse } from "next/server";
import { getAuthedClient, getUserInfo } from "@/lib/auth";
import { getScanHistory } from "@/lib/supabase";

export async function GET() {
  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const userInfo = await getUserInfo(client);
    const scans = await getScanHistory(userInfo.id!);

    return NextResponse.json({ scans });
  } catch (err) {
    console.error("Scan history error:", err);
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    );
  }
}
