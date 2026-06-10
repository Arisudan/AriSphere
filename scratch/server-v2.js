/**
 * AriSphere Version 2 - Local Express Validation Server
 * Replicates the routing and rewrite logic of Vercel locally.
 * Serves the compiled 'dist' output if it exists; otherwise serves from the source root.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine if we should serve from the compiled 'dist' directory or the development root
const distPath = path.join(__dirname, '..', 'dist');
const useDist = fs.existsSync(distPath);
const publicDirectory = useDist ? distPath : path.join(__dirname, '..');

console.log(`\nInitializing local server...`);
console.log(`Serving assets from: ${publicDirectory} [Mode: ${useDist ? 'PRODUCTION (dist)' : 'DEVELOPMENT (source root)'}]`);

app.use(express.json());

// API Routes
const subscribeHandler = require('../api/subscribe');
app.post('/api/subscribe', subscribeHandler);

// Serve static assets (js, css, images, sitemap, robots, etc.) directly if they exist
app.use(express.static(publicDirectory, {
  extensions: ['html'], // Allow omitting .html suffix
}));

// Route handler: Intercept all clean path requests and rewrite them to index.html
app.get('*', (req, res, next) => {
  // Ignore request if it points to an asset that wasn't found (extensions that are not web pages)
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return res.status(404).send('Asset not found');
  }

  // Rewrite to index.html (client-side router will take over navigation matching)
  const indexFile = path.join(publicDirectory, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('index.html not found. Please run the build script or verify paths.');
  }
});

app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`AriSphere V2 Server running at http://localhost:${PORT}`);
  console.log(`Testing clean SEO URLs (e.g. http://localhost:${PORT}/article/1)`);
  console.log(`Press Ctrl+C to terminate server`);
  console.log(`=================================================\n`);
});
