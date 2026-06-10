-- Migration SQL - AriSphere Phase 2A Integration
-- Executed on: 2026-06-10

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

UPDATE public.articles SET status = 'published';

CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE OR REPLACE FUNCTION public.increment_article_views(article_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.articles
  SET views = COALESCE(views, 0) + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS setup for articles
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access to articles" ON public.articles;
DROP POLICY IF EXISTS "Allow public read-only access to published articles" ON public.articles;
DROP POLICY IF EXISTS "Allow admin select" ON public.articles;
DROP POLICY IF EXISTS "Allow admin insert" ON public.articles;
DROP POLICY IF EXISTS "Allow admin update" ON public.articles;
DROP POLICY IF EXISTS "Allow admin delete" ON public.articles;

CREATE POLICY "Allow public read-only access to published articles" ON public.articles FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Allow admin select" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin insert" ON public.articles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin update" ON public.articles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin delete" ON public.articles FOR DELETE TO authenticated USING (true);

-- RLS setup for subscribers
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous subscriber inserts" ON public.subscribers;
DROP POLICY IF EXISTS "Allow admin subscriber inserts" ON public.subscribers;
DROP POLICY IF EXISTS "Allow admin select subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Allow admin delete subscribers" ON public.subscribers;

CREATE POLICY "Allow anonymous subscriber inserts" ON public.subscribers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow admin subscriber inserts" ON public.subscribers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin select subscribers" ON public.subscribers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin delete subscribers" ON public.subscribers FOR DELETE TO authenticated USING (true);

-- Grant privileges for table operations
GRANT INSERT ON public.subscribers TO anon;
GRANT INSERT ON public.subscribers TO authenticated;
GRANT SELECT, DELETE ON public.subscribers TO authenticated;
