import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const includeWrite = req.nextUrl.searchParams.get("write") === "true";
  const url = getAuthUrl(includeWrite);
  console.log("[AUTH] Generated OAuth URL:", url);
  console.log("[AUTH] includeWrite:", includeWrite);
  return NextResponse.redirect(url);
}
