const fs = require('fs');
const path = require('path');

// Mock window to load db.js
const window = {
  location: { origin: 'http://localhost:3000' }
};

const dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
const runDb = new Function('window', 'fetch', 'console', dbCode);
runDb(window, () => {}, console);

const ARTICLES = window.AriSphereDB.ARTICLES;

console.log(`Loaded ${ARTICLES.length} articles from local database.`);

// Generate SQL statements
let sql = `
-- Drop table if exists
DROP TABLE IF EXISTS public.articles;

-- Create articles table
CREATE TABLE public.articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT,
  category TEXT,
  author TEXT,
  publish_date TEXT,
  read_time TEXT,
  image_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT false,
  trending BOOLEAN DEFAULT false,
  trending_this_week BOOLEAN DEFAULT false,
  editors_pick BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for anonymous users
CREATE POLICY "Allow public read-only access to articles"
ON public.articles
FOR SELECT
TO anon
USING (true);

-- Populate articles data
`;

for (let art of ARTICLES) {
  const title = escapeSql(art.title);
  const subtitle = escapeSql(art.subtitle);
  const excerpt = escapeSql(art.excerpt);
  const content = escapeSql(art.content);
  const category = escapeSql(art.category);
  const author = escapeSql(art.author);
  const publishDate = escapeSql(art.publishDate);
  const readTime = escapeSql(art.readTime);
  const image = escapeSql(art.image);
  const tagsJson = JSON.stringify(art.tags);
  const featured = art.featured ? 'true' : 'false';
  const trending = art.trending ? 'true' : 'false';
  const trendingThisWeek = art.trendingThisWeek ? 'true' : 'false';
  const editorsPick = art.editorsPick ? 'true' : 'false';
  const views = art.views || 0;

  sql += `
INSERT INTO public.articles (
  id, title, subtitle, excerpt, content, category, author, publish_date, read_time, image_url, tags, featured, trending, trending_this_week, editors_pick, views
) VALUES (
  ${art.id}, '${title}', '${subtitle}', '${excerpt}', '${content}', '${category}', '${author}', '${publishDate}', '${readTime}', '${image}', '${escapeSql(tagsJson)}'::jsonb, ${featured}, ${trending}, ${trendingThisWeek}, ${editorsPick}, ${views}
);
`;
}

// Set serial sequence value to prevent conflicts on future inserts
sql += `\nSELECT setval('public.articles_id_seq', (SELECT MAX(id) FROM public.articles));\n`;

fs.writeFileSync(path.join(__dirname, 'migration.sql'), sql, 'utf8');
console.log('Migration SQL generated at scratch/migration.sql successfully.');

function escapeSql(str) {
  if (str === null || str === undefined) return '';
  return str.replace(/'/g, "''");
}
