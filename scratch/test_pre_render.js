const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SITE_URL = 'https://arisphere.vercel.app';
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let dbCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8');
const routerCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'router.js'), 'utf8');

const mockWindow = { location: { origin: SITE_URL } };
const dbModule = new Function('window', 'fetch', 'console', dbCode);
dbModule(mockWindow, async () => ({ ok: false }), console);
const db = mockWindow.AriSphereDB;

const dom = new JSDOM(indexHtml, {
  url: `${SITE_URL}/`,
  runScripts: 'outside-only'
});

dom.window.fetch = async () => ({ ok: false });
dom.window.scrollTo = () => {};
dom.window.AriSphereDB = db;

// Capture console logs from inside JSDOM
dom.window.console.log = (...args) => console.log('[JSDOM LOG]', ...args);
dom.window.console.warn = (...args) => console.warn('[JSDOM WARN]', ...args);
dom.window.console.error = (...args) => console.error('[JSDOM ERROR]', ...args);

dom.window.eval(routerCode);

async function runTest() {
  console.log('--- Triggering popstate for author path /author/arisudan ---');
  dom.window.history.pushState(null, '', '/author/arisudan');
  dom.window.dispatchEvent(new dom.window.Event('popstate'));
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const viewport = dom.window.document.getElementById('main-viewport');
  console.log('Viewport class list:', viewport.className);
  console.log('Viewport innerHTML length:', viewport.innerHTML.length);
  console.log('Has Author Large Avatar:', !!viewport.querySelector('.author-large-avatar'));
  console.log('Has Author Publications Section:', !!viewport.querySelector('.author-publications'));
}

runTest();
