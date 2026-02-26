import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export type GeminiPIIResult = {
  hasPII: boolean;
  findings: GeminiFinding[];
  confidence: number;
  summary: string;
};

export type GeminiFinding = {
  type: string;
  location: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
};

const SCAN_PROMPT = `You are a PII (Personally Identifiable Information) scanner for a CPA firm's compliance tool.

Analyze the following document text for ANY personally identifiable information, including but not limited to:
- Social Security Numbers (SSN)
- Employer Identification Numbers (EIN)
- Bank account numbers
- Routing numbers
- Credit card numbers
- Dates of birth
- Phone numbers
- Email addresses
- Physical addresses
- Driver's license numbers
- Passport numbers
- Tax ID numbers
- Client names paired with financial data

Respond in JSON format ONLY:
{
  "hasPII": true/false,
  "findings": [
    {
      "type": "SSN|EIN|BankAccount|CreditCard|DOB|Phone|Email|Address|DriverLicense|Passport|TaxID|ClientFinancial|Other",
      "location": "description of where found (e.g., 'paragraph 3', 'near beginning')",
      "severity": "high|medium|low",
      "recommendation": "specific redaction recommendation"
    }
  ],
  "confidence": 0.0-1.0,
  "summary": "brief summary of findings"
}

Document text to analyze:
`;

const VERIFY_PROMPT = `You are a PII verification scanner. A document has been redacted. Verify that ALL personally identifiable information has been properly removed.

Check for:
1. Any remaining unredacted PII
2. Partial redactions that still reveal information
3. Contextual PII (names + financial data combinations)
4. Any patterns that could reconstruct redacted data

Respond in JSON format ONLY:
{
  "isClean": true/false,
  "remainingIssues": [
    {
      "type": "string",
      "location": "string",
      "detail": "string"
    }
  ],
  "confidence": 0.0-1.0
}

Document text to verify:
`;

export async function scanWithGemini(text: string): Promise<GeminiPIIResult> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Truncate very long documents to stay within token limits
  const truncated = text.length > 30000 ? text.slice(0, 30000) + "\n[TRUNCATED]" : text;

  const result = await model.generateContent(SCAN_PROMPT + truncated);
  const response = result.response;
  const responseText = response.text();

  // Extract JSON from potential markdown code blocks
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
  const parsed = JSON.parse(jsonMatch[1]!.trim());

  return {
    hasPII: parsed.hasPII ?? false,
    findings: parsed.findings ?? [],
    confidence: parsed.confidence ?? 0,
    summary: parsed.summary ?? "No analysis available",
  };
}

export async function verifyCleanDocument(text: string): Promise<{
  isClean: boolean;
  remainingIssues: { type: string; location: string; detail: string }[];
  confidence: number;
}> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const truncated = text.length > 30000 ? text.slice(0, 30000) + "\n[TRUNCATED]" : text;

  const result = await model.generateContent(VERIFY_PROMPT + truncated);
  const response = result.response;
  const responseText = response.text();

  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
  const parsed = JSON.parse(jsonMatch[1]!.trim());

  return {
    isClean: parsed.isClean ?? true,
    remainingIssues: parsed.remainingIssues ?? [],
    confidence: parsed.confidence ?? 0,
  };
}
