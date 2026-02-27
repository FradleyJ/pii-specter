// ============================================
// Shared types for PII-Specter scan pipeline
// Single source of truth — imported by all components and API routes
// ============================================

export type PiiDetail = {
  type: string;
  value_preview: string; // masked preview e.g. "***-**-1234"
  location: string;      // e.g. "paragraph 3" or "cell B5"
};

export type SenderRiskInfo = {
  email: string;
  display_name?: string;
  is_owner: boolean;
  // P1 = envelope sender (Return-Path), P2 = header From
  p1_sender?: string;
  p2_sender?: string;
  p1_p2_match?: boolean;
  // Email authentication
  dmarc: "pass" | "fail" | "none" | "unknown";
  spf: "pass" | "fail" | "none" | "unknown";
  dkim: "pass" | "fail" | "none" | "unknown";
  // Communication analysis
  communication_count: number;
  direction: "internal" | "external" | "unknown";
  first_contact?: string;
  last_contact?: string;
  // Composite risk
  risk_score: number; // 0-100
  risk_label: "low" | "medium" | "high" | "critical";
};

export type ScanFinding = {
  file_id: string;
  file_name: string;
  file_type: "doc" | "sheet";
  pii_types: string[];
  pii_details: PiiDetail[];
  risk_level: "high" | "medium" | "low";
  redacted: boolean;
  verified_clean: boolean;
  // Owner / sharing metadata
  owner_email?: string;
  owner_name?: string;
  shared_by?: string[];
  last_modified_by?: string;
  // Sender risk analysis
  sender_risk?: SenderRiskInfo;
  // User feedback status
  feedback_status?: "confirmed" | "dismissed" | "excluded" | "informational";
};

export type ScanResult = {
  scan_id: string;
  total_files: number;
  files_with_pii: number;
  all_clean: boolean;
  findings: ScanFinding[];
  can_redact: boolean;
};

export type StoredScan = {
  id: string;
  user_id: string;
  user_email: string;
  scanned_at: string;
  total_files: number;
  files_with_pii: number;
  all_clean: boolean;
  findings: ScanFinding[];
};

// --- Feedback types ---

export type FeedbackAction = "confirm" | "dismiss" | "exclude";
export type FeedbackScope = "this" | "type" | "global";

export type UserFeedback = {
  id?: string;
  user_id: string;
  finding_type: string;
  pattern_hash?: string;
  raw_preview?: string;
  action: FeedbackAction;
  reason?: string;
  notes?: string;
  apply_scope: FeedbackScope;
  scan_id?: string;
  file_name?: string;
  created_at?: string;
};

export type UserExclusion = {
  finding_type: string;
  pattern_hash?: string;
  raw_preview?: string;
  apply_scope: FeedbackScope;
  reason?: string;
};

// --- Summary/aggregation types ---

export type PiiCategorySummary = {
  type: string;
  count: number;
  file_count: number;
  severity: "high" | "medium" | "low";
};

export type ScanSummary = {
  total_findings: number;
  total_groups: number;
  by_risk: { high: number; medium: number; low: number };
  by_category: PiiCategorySummary[];
};

// Canonical PII type names — all variants should map to these
export const PII_TYPE_ALIASES: Record<string, string> = {
  // Gemini camelCase → canonical
  CreditCard: "Credit Card",
  BankAccount: "Bank Account",
  RoutingNumber: "Routing Number",
  DOB: "Date of Birth",
  DateOfBirth: "Date of Birth",
  Phone: "Phone Number",
  PhoneNumber: "Phone Number",
  Email: "Email Address",
  EmailAddress: "Email Address",
  Address: "Street Address",
  StreetAddress: "Street Address",
  DriverLicense: "Driver's License",
  DriversLicense: "Driver's License",
  "Drivers License": "Driver's License",
  "Driver License": "Driver's License",
  TaxID: "Tax ID",
  "Tax ID Number": "Tax ID",
  Passport: "Passport",
  "Passport Number": "Passport",
  ClientFinancial: "Client Financial",
  // Already canonical — identity mappings not needed
};

/** Normalize a PII type string to its canonical form */
export function normalizePiiType(type: string): string {
  return PII_TYPE_ALIASES[type] || type;
}

// PII type severity mapping (canonical names)
export const PII_SEVERITY: Record<string, "high" | "medium" | "low"> = {
  SSN: "high",
  EIN: "high",
  "Credit Card": "high",
  "Bank Account": "high",
  "Routing Number": "high",
  "Tax ID": "high",
  Passport: "high",
  "Driver's License": "high",
  "Date of Birth": "medium",
  "Phone Number": "medium",
  "Email Address": "medium",
  "Street Address": "medium",
  "Client Financial": "medium",
  Other: "low",
};

// PII type icons (lucide icon names)
export const PII_ICONS: Record<string, string> = {
  SSN: "fingerprint",
  EIN: "building",
  "Credit Card": "credit-card",
  "Bank Account": "landmark",
  "Routing Number": "landmark",
  "Tax ID": "fingerprint",
  Passport: "book-open",
  "Driver's License": "id-card",
  "Date of Birth": "calendar",
  "Phone Number": "phone",
  "Email Address": "mail",
  "Street Address": "map-pin",
  "Client Financial": "dollar-sign",
  Other: "file-question",
};
