const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');

function walkDir(dir) {
  let files = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const res = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === '.agents') {
      continue;
    }
    if (entry.isDirectory()) {
      files = files.concat(walkDir(res));
    } else if (entry.isFile()) {
      files.push(res);
    }
  }
  return files;
}

const allFiles = walkDir(projectDir);

console.log('--- AUDITING FILES FOR NULL BYTES & UNCLOSED COMMENTS ---');
allFiles.forEach(file => {
  const ext = path.extname(file);
  if (['.js', '.css', '.html'].includes(ext)) {
    const content = fs.readFileSync(file);
    // Check for null bytes
    let hasNull = false;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === 0) {
        hasNull = true;
        break;
      }
    }
    
    const text = content.toString('utf8');
    
    // Check for nested/invalid comments in CSS
    if (ext === '.css') {
      const nestedMatches = [];
      const regex = /\/\*[^*]*\/\*/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        nestedMatches.push(match.index);
      }
      
      if (nestedMatches.length > 0 || hasNull) {
        console.log(`File: ${path.relative(projectDir, file)}`);
        if (hasNull) console.log('  -> Contains NULL bytes!');
        if (nestedMatches.length > 0) {
          console.log(`  -> Contains nested comment tokens at character index: ${nestedMatches.join(', ')}`);
        }
      }
    } else {
      if (hasNull) {
        console.log(`File: ${path.relative(projectDir, file)}`);
        console.log('  -> Contains NULL bytes!');
      }
    }
  }
});
console.log('--- AUDIT COMPLETED ---');
