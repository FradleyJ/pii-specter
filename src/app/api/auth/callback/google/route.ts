import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, createOAuth2Client, getUserInfo } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?error=auth_denied", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  try {
    const tokens = await getTokensFromCode(code);
    console.log("[AUTH CALLBACK] Granted scopes:", tokens.scope);
    console.log("[AUTH CALLBACK] Token keys:", Object.keys(tokens));
    const cookieStore = await cookies();

    // Store tokens in httpOnly cookie
    cookieStore.set("google_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Get user info for display
    const client = createOAuth2Client();
    client.setCredentials(tokens);
    const userInfo = await getUserInfo(client);

    cookieStore.set("user_email", userInfo.email || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    cookieStore.set("user_name", userInfo.name || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    cookieStore.set("user_picture", userInfo.picture || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url));
  }
}
