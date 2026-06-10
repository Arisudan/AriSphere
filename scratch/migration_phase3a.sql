-- Migration Phase 3A: Editorial Authority & Trust Signals
-- Adds trust indicators and citation sources to the articles table

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS fact_checked BOOLEAN DEFAULT true;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS editorially_reviewed BOOLEAN DEFAULT true;

-- Update existing records to ensure they have default values
UPDATE public.articles SET 
  fact_checked = COALESCE(fact_checked, true),
  editorially_reviewed = COALESCE(editorially_reviewed, true),
  sources = COALESCE(sources, '[]'::jsonb);
