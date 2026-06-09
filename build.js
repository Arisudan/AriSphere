/**
 * AriSphere Version 2 - Static Site Generator (SSG) & Sitemap Compiler
 * This script runs at build time (e.g., on Vercel) to generate pre-rendered flat HTML views,
 * a dynamic sitemap.xml, and updated robots.txt from the active database/CMS.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://arisphere.vercel.app';
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
  const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const dbCode = fs.readFileSync(path.join(__dirname, 'js', 'db.js'), 'utf8');
  const routerCode = fs.readFileSync(path.join(__dirname, 'js', 'router.js'), 'utf8');
  
  // 3. Load DB in a mock Node environment to inspect paths
  console.log('Loading database content schema...');
  const mockWindow = { location: { origin: SITE_URL } };
  const dbModule = new Function('window', 'fetch', 'console', dbCode);
  dbModule(mockWindow, async () => ({ ok: false }), console);
  const db = mockWindow.AriSphereDB;
  
  if (!db) {
    console.error('Error: Could not evaluate AriSphereDB locally.');
    process.exit(1);
  }
  
  console.log(`Database loaded: ${db.ARTICLES.length} articles, ${Object.keys(db.CATEGORIES).length} categories found.`);
  
  // 4. Compile dynamic URL lists
  const pathsToRender = [
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/disclaimer',
    '/terms',
    '/editorial-policy'
  ];
  
  // Add category paths
  Object.keys(db.CATEGORIES).forEach(catId => {
    pathsToRender.push(`/category/${catId}`);
  });
  
  // Add author paths
  Object.keys(db.AUTHORS).forEach(username => {
    pathsToRender.push(`/author/${username}`);
  });
  
  // Add article paths
  db.ARTICLES.forEach(art => {
    pathsToRender.push(`/article/${art.id}`);
  });
  
  console.log(`Compiled ${pathsToRender.length} URLs to pre-render.`);
  
  // 5. Setup JSDOM shell to execute routing in memory
  const dom = new JSDOM(indexHtml, {
    url: `${SITE_URL}/`,
    runScripts: 'outside-only'
  });
  
  // Setup JSDOM window mocks
  dom.window.fetch = async () => ({ ok: false });
  dom.window.scrollTo = () => {};
  dom.window.AriSphereDB = db; // Bind pre-evaluated db
  
  // Evaluate the router script inside JSDOM to bind routes and event listeners
  dom.window.eval(routerCode);
  
  // Trigger DOMContentLoaded inside JSDOM to initial state the routing dispatch
  dom.window.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  
  // 6. Iterate and render each path
  for (let routePath of pathsToRender) {
    console.log(`Pre-rendering: ${routePath}`);
    
    // Set current pathname in JSDOM via history state and trigger route listener
    dom.window.history.pushState(null, '', routePath);
    dom.window.dispatchEvent(new dom.window.Event('popstate'));
    
    // Wait for the transition delay and rendering tasks to complete
    await sleep(350);
    
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
  
  // 7. Generate Dynamic sitemap.xml
  console.log('Generating dynamic sitemap.xml...');
  let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
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

  <!-- Categories -->
  ${Object.keys(db.CATEGORIES).map(catId => `  <url>
    <loc>${SITE_URL}/category/${catId}</loc>
    <changefreq>daily</changefreq>
    <priority>0.80</priority>
  </url>`).join('\n')}

  <!-- Legal & Policies -->
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

  <!-- Publications (${db.ARTICLES.length} Articles) -->
  ${db.ARTICLES.map(art => `  <url><loc>${SITE_URL}/article/${art.id}</loc><changefreq>weekly</changefreq><priority>0.90</priority></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXML, 'utf8');
  console.log('Dynamic sitemap.xml generated.');

  // 8. Generate robots.txt
  console.log('Writing robots.txt...');
  const robotsTxt = `# Robots.txt - Search Engine Crawler directives for AriSphere
User-agent: *
Allow: /

# Sitemap Target
Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
  console.log('robots.txt generated.');

  // 9. Copy assets and script resources to output directory
  console.log('Copying static resources to build folder...');
  copyDir(path.join(__dirname, 'css'), path.join(DIST_DIR, 'css'));
  copyDir(path.join(__dirname, 'js'), path.join(DIST_DIR, 'js'));
  copyDir(path.join(__dirname, 'assets'), path.join(DIST_DIR, 'assets'));
  
  // Copy vercel.json configuration
  fs.copyFileSync(path.join(__dirname, 'vercel.json'), path.join(DIST_DIR, 'vercel.json'));
  
  console.log('--- ARISPHERE STATIC BUILD SUCCESSFUL ---');
}

runBuild().catch(err => {
  console.error('Fatal: Static Site Build Compiler crashed:', err);
  process.exit(1);
});
