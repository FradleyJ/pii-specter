import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const includeWrite = req.nextUrl.searchParams.get("write") === "true";
  const url = getAuthUrl(includeWrite);
  return NextResponse.redirect(url);
}
