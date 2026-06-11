const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIST_DIR = path.join(__dirname, '..', 'dist');

function checkFiles(dir, relativePath = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const rel = path.join(relativePath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      checkFiles(fullPath, rel);
    } else if (file === 'index.html') {
      const html = fs.readFileSync(fullPath, 'utf8');
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const viewport = doc.getElementById('main-viewport');
      const hasSpinner = viewport && viewport.querySelector('svg circle') && !viewport.querySelector('h1') && !viewport.querySelector('h2');
      console.log(`File: ${rel.padEnd(40)} | Has Spinner Only: ${hasSpinner ? '❌ YES' : '✔ NO'}`);
    }
  }
}

checkFiles(DIST_DIR);
