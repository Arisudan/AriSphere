-- Phase 6 - Multi-User Editorial Workflow & Approval System SQL Migration

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin','sub_editor')),
  avatar TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Trigger Function for Auto Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_username text;
  v_full_name text;
BEGIN
  -- Determine role and username based on email address
  IF new.email = 'editor@arisphere.com' THEN
    v_role := 'admin';
    v_username := 'arisudan';
    v_full_name := 'Arisudan';
  ELSIF new.email LIKE 'sub%@arisphere.com' THEN
    v_role := 'sub_editor';
    -- Extract email prefix for username (e.g. sub1@arisphere.com -> sub1)
    v_username := split_part(new.email, '@', 1);
    
    -- Special display name mapping for Sub Editor 1
    IF v_username = 'sub1' THEN
      v_full_name := 'Jamuna U';
    ELSE
      v_full_name := 'Sub Editor ' || substring(v_username from '[0-9]+');
    END IF;
  ELSE
    -- Generic fallback
    v_role := 'sub_editor';
    v_username := split_part(new.email, '@', 1);
    v_full_name := v_username;
  END IF;

  INSERT INTO public.profiles (id, email, username, role, full_name, avatar, created_at)
  VALUES (
    new.id,
    new.email,
    v_username,
    v_role,
    v_full_name,
    '/assets/images/author.png',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill Existing Admin Profile if exists in auth.users
INSERT INTO public.profiles (id, email, username, role, full_name, avatar, created_at)
SELECT 
  id, 
  email, 
  'arisudan', 
  'admin', 
  'Arisudan', 
  '/assets/images/author.png',
  now()
FROM auth.users 
WHERE email = 'editor@arisphere.com'
ON CONFLICT (id) DO NOTHING;

-- 4. Extend Articles Table with Workflow Columns & Constraints
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Drop check constraint if exists and add it
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check CHECK (status IN ('draft','pending','published'));

-- 5. Reassign all mock articles to Admin (arisudan)
UPDATE public.articles
SET author = 'arisudan'
WHERE author IN ('elenavance', 'marcusaurelius');

-- 6. Define Profiles RLS Policies
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to read all profiles" ON public.profiles;

CREATE POLICY "Allow users to read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow admins to read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 7. Define Articles RLS Policies
DROP POLICY IF EXISTS "Allow public read-only access to published articles" ON public.articles;
DROP POLICY IF EXISTS "Allow admin select" ON public.articles;
DROP POLICY IF EXISTS "Allow admin insert" ON public.articles;
DROP POLICY IF EXISTS "Allow admin update" ON public.articles;
DROP POLICY IF EXISTS "Allow admin delete" ON public.articles;
DROP POLICY IF EXISTS "Allow authenticated users to select all articles" ON public.articles;
DROP POLICY IF EXISTS "Allow inserts for admin and matching authors" ON public.articles;
DROP POLICY IF EXISTS "Allow updates for admin and matching authors" ON public.articles;
DROP POLICY IF EXISTS "Allow deletes for admin and matching authors" ON public.articles;

-- SELECT policies
CREATE POLICY "Allow public read-only access to published articles"
ON public.articles FOR SELECT TO anon
USING (status = 'published');

CREATE POLICY "Allow authenticated users to select all articles"
ON public.articles FOR SELECT TO authenticated
USING (true);

-- INSERT policies
CREATE POLICY "Allow inserts for admin and matching authors"
ON public.articles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR (
        profiles.username = author
        AND status IN ('draft', 'pending')
        AND COALESCE(featured, false) = false
        AND COALESCE(trending, false) = false
        AND COALESCE(trending_this_week, false) = false
        AND COALESCE(editors_pick, false) = false
      )
    )
  )
);

-- UPDATE policies
CREATE POLICY "Allow updates for admin and matching authors"
ON public.articles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR profiles.username = author
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR (
        profiles.username = author
        AND status IN ('draft', 'pending')
        AND COALESCE(featured, false) = false
        AND COALESCE(trending, false) = false
        AND COALESCE(trending_this_week, false) = false
        AND COALESCE(editors_pick, false) = false
      )
    )
  )
);

-- DELETE policies
CREATE POLICY "Allow deletes for admin and matching authors"
ON public.articles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR (
        profiles.username = author
        AND status IN ('draft', 'pending')
      )
    )
  )
);
