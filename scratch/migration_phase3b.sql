-- Migration Phase 3B: Human Review Verification Column
-- Adds human_reviewed boolean flag to public.articles

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS human_reviewed BOOLEAN DEFAULT false;

-- Update existing records to default to true (as they are already published)
UPDATE public.articles SET human_reviewed = true WHERE human_reviewed IS NULL;
