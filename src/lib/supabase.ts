import { createClient } from "@supabase/supabase-js";

export type ScanResult = {
  id?: string;
  user_id: string;
  user_email: string;
  scanned_at: string;
  total_files: number;
  files_with_pii: number;
  all_clean: boolean;
  findings: ScanFinding[];
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
};

export type PiiDetail = {
  type: string;
  value_preview: string; // masked preview e.g. "***-**-1234"
  location: string; // e.g. "paragraph 3" or "cell B5"
};

// Server-side client with service role key
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Client-side client with anon key
export function createBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function saveScanResult(result: ScanResult) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scan_results")
    .insert({
      user_id: result.user_id,
      user_email: result.user_email,
      scanned_at: result.scanned_at,
      total_files: result.total_files,
      files_with_pii: result.files_with_pii,
      all_clean: result.all_clean,
      findings: result.findings,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestScan(userId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", userId)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data as ScanResult | null;
}

export async function updateFindingRedacted(
  scanId: string,
  fileId: string
) {
  const supabase = createServerSupabase();
  // Fetch current scan
  const { data: scan, error: fetchErr } = await supabase
    .from("scan_results")
    .select("findings")
    .eq("id", scanId)
    .single();

  if (fetchErr) throw fetchErr;

  const findings = (scan.findings as ScanFinding[]).map((f) =>
    f.file_id === fileId ? { ...f, redacted: true } : f
  );

  const allClean = findings.every((f) => f.redacted || f.pii_types.length === 0);

  const { error: updateErr } = await supabase
    .from("scan_results")
    .update({ findings, all_clean: allClean })
    .eq("id", scanId);

  if (updateErr) throw updateErr;
  return { findings, allClean };
}
