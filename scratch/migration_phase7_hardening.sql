-- migration_phase7_hardening.sql
-- Phase 7: Database Optimization, Content Operations & Security Hardening

-- 1. Create Analytics Table
CREATE TABLE IF NOT EXISTS public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER REFERENCES public.articles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Analytics
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on analytics" ON public.analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin select on analytics" ON public.analytics
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Create Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Rate Limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on rate_limits" ON public.rate_limits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous select on rate_limits" ON public.rate_limits
  FOR SELECT WITH CHECK (true);

-- 3. Add Scheduled Publish and Premium columns to Articles
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT false;

-- 4. Create Article Versions Table (Revision History)
CREATE TABLE IF NOT EXISTS public.article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER REFERENCES public.articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  editor_username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Article Versions
ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select on versions" ON public.article_versions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on versions" ON public.article_versions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5. Create Editorial Comments Table
CREATE TABLE IF NOT EXISTS public.editorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id INTEGER REFERENCES public.articles(id) ON DELETE CASCADE,
  author_username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Editorial Comments
ALTER TABLE public.editorial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select on comments" ON public.editorial_comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on comments" ON public.editorial_comments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 6. Database Optimization - Add Indexes
CREATE INDEX IF NOT EXISTS idx_articles_status_publish_date ON public.articles(status, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_author ON public.articles(author);
CREATE INDEX IF NOT EXISTS idx_articles_views ON public.articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_analytics_article_id ON public.analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_hash_timestamp ON public.rate_limits(ip_hash, timestamp);

-- 7. Secure Subscribers Table RLS Policies
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.subscribers;
DROP POLICY IF EXISTS "Allow admin select" ON public.subscribers;
DROP POLICY IF EXISTS "Allow admin delete" ON public.subscribers;

CREATE POLICY "Allow anonymous insert" ON public.subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin select" ON public.subscribers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow admin delete" ON public.subscribers
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
