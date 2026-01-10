-- Create user_reports table to track user reports
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reporter_id, reported_id) -- Prevent duplicate reports from same reporter to same user
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_id ON public.user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reason ON public.user_reports(reason);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON public.user_reports(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports (reports they made)
CREATE POLICY "Users can view their own reports"
ON public.user_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
ON public.user_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.user_reports
FOR UPDATE
USING (auth.uid() = reporter_id)
WITH CHECK (auth.uid() = reporter_id);

-- Add comment
COMMENT ON TABLE public.user_reports IS 'Tracks user reports with reason and optional details';

