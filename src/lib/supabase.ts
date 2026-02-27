import { createClient } from "@supabase/supabase-js";
import type { ScanFinding, UserExclusion, UserFeedback } from "@/types/scan";

// Re-export types for backward compatibility
export type { ScanFinding, UserExclusion, UserFeedback };
export type { PiiDetail } from "@/types/scan";

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

  if (error && error.code !== "PGRST116") throw error;
  return data as ScanResult | null;
}

export async function getScanHistory(userId: string, limit = 10) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scan_results")
    .select("*")
    .eq("user_id", userId)
    .order("scanned_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ScanResult[];
}

export async function deleteExpiredScans(retentionDays = 30) {
  const supabase = createServerSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const { error, count } = await supabase
    .from("scan_results")
    .delete({ count: "exact" })
    .lt("scanned_at", cutoff.toISOString());

  if (error) throw error;
  return count || 0;
}

export async function updateFindingRedacted(scanId: string, fileId: string) {
  const supabase = createServerSupabase();
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

// --- User feedback / exclusions ---

export async function saveUserFeedback(feedback: UserFeedback) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("user_feedback")
    .insert({
      user_id: feedback.user_id,
      finding_type: feedback.finding_type,
      pattern_hash: feedback.pattern_hash,
      raw_preview: feedback.raw_preview,
      action: feedback.action,
      reason: feedback.reason,
      notes: feedback.notes,
      apply_scope: feedback.apply_scope,
      scan_id: feedback.scan_id,
      file_name: feedback.file_name,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserExclusions(userId: string): Promise<UserExclusion[]> {
  const supabase = createServerSupabase();

  // Try the RPC function first (if migration has been run)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc("get_user_exclusions", { p_user_id: userId });

  if (!rpcError && rpcData) {
    return rpcData as UserExclusion[];
  }

  // Fallback: direct table query
  const { data, error } = await supabase
    .from("user_feedback")
    .select("finding_type, pattern_hash, raw_preview, apply_scope, reason")
    .eq("user_id", userId)
    .in("action", ["dismiss", "exclude"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as UserExclusion[];
}

export async function getUserFeedbackForScan(userId: string, scanId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("user_feedback")
    .select("*")
    .eq("user_id", userId)
    .eq("scan_id", scanId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as UserFeedback[];
}

export async function deleteUserFeedback(feedbackId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("user_feedback")
    .delete()
    .eq("id", feedbackId);

  if (error) throw error;
}
