import { google } from "googleapis";
import { cookies } from "next/headers";

const SCOPES_READONLY = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.readonly",
];

const SCOPES_WRITE = [
  ...SCOPES_READONLY,
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(includeWrite = false) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: includeWrite ? SCOPES_WRITE : SCOPES_READONLY,
  });
}

export async function getTokensFromCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getAuthedClient() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("google_tokens");
  if (!tokenCookie) return null;

  try {
    const tokens = JSON.parse(tokenCookie.value);
    const client = createOAuth2Client();
    client.setCredentials(tokens);

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      // Update cookie with refreshed tokens
      cookieStore.set("google_tokens", JSON.stringify(credentials), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return client;
  } catch {
    return null;
  }
}

export async function getUserInfo(client: InstanceType<typeof google.auth.OAuth2>) {
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export function hasWriteScopes(tokens: { scope?: string }): boolean {
  if (!tokens.scope) return false;
  return (
    tokens.scope.includes("documents") &&
    tokens.scope.includes("spreadsheets")
  );
}
