import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("google_tokens");
  cookieStore.delete("user_email");
  cookieStore.delete("user_name");
  cookieStore.delete("user_picture");
  return NextResponse.json({ success: true });
}
