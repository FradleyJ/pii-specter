import { google } from "googleapis";

type AuthClient = InstanceType<typeof google.auth.OAuth2>;

export type EmailAuthResult = {
  dmarc: "pass" | "fail" | "none" | "unknown";
  spf: "pass" | "fail" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  p1_sender?: string; // Return-Path (envelope sender)
  p2_sender?: string; // From header
  p1_p2_match?: boolean;
};

export type CommunicationProfile = {
  email: string;
  communication_count: number;
  direction: "internal" | "external" | "unknown";
  first_contact?: string;
  last_contact?: string;
};

export type SenderRiskResult = {
  email: string;
  display_name?: string;
  is_owner: boolean;
  p1_sender?: string;
  p2_sender?: string;
  p1_p2_match?: boolean;
  dmarc: "pass" | "fail" | "none" | "unknown";
  spf: "pass" | "fail" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  communication_count: number;
  direction: "internal" | "external" | "unknown";
  first_contact?: string;
  last_contact?: string;
  risk_score: number;
  risk_label: "low" | "medium" | "high" | "critical";
};

// --- Known contacts extraction ---

/**
 * Build a set of email addresses the user has sent mail to.
 * Scans the Sent folder for up to maxMessages and extracts To/Cc recipients.
 */
export async function getKnownContacts(
  auth: AuthClient,
  maxMessages: number = 1000
): Promise<Set<string>> {
  const gmail = google.gmail({ version: "v1", auth });
  const contacts = new Set<string>();
  let pageToken: string | undefined;
  let fetched = 0;
  const perPage = 500;

  // Paginate through sent messages
  while (fetched < maxMessages) {
    const remaining = maxMessages - fetched;
    const batchSize = Math.min(perPage, remaining);

    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: "in:sent",
      maxResults: batchSize,
      pageToken,
    });

    const messageIds = data.messages || [];
    if (messageIds.length === 0) break;

    // Batch fetch headers in groups of 100
    for (let i = 0; i < messageIds.length; i += 100) {
      const batch = messageIds.slice(i, i + 100);
      const results = await Promise.all(
        batch.map((msg) =>
          msg.id
            ? gmail.users.messages
                .get({
                  userId: "me",
                  id: msg.id,
                  format: "metadata",
                  metadataHeaders: ["To", "Cc"],
                })
                .catch(() => null)
            : Promise.resolve(null)
        )
      );

      for (const result of results) {
        if (!result) continue;
        const headers = result.data.payload?.headers || [];
        for (const header of headers) {
          if (header.name === "To" || header.name === "Cc") {
            extractEmails(header.value || "", contacts);
          }
        }
      }
    }

    fetched += messageIds.length;
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  console.log(`[Known Contacts] Found ${contacts.size} unique contacts from ${fetched} sent messages`);
  return contacts;
}

/**
 * Extract email addresses from a header value like "Name <email@example.com>, other@test.com"
 */
function extractEmails(headerValue: string, into: Set<string>): void {
  // Split on commas, then extract email from each part
  const parts = headerValue.split(",");
  for (const part of parts) {
    const bracketMatch = part.match(/<([^>]+)>/);
    if (bracketMatch) {
      into.add(bracketMatch[1].toLowerCase().trim());
    } else {
      // Plain email without brackets
      const trimmed = part.trim();
      if (trimmed.includes("@")) {
        into.add(trimmed.toLowerCase());
      }
    }
  }
}

// --- Gmail message search and header analysis ---

/**
 * Count emails exchanged with a specific email address.
 * Returns communication profile with frequency and direction info.
 */
export async function getCommunicationProfile(
  auth: AuthClient,
  targetEmail: string,
  userEmail: string
): Promise<CommunicationProfile> {
  const gmail = google.gmail({ version: "v1", auth });

  try {
    // Search for all emails with this contact
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: `from:${targetEmail} OR to:${targetEmail}`,
      maxResults: 100,
    });

    const messageCount = data.resultSizeEstimate || 0;

    if (messageCount === 0) {
      return {
        email: targetEmail,
        communication_count: 0,
        direction: "unknown",
      };
    }

    // Get first and last message for date range
    const messageIds = data.messages || [];
    let firstContact: string | undefined;
    let lastContact: string | undefined;
    let inboundCount = 0;
    let outboundCount = 0;

    // Sample up to 5 messages to determine direction and dates
    const samplesToCheck = messageIds.slice(0, Math.min(5, messageIds.length));
    const lastMsg = messageIds[messageIds.length - 1];
    if (lastMsg && !samplesToCheck.some((m) => m.id === lastMsg.id)) {
      samplesToCheck.push(lastMsg);
    }

    for (const msg of samplesToCheck) {
      if (!msg.id) continue;
      try {
        const { data: msgData } = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["From", "To", "Date"],
        });

        const headers = msgData.payload?.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value;

        if (date) {
          const parsed = new Date(date).toISOString();
          if (!lastContact || parsed > lastContact) lastContact = parsed;
          if (!firstContact || parsed < firstContact) firstContact = parsed;
        }

        // Check direction
        const fromLower = from.toLowerCase();
        if (fromLower.includes(targetEmail.toLowerCase())) {
          inboundCount++;
        } else {
          outboundCount++;
        }
      } catch {
        // Skip individual message errors
      }
    }

    // Determine direction
    const userDomain = userEmail.split("@")[1];
    const targetDomain = targetEmail.split("@")[1];
    const direction =
      userDomain && targetDomain && userDomain.toLowerCase() === targetDomain.toLowerCase()
        ? "internal"
        : "external";

    return {
      email: targetEmail,
      communication_count: messageCount,
      direction,
      first_contact: firstContact,
      last_contact: lastContact,
    };
  } catch (err) {
    // Gmail API not available or permission denied — return unknown
    console.error(`Gmail lookup failed for ${targetEmail}:`, err);
    return {
      email: targetEmail,
      communication_count: -1, // -1 means lookup failed
      direction: "unknown",
    };
  }
}

/**
 * Get email authentication results (DMARC, SPF, DKIM) and P1/P2 sender
 * by finding a recent email from the target address.
 */
export async function getEmailAuthResults(
  auth: AuthClient,
  targetEmail: string
): Promise<EmailAuthResult> {
  const gmail = google.gmail({ version: "v1", auth });

  const defaults: EmailAuthResult = {
    dmarc: "unknown",
    spf: "unknown",
    dkim: "unknown",
  };

  try {
    // Find a recent email FROM this sender
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: `from:${targetEmail}`,
      maxResults: 1,
    });

    if (!data.messages || data.messages.length === 0) {
      return defaults;
    }

    const msgId = data.messages[0].id!;
    const { data: msgData } = await gmail.users.messages.get({
      userId: "me",
      id: msgId,
      format: "metadata",
      metadataHeaders: [
        "Authentication-Results",
        "From",
        "Return-Path",
        "ARC-Authentication-Results",
      ],
    });

    const headers = msgData.payload?.headers || [];

    // Extract P1 (Return-Path / envelope sender)
    const returnPath = headers.find((h) => h.name === "Return-Path")?.value || "";
    const p1Match = returnPath.match(/<([^>]+)>/);
    const p1_sender = p1Match ? p1Match[1] : returnPath.replace(/[<>]/g, "").trim();

    // Extract P2 (From header)
    const fromHeader = headers.find((h) => h.name === "From")?.value || "";
    const p2Match = fromHeader.match(/<([^>]+)>/);
    const p2_sender = p2Match ? p2Match[1] : fromHeader.trim();

    // P1/P2 match check (compare domains at minimum)
    const p1Domain = p1_sender.split("@")[1]?.toLowerCase();
    const p2Domain = p2_sender.split("@")[1]?.toLowerCase();
    const p1_p2_match = p1_sender && p2_sender
      ? p1_sender.toLowerCase() === p2_sender.toLowerCase() || p1Domain === p2Domain
      : undefined;

    // Parse Authentication-Results header
    const authResults =
      headers.find((h) => h.name === "Authentication-Results")?.value ||
      headers.find((h) => h.name === "ARC-Authentication-Results")?.value ||
      "";

    const dmarc = parseAuthField(authResults, "dmarc");
    const spf = parseAuthField(authResults, "spf");
    const dkim = parseAuthField(authResults, "dkim");

    return {
      dmarc,
      spf,
      dkim,
      p1_sender: p1_sender || undefined,
      p2_sender: p2_sender || undefined,
      p1_p2_match,
    };
  } catch (err) {
    console.error(`Email auth lookup failed for ${targetEmail}:`, err);
    return defaults;
  }
}

/**
 * Parse a specific auth field (dmarc, spf, dkim) from Authentication-Results header.
 * Example: "dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.com"
 */
function parseAuthField(
  authResultsHeader: string,
  field: string
): "pass" | "fail" | "none" | "unknown" {
  if (!authResultsHeader) return "unknown";

  const regex = new RegExp(`${field}=([a-zA-Z]+)`, "i");
  const match = authResultsHeader.match(regex);

  if (!match) return "none";

  const result = match[1].toLowerCase();
  if (result === "pass") return "pass";
  if (result === "fail" || result === "softfail" || result === "hardfail") return "fail";
  if (result === "none" || result === "neutral") return "none";
  return "unknown";
}

// --- Composite risk scoring ---

/**
 * Calculate composite sender risk score (0-100) based on:
 * - Communication frequency
 * - Email authentication (DMARC/SPF/DKIM)
 * - P1/P2 sender mismatch
 * - Direction (internal vs external)
 */
export function calculateSenderRiskScore(params: {
  communicationCount: number;
  direction: "internal" | "external" | "unknown";
  dmarc: "pass" | "fail" | "none" | "unknown";
  spf: "pass" | "fail" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  p1_p2_match?: boolean;
}): { score: number; label: "low" | "medium" | "high" | "critical" } {
  let score = 50; // neutral baseline

  // Communication frequency adjustments
  const count = params.communicationCount;
  if (count === -1) {
    // Lookup failed — slight increase
    score += 5;
  } else if (count === 0) {
    score += 30; // never contacted = high risk
  } else if (count === 1) {
    score += 20; // one-time = elevated
  } else if (count <= 5) {
    score += 10; // occasional
  } else if (count <= 20) {
    score += 0; // regular
  } else {
    score -= 10; // frequent = trusted
  }

  // Direction adjustments
  if (params.direction === "external") {
    score += 15;
  } else if (params.direction === "internal") {
    score -= 10;
  }

  // Email authentication adjustments
  if (params.dmarc === "fail") score += 20;
  else if (params.dmarc === "pass") score -= 5;

  if (params.spf === "fail") score += 15;
  else if (params.spf === "pass") score -= 5;

  if (params.dkim === "fail") score += 10;
  else if (params.dkim === "pass") score -= 5;

  // P1/P2 mismatch is a strong signal
  if (params.p1_p2_match === false) {
    score += 25;
  } else if (params.p1_p2_match === true) {
    score -= 5;
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine label
  let label: "low" | "medium" | "high" | "critical";
  if (score <= 25) label = "low";
  else if (score <= 50) label = "medium";
  else if (score <= 75) label = "high";
  else label = "critical";

  return { score, label };
}

// --- Main analysis function ---

/**
 * Analyze a file owner/sharer for sender risk.
 * Combines Drive metadata + Gmail analysis into a single risk profile.
 */
export async function analyzeSenderRisk(
  auth: AuthClient,
  targetEmail: string,
  userEmail: string,
  isOwner: boolean,
  displayName?: string
): Promise<SenderRiskResult> {
  // Run communication profile and auth checks in parallel
  const [commProfile, authResult] = await Promise.all([
    getCommunicationProfile(auth, targetEmail, userEmail),
    getEmailAuthResults(auth, targetEmail),
  ]);

  const { score, label } = calculateSenderRiskScore({
    communicationCount: commProfile.communication_count,
    direction: commProfile.direction,
    dmarc: authResult.dmarc,
    spf: authResult.spf,
    dkim: authResult.dkim,
    p1_p2_match: authResult.p1_p2_match,
  });

  return {
    email: targetEmail,
    display_name: displayName,
    is_owner: isOwner,
    p1_sender: authResult.p1_sender,
    p2_sender: authResult.p2_sender,
    p1_p2_match: authResult.p1_p2_match,
    dmarc: authResult.dmarc,
    spf: authResult.spf,
    dkim: authResult.dkim,
    communication_count: commProfile.communication_count,
    direction: commProfile.direction,
    first_contact: commProfile.first_contact,
    last_contact: commProfile.last_contact,
    risk_score: score,
    risk_label: label,
  };
}
