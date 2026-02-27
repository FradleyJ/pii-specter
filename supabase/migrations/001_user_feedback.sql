-- ============================================
-- PII-Specter: User Feedback & Preferences
-- Run this in the Supabase SQL Editor
-- ============================================

-- Table: user_feedback
-- Stores per-finding feedback (true positive / false positive / exclusion)
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  -- What was detected
  finding_type TEXT NOT NULL,          -- e.g. "SSN", "Email Address", "Phone Number"
  pattern_hash TEXT,                   -- hash of the masked preview for matching
  raw_preview TEXT,                    -- the masked value e.g. "f***@gmail.com"
  -- User action
  action TEXT NOT NULL CHECK (action IN ('confirm', 'dismiss', 'exclude')),
  reason TEXT,                         -- "My own contact", "Public data", "Not PII", "Other"
  notes TEXT,                          -- free-form user notes
  apply_scope TEXT NOT NULL DEFAULT 'this' CHECK (apply_scope IN ('this', 'type', 'global')),
  -- Metadata
  scan_id UUID REFERENCES scan_results(id) ON DELETE SET NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups during scan suppression
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_lookup ON public.user_feedback(user_id, finding_type, action);
CREATE INDEX IF NOT EXISTS idx_user_feedback_pattern ON public.user_feedback(user_id, pattern_hash) WHERE pattern_hash IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid()::text = user_id OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Users can insert own feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Users can update own feedback"
  ON public.user_feedback FOR UPDATE
  USING (auth.uid()::text = user_id OR current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "Users can delete own feedback"
  ON public.user_feedback FOR DELETE
  USING (auth.uid()::text = user_id OR current_setting('request.jwt.claim.role', true) = 'service_role');

-- Function: Get user exclusions for scan suppression
-- Called during scan to check which findings should be suppressed
CREATE OR REPLACE FUNCTION public.get_user_exclusions(p_user_id TEXT)
RETURNS TABLE (
  finding_type TEXT,
  pattern_hash TEXT,
  raw_preview TEXT,
  apply_scope TEXT,
  reason TEXT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT finding_type, pattern_hash, raw_preview, apply_scope, reason
  FROM public.user_feedback
  WHERE user_id = p_user_id
    AND action IN ('dismiss', 'exclude')
  ORDER BY created_at DESC;
$$;

-- Function: Auto-cleanup scans older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_expired_scans(retention_days INT DEFAULT 30)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.scan_results
  WHERE scanned_at < now() - (retention_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function: Get feedback stats for a user (used in dashboard)
CREATE OR REPLACE FUNCTION public.get_feedback_stats(p_user_id TEXT)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'confirmed', COUNT(*) FILTER (WHERE action = 'confirm'),
    'dismissed', COUNT(*) FILTER (WHERE action = 'dismiss'),
    'excluded', COUNT(*) FILTER (WHERE action = 'exclude')
  )
  FROM public.user_feedback
  WHERE user_id = p_user_id;
$$;

-- Optional: Schedule auto-cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is enabled on your Supabase plan:
-- SELECT cron.schedule('cleanup-old-scans', '0 3 * * *',
--   $$SELECT public.cleanup_expired_scans(30)$$
-- );
