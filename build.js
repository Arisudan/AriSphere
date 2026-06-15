/**
 * AriSphere Version 2 - Static Site Generator (SSG) & Sitemap Compiler
 * This script runs at build time (e.g., on Vercel) to generate pre-rendered flat HTML views,
 * a dynamic sitemap.xml, and updated robots.txt from the active database/CMS.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://ari-sphere.vercel.app';
const DIST_DIR = path.join(__dirname, 'dist');

// Delay helper (allows router setTimeout transition to finish)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Recursive directory copy helper
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Ignore node_modules and build-output folders
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function runBuild() {
  console.log('--- starting ARISPHERE VERSION 2 STATIC COMPILER ---');
  console.log(`Site URL target: ${SITE_URL}`);
  
  // 1. Clean and recreate the build output directory
  if (fs.existsSync(DIST_DIR)) {
    console.log('Cleaning existing dist directory...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR);
  
  // 2. Read template HTML file and code dependencies
  let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  let dbCode = fs.readFileSync(path.join(__dirname, 'js', 'db.js'), 'utf8');
  let routerCode = fs.readFileSync(path.join(__dirname, 'js', 'router.js'), 'utf8');
  let appCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  
  // Inject Supabase environment keys in-memory for compile-time database evaluations
  const envSupabaseUrl = process.env.SUPABASE_URL || '';
  const envSupabaseKey = process.env.SUPABASE_KEY || '';
  if (envSupabaseUrl && envSupabaseKey) {
    dbCode = dbCode.replace('https://YOUR_SUPABASE_PROJECT_URL.supabase.co', envSupabaseUrl);
    dbCode = dbCode.replace('YOUR_SUPABASE_ANON_KEY_HERE', envSupabaseKey);
  }

  // Inject Google Site Verification and Google Analytics IDs from environment
  const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION || '';
  const gaMeasurementId = process.env.GA_MEASUREMENT_ID || '';
  
  if (googleSiteVerification) {
    indexHtml = indexHtml.replace('GSC_VERIFICATION_TOKEN_placeholder', googleSiteVerification);
  }
  if (gaMeasurementId) {
    indexHtml = indexHtml.replaceAll('G-GA_MEASUREMENT_ID', gaMeasurementId);
    indexHtml = indexHtml.replaceAll('G-HF1HR2DWQZ', gaMeasurementId);
    routerCode = routerCode.replaceAll('G-GA_MEASUREMENT_ID', gaMeasurementId);
    routerCode = routerCode.replaceAll('G-HF1HR2DWQZ', gaMeasurementId);
    appCode = appCode.replaceAll('G-GA_MEASUREMENT_ID', gaMeasurementId);
    appCode = appCode.replaceAll('G-HF1HR2DWQZ', gaMeasurementId);
  }
  
  // 3. Load DB in a mock Node environment to inspect paths
  console.log('Loading database content schema...');
  const mockWindow = { location: { origin: SITE_URL } };
  const dbModule = new Function('window', 'fetch', 'console', dbCode);
  
  // Wrap fetch to support Node environment safety and enable live Supabase querying during compilation
  const fetchWrapper = async (url, options) => {
    try {
      if (typeof fetch === 'function') {
        return await fetch(url, options);
      }
    } catch (err) {
      console.warn(`SSG fetch warning for ${url}:`, err.message);
    }
    return { ok: false, statusText: 'Fetch unavailable or failed' };
  };
  
  dbModule(mockWindow, fetchWrapper, console);
  const db = mockWindow.AriSphereDB;
  
  if (!db) {
    console.error('Error: Could not evaluate AriSphereDB locally.');
    process.exit(1);
  }
  
  // Fetch active articles list (either live from Supabase or fallback local ones)
  console.log('Fetching active articles from database/CMS...');
  let activeArticles = [];
  try {
    activeArticles = await db.getLatestArticles(1000, false);
  } catch (err) {
    console.warn('Failed to retrieve articles via DB query wrapper, using local ARTICLES fallback.', err);
    activeArticles = db.ARTICLES;
  }

  // Strict Published Content Filters (Task 10)
  activeArticles = activeArticles.filter(art => (art.status || 'published') === 'published');

  const publishedCategories = new Set(activeArticles.map(art => art.category));
  const publishedAuthors = new Set(activeArticles.map(art => art.author));
  
  console.log(`Database loaded: ${activeArticles.length} published articles, ${publishedCategories.size} active categories, ${publishedAuthors.size} active authors found.`);
  
  // 4. Compile dynamic URL lists
  const pathsToRender = [
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/disclaimer',
    '/terms',
    '/editorial-policy',
    '/admin' // Pre-render admin workspace static skeleton
  ];
  
  // Add category paths (only categories with published articles)
  Object.keys(db.CATEGORIES).filter(catId => publishedCategories.has(catId)).forEach(catId => {
    pathsToRender.push(`/category/${catId}`);
  });
  
  // Add author paths (only authors with published articles)
  Object.keys(db.AUTHORS).filter(username => publishedAuthors.has(username)).forEach(username => {
    pathsToRender.push(`/author/${username}`);
  });
  
  // Add article paths (only published articles are returned in activeArticles)
  activeArticles.forEach(art => {
    pathsToRender.push(`/article/${art.id}`);
  });
  
  console.log(`Compiled ${pathsToRender.length} URLs to pre-render.`);
  
  // 5. Setup JSDOM shell to execute routing in memory
  const dom = new JSDOM(indexHtml, {
    url: `${SITE_URL}/`,
    runScripts: 'outside-only'
  });
  
  // Setup JSDOM window mocks
  dom.window.fetch = fetchWrapper; // Enable routing functions to use fetch wrapper if needed
  dom.window.scrollTo = () => {};
  dom.window.DOMPurify = { sanitize: (s) => s }; // Mock DOMPurify for pre-rendering environment (Phase 7)
  dom.window.AriSphereDB = db; // Bind pre-evaluated db
  
  // Evaluate the router script inside JSDOM to bind routes and event listeners
  dom.window.eval(routerCode);
  
  // 6. Iterate and render each path
  for (let routePath of pathsToRender) {
    console.log(`Pre-rendering: ${routePath}`);
    
    // Set current pathname in JSDOM via history state and trigger route listener
    dom.window.history.pushState(null, '', routePath);
    dom.window.dispatchEvent(new dom.window.Event('popstate'));
    
    // Wait for the transition delay and rendering tasks to complete (poll until fade-out is removed)
    let rendered = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      await sleep(100);
      const viewport = dom.window.document.getElementById('main-viewport');
      const classes = viewport ? Array.from(viewport.classList).join(' ') : 'NULL';
      const hasH1 = viewport && !!viewport.querySelector('h1');
      const h1Text = hasH1 ? viewport.querySelector('h1').textContent.trim().substring(0, 40) : 'NONE';
      console.log(`  [POLL DEBUG] Attempt ${attempt} | Classes: [${classes}] | Has H1: ${hasH1} | H1 Text: "${h1Text}"`);
      
      if (viewport && !viewport.classList.contains('fade-out') && (viewport.querySelector('h1') || viewport.querySelector('h2') || viewport.querySelector('main') || routePath === '/admin' || viewport.querySelector('form'))) {
        rendered = true;
        break;
      }
    }
    
    const vp = dom.window.document.getElementById('main-viewport');
    console.log(`[BUILD DEBUG] Path: ${routePath} | Rendered: ${rendered} | Viewport Length: ${vp ? vp.innerHTML.length : 'NULL'} | H1: ${vp && vp.querySelector('h1') ? vp.querySelector('h1').textContent : 'NONE'}`);

    if (!rendered) {
      console.warn(`Pre-rendering warning: path ${routePath} did not complete rendering within timeout.`);
    }
    
    // Retrieve JSDOM serialized output
    const serializedHTML = dom.serialize();
    
    // Determine write location
    let targetFilePath;
    if (routePath === '/') {
      targetFilePath = path.join(DIST_DIR, 'index.html');
    } else {
      const folderPath = path.join(DIST_DIR, routePath.replace(/^\//, ''));
      fs.mkdirSync(folderPath, { recursive: true });
      targetFilePath = path.join(folderPath, 'index.html');
    }
    
    fs.writeFileSync(targetFilePath, serializedHTML, 'utf8');
  }
  
  dom.window.close();
  console.log('Pre-rendering of HTML completed successfully.');
  
  // XML Escape Helper
  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // 7. Generate Dynamic rss.xml (Latest 20 published articles)
  console.log('Generating dynamic rss.xml...');
  const latestPublished = activeArticles
    .filter(art => (art.status || 'published') === 'published')
    .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
    .slice(0, 20);

  const rssXML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AriSphere</title>
    <link>${SITE_URL}</link>
    <description>Where Trends Meet Perspective</description>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${latestPublished.map(art => `    <item>
      <title>${escapeXml(art.title)}</title>
      <link>${SITE_URL}/article/${art.id}</link>
      <guid>${SITE_URL}/article/${art.id}</guid>
      <pubDate>${new Date(art.publishDate).toUTCString()}</pubDate>
      <description>${escapeXml(art.excerpt || '')}</description>
      <category>${escapeXml(db.CATEGORIES[art.category]?.name || art.category)}</category>
    </item>`).join('\n')}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(DIST_DIR, 'rss.xml'), rssXML, 'utf8');
  console.log('Dynamic rss.xml generated.');

  // 8. Generate Dynamic sitemap-articles.xml (Core Views & Articles)
  console.log('Generating dynamic sitemap-articles.xml...');
  const sitemapArticlesXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Views -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.80</priority>
  </url>
  <url>
    <loc>${SITE_URL}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.70</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>${SITE_URL}/disclaimer</loc>
    <changefreq>yearly</changefreq>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.50</priority>
  </url>
  <url>
    <loc>${SITE_URL}/editorial-policy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.50</priority>
  </url>

  <!-- Publications (${activeArticles.length} Published Articles) -->
  ${activeArticles.map(art => `  <url><loc>${SITE_URL}/article/${art.id}</loc><changefreq>weekly</changefreq><priority>0.90</priority></url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-articles.xml'), sitemapArticlesXML, 'utf8');
  console.log('Dynamic sitemap-articles.xml generated.');

  // 8b. Generate Google News Sitemap (sitemap-news.xml)
  console.log('Generating dynamic sitemap-news.xml...');
  const now = new Date();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  let newsArticles = activeArticles.filter(art => {
    const pubDate = new Date(art.publishDate);
    return pubDate >= fortyEightHoursAgo;
  });
  if (newsArticles.length === 0) {
    newsArticles = activeArticles
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 3);
  }
  const sitemapNewsXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${newsArticles.map(art => `  <url>
    <loc>${SITE_URL}/article/${art.id}</loc>
    <news:news>
      <news:publication>
        <news:name>AriSphere</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(art.publishDate).toISOString()}</news:publication_date>
      <news:title>${escapeXml(art.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-news.xml'), sitemapNewsXML, 'utf8');
  console.log('Dynamic sitemap-news.xml generated.');

  // 8c. Generate Master Sitemap Index (sitemap.xml)
  console.log('Generating master sitemap.xml sitemapindex...');
  const sitemapIndexXML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-articles.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-news.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-categories.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-authors.xml</loc>
  </sitemap>
</sitemapindex>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapIndexXML, 'utf8');
  console.log('Master sitemap.xml sitemapindex generated.');

  // 9. Generate Dynamic sitemap-categories.xml
  console.log('Generating dynamic sitemap-categories.xml...');
  const categoryXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${Object.keys(db.CATEGORIES).filter(catId => publishedCategories.has(catId)).map(catId => `  <url>
    <loc>${SITE_URL}/category/${catId}</loc>
    <changefreq>daily</changefreq>
    <priority>0.80</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-categories.xml'), categoryXML, 'utf8');
  console.log('Dynamic sitemap-categories.xml generated.');

  // 10. Generate Dynamic sitemap-authors.xml
  console.log('Generating dynamic sitemap-authors.xml...');
  const authorXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${Object.keys(db.AUTHORS).filter(username => publishedAuthors.has(username)).map(username => `  <url>
    <loc>${SITE_URL}/author/${username}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.70</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap-authors.xml'), authorXML, 'utf8');
  console.log('Dynamic sitemap-authors.xml generated.');

  // 11. Generate robots.txt
  console.log('Writing robots.txt...');
  const robotsTxt = `# Robots.txt - Search Engine Crawler directives for AriSphere
User-agent: *
Allow: /

# Sitemap Target (Master Index)
Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
  console.log('robots.txt generated.');

  // 9. Copy assets and script resources to output directory
  console.log('Copying static resources to build folder...');
  copyDir(path.join(__dirname, 'css'), path.join(DIST_DIR, 'css'));
  copyDir(path.join(__dirname, 'js'), path.join(DIST_DIR, 'js'));
  copyDir(path.join(__dirname, 'assets'), path.join(DIST_DIR, 'assets'));
  
  // Overwrite compiled js/db.js, js/router.js, and js/app.js with the injected versions
  fs.writeFileSync(path.join(DIST_DIR, 'js', 'db.js'), dbCode, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'js', 'router.js'), routerCode, 'utf8');
  fs.writeFileSync(path.join(DIST_DIR, 'js', 'app.js'), appCode, 'utf8');
  console.log('API credentials successfully injected into compiled assets.');
  
  // Copy vercel.json configuration
  fs.copyFileSync(path.join(__dirname, 'vercel.json'), path.join(DIST_DIR, 'vercel.json'));
  
  // Copy manifest.json and sw.js configuration (PWA support)
  if (fs.existsSync(path.join(__dirname, 'manifest.json'))) {
    fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));
  }
  if (fs.existsSync(path.join(__dirname, 'sw.js'))) {
    fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(DIST_DIR, 'sw.js'));
  }

  // Copy Google verification HTML files and ads.txt to dist
  const rootFiles = fs.readdirSync(__dirname);
  for (const file of rootFiles) {
    if ((file.startsWith('google') && file.endsWith('.html')) || file === 'ads.txt') {
      fs.copyFileSync(path.join(__dirname, file), path.join(DIST_DIR, file));
      console.log(`Copied verification/ads.txt file to dist: ${file}`);
    }
  }

  // 12. Run Orphan Article Auditor (Task 9)
  console.log('Running compile-time Orphan Article Auditor...');
  try {
    const orphanReportRows = [];
    const recommendationMap = {};

    // First compute recommendations for all active articles
    for (const art of activeArticles) {
      const related = await db.getRelatedArticles(art.id, 5);
      recommendationMap[art.id] = (related || []).map(r => String(r.id));
    }

    for (const art of activeArticles) {
      const recs = activeArticles.filter(o => String(o.id) !== String(art.id) && recommendationMap[o.id].includes(String(art.id)));
      const linkRegex = new RegExp(`href=["']\\/article\\/${art.id}["']`, 'i');
      const links = activeArticles.filter(o => String(o.id) !== String(art.id) && linkRegex.test(o.content || ''));
      const catValid = !!db.CATEGORIES[art.category];

      const reasons = [];
      if (recs.length === 0) reasons.push("No incoming recommendations");
      if (links.length === 0) reasons.push("No internal links in other articles");
      if (!catValid) reasons.push(`Category '${art.category}' not referenced/valid`);

      if (reasons.length > 0) {
        orphanReportRows.push({
          id: art.id,
          title: art.title,
          category: art.category,
          reasons: reasons,
          recommendations: `
- Add internal links to this article from relevant articles in the same category or related topics.
- Update tags to match other popular articles to trigger the recommendation engine.
- Ensure the article belongs to a valid, active category with category navigation links.
          `.trim()
        });
      }
    }

    let reportMarkdown = `# AriSphere Orphan Article Audit Report\n\n`;
    reportMarkdown += `Generated on: ${new Date().toLocaleDateString('en-US')}\n\n`;
    reportMarkdown += `This compile-time audit detects published articles that lack sufficient incoming traversal paths (internal links, recommendation widget appearances, or active category definitions). Resolving these issues improves Google crawl efficiency and AdSense compliance.\n\n`;
    reportMarkdown += `## Orphan Articles Summary\n\n`;
    
    if (orphanReportRows.length === 0) {
      reportMarkdown += `✓ No orphan articles detected! All published articles are well-linked.\n`;
    } else {
      reportMarkdown += `| Article ID | Title | Reasons for Orphan Status | Actionable Recommendations |\n`;
      reportMarkdown += `|---|---|---|---|\n`;
      orphanReportRows.forEach(row => {
        reportMarkdown += `| ${row.id} | ${row.title} | ${row.reasons.join(', ')} | ${row.recommendations.replace(/\n/g, '<br>')} |\n`;
      });
    }

    fs.writeFileSync(path.join(__dirname, 'orphan_report.md'), reportMarkdown, 'utf8');
    fs.writeFileSync(path.join(DIST_DIR, 'orphan_report.md'), reportMarkdown, 'utf8');

    // Also write to brain artifact directory if accessible
    const brainDir = 'C:\\Users\\Thirumurugan K\\.gemini\\antigravity-ide\\brain\\393a6145-ee33-49b8-8a66-a1d769f737c8';
    if (fs.existsSync(brainDir)) {
      fs.writeFileSync(path.join(brainDir, 'orphan_report.md'), reportMarkdown, 'utf8');
      console.log('Orphan report copied to brain artifact directory.');
    }
    console.log(`Orphan Article Auditor completed. Generated orphan_report.md with ${orphanReportRows.length} issues.`);
  } catch (err) {
    console.error('Failed to run Orphan Article Auditor:', err);
  }
  
  console.log('--- ARISPHERE STATIC BUILD SUCCESSFUL ---');
}

runBuild().catch(err => {
  console.error('Fatal: Static Site Build Compiler crashed:', err);
  process.exit(1);
});
