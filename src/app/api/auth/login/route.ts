import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const includeWrite = req.nextUrl.searchParams.get("write") === "true";
  const includeGmail = req.nextUrl.searchParams.get("gmail") === "true";
  const url = getAuthUrl({ includeWrite, includeGmail });
  console.log("[AUTH] Generated OAuth URL:", url);
  console.log("[AUTH] includeWrite:", includeWrite, "includeGmail:", includeGmail);
  return NextResponse.redirect(url);
}
