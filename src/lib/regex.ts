export type RegexMatch = {
  type: string;
  value: string;
  maskedValue: string;
  index: number;
};

const PII_PATTERNS: { type: string; pattern: RegExp; mask: (v: string) => string }[] = [
  {
    type: "SSN",
    pattern: /\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b/g,
    mask: (v) => `***-**-${v.replace(/\D/g, "").slice(-4)}`,
  },
  {
    type: "EIN",
    pattern: /\b(\d{2}[-\s]?\d{7})\b/g,
    mask: (v) => `**-***${v.replace(/\D/g, "").slice(-4)}`,
  },
  {
    type: "Credit Card",
    pattern: /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/g,
    mask: (v) => `****-****-****-${v.replace(/\D/g, "").slice(-4)}`,
  },
  {
    type: "Bank Account",
    pattern: /\b(\d{8,17})\b/g,
    mask: (v) => `****${v.slice(-4)}`,
  },
  {
    type: "Routing Number",
    pattern: /\b(0[0-9]|1[0-2]|2[1-9]|3[0-2]|6[1-9]|7[0-2]|80)\d{7}\b/g,
    mask: (v) => `*****${v.slice(-4)}`,
  },
  {
    type: "Date of Birth",
    pattern: /\b((?:0[1-9]|1[0-2])[\/\-](?:0[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2})\b/g,
    mask: (v) => {
      // Show year only: "**/**/1990"
      const parts = v.split(/[\/\-]/);
      return `**/**/${parts[2] || "****"}`;
    },
  },
  {
    type: "Phone Number",
    pattern: /\b(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g,
    mask: (v) => `(***) ***-${v.replace(/\D/g, "").slice(-4)}`,
  },
  {
    type: "Email Address",
    pattern: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    mask: (v) => {
      const [user, domain] = v.split("@");
      return `${user[0]}***@${domain}`;
    },
  },
  {
    type: "Street Address",
    pattern: /\b(\d{1,5}\s+(?:[A-Z][a-z]+\s*){1,4}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Ct|Court|Way|Pl|Place)\.?)\b/gi,
    mask: (v) => {
      // Partial mask: show house number + city context, mask street name
      // "123 Main Street" → "123 **** St"
      const numMatch = v.match(/^(\d{1,5})\s+/);
      const suffixMatch = v.match(/(St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Ct|Court|Way|Pl|Place)\.?$/i);
      const num = numMatch ? numMatch[1] : "***";
      const suffix = suffixMatch ? suffixMatch[1] : "St";
      return `${num} **** ${suffix}`;
    },
  },
];

export function scanTextForPII(text: string): RegexMatch[] {
  const matches: RegexMatch[] = [];

  for (const { type, pattern, mask } of PII_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Filter out bank account false positives (too short or common numbers)
      if (type === "Bank Account" && match[1].length < 10) continue;

      matches.push({
        type,
        value: match[1],
        maskedValue: mask(match[1]),
        index: match.index,
      });
    }
  }

  return matches;
}

export function hasPotentialPII(text: string): boolean {
  return scanTextForPII(text).length > 0;
}
