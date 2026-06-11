const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function runTests() {
  console.log('--- STARTING FLAT STATIC HTML DOM VERIFICATIONS ---');

  // Test 1: Verify Homepage Cover Structure (Featured cover, Reflections sidebar)
  const homePath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(homePath)) {
    const html = fs.readFileSync(homePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Verify Featured Story Card exists
    const featuredCard = doc.querySelector('.hero-featured-card');
    if (featuredCard) {
      console.log('✔ Home: Found hero featured cover story block.');
    } else {
      console.error('❌ Home: Missing hero featured cover story block.');
    }

    // Verify Reflections sidebar exists and has pull quotes
    const reflectionsCol = doc.querySelector('.reflections-column');
    if (reflectionsCol) {
      console.log('✔ Home: Found Reflections column.');
      const quotes = reflectionsCol.querySelectorAll('blockquote');
      if (quotes.length > 0) {
        console.log(`✔ Home: Found ${quotes.length} pull quotes inside reflections column.`);
      } else {
        console.error('❌ Home: Missing pull quotes in reflections column.');
      }
    } else {
      console.error('❌ Home: Missing Reflections column.');
    }
  } else {
    console.error('❌ Home: index.html not found at', homePath);
  }

  // Test 2: Verify Article details page trust badges, inline recommended boxes, collapsible citations accordion, prev/next buttons
  const articlePath = path.join(__dirname, '..', 'dist', 'article', '1', 'index.html');
  if (fs.existsSync(articlePath)) {
    const html = fs.readFileSync(articlePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Verify trust badges
    const factCheckedBadge = doc.querySelector('.trust-badge.fact-checked');
    const editoriallyReviewedBadge = doc.querySelector('.trust-badge.editorially-reviewed');
    if (factCheckedBadge && editoriallyReviewedBadge) {
      console.log('✔ Article: Found trust badges for Fact Checked and Editorially Reviewed.');
    } else {
      console.error('❌ Article: Trust badges are missing.');
    }

    // Verify inline "Read Also" box
    const readAlsoBox = doc.querySelector('.read-also-box');
    if (readAlsoBox) {
      console.log('✔ Article: Found inline "Read Also" box in paragraphs.');
      const link = readAlsoBox.querySelector('a');
      if (link && link.getAttribute('href').startsWith('/article/')) {
        console.log(`✔ Article: Inline recommendation link targets ${link.getAttribute('href')} successfully.`);
      } else {
        console.error('❌ Article: Inline "Read Also" link is invalid.');
      }
    } else {
      console.error('❌ Article: Missing inline "Read Also" box.');
    }

    // Verify collapsible Sources & Citations accordion
    const accordion = doc.querySelector('.sources-accordion');
    if (accordion) {
      console.log('✔ Article: Found Sources & Citations accordion block.');
      const details = accordion.querySelector('details');
      const summary = accordion.querySelector('summary');
      const listItems = accordion.querySelectorAll('li a');
      if (details && summary && listItems.length > 0) {
        console.log(`✔ Article: Accordion is configured correctly with ${listItems.length} citations.`);
        let allNewTabs = true;
        listItems.forEach(lnk => {
          if (lnk.getAttribute('target') !== '_blank' || lnk.getAttribute('rel') !== 'noopener') {
            allNewTabs = false;
          }
        });
        if (allNewTabs) {
          console.log('✔ Article: All citation links correctly open in a new tab with noopener.');
        } else {
          console.error('❌ Article: Some citation links are missing target="_blank" or rel="noopener".');
        }
      } else {
        console.error('❌ Article: Accordion structure is incomplete.');
      }
    } else {
      console.error('❌ Article: Missing Sources & Citations accordion block.');
    }

    // Verify Previous / Next paginated story buttons
    const pagination = doc.querySelector('.article-pagination');
    if (pagination) {
      console.log('✔ Article: Found Previous / Next article pagination buttons.');
      const nextLink = pagination.querySelector('.pagination-link.next');
      if (nextLink) {
        console.log(`✔ Article: Pagination links configure next path target correctly: ${nextLink.getAttribute('href')}`);
      } else {
        console.log('ℹ Article: No next link found (this might be the last article).');
      }
    } else {
      console.error('❌ Article: Missing Previous / Next pagination navigation block.');
    }
  } else {
    console.error('❌ Article 1: Page not found at', articlePath);
  }

  // Test 3: Verify Author profile upgrade
  const authorPath = path.join(__dirname, '..', 'dist', 'author', 'arisudan', 'index.html');
  if (fs.existsSync(authorPath)) {
    const html = fs.readFileSync(authorPath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Verify expertise and skills tags
    const expertiseSection = doc.querySelector('.author-expertise-section');
    if (expertiseSection) {
      console.log('✔ Author: Found skills & expertise tags section.');
    } else {
      console.error('❌ Author: Missing skills & expertise section.');
    }

    // Verify Recent vs Popular publication blocks
    const pubBlocks = doc.querySelector('.author-publications');
    if (pubBlocks) {
      console.log('✔ Author: Found publication portfolios section.');
      const columns = pubBlocks.querySelectorAll('.grid-two-col > div');
      if (columns.length === 2) {
        const leftH2 = columns[0].querySelector('h2').textContent;
        const rightH2 = columns[1].querySelector('h2').textContent;
        if (leftH2.includes('Recent Articles') && rightH2.includes('Most Popular')) {
          console.log('✔ Author: Recent Articles and Most Popular columns are rendered side-by-side.');
        } else {
          console.error(`❌ Author: Columns headers do not match: "${leftH2}" vs "${rightH2}"`);
        }
      } else {
        console.error(`❌ Author: Expected 2 publication lists, found ${columns.length}.`);
      }
    } else {
      console.error('❌ Author: Missing publication portfolios block.');
    }
  } else {
    console.error('❌ Author profile: Page not found at', authorPath);
  }

  // Test 4: Verify static pages rendered content
  const aboutPagePath = path.join(__dirname, '..', 'dist', 'about', 'index.html');
  if (fs.existsSync(aboutPagePath)) {
    const html = fs.readFileSync(aboutPagePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const h1 = doc.querySelector('#main-viewport h1');
    if (h1 && h1.textContent.includes('About AriSphere')) {
      console.log('✔ About: Successfully verified page content (Found "About AriSphere" H1).');
    } else {
      console.error(`❌ About: Page content mismatch. H1 is: "${h1 ? h1.textContent.trim() : 'NONE'}"`);
    }
  } else {
    console.error('❌ About page: not found at', aboutPagePath);
  }

  const privacyPagePath = path.join(__dirname, '..', 'dist', 'privacy', 'index.html');
  if (fs.existsSync(privacyPagePath)) {
    const html = fs.readFileSync(privacyPagePath, 'utf8');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const h1 = doc.querySelector('#main-viewport h1');
    if (h1 && h1.textContent.includes('Privacy Policy')) {
      console.log('✔ Privacy: Successfully verified page content (Found "Privacy Policy" H1).');
    } else {
      console.error(`❌ Privacy: Page content mismatch. H1 is: "${h1 ? h1.textContent.trim() : 'NONE'}"`);
    }
  } else {
    console.error('❌ Privacy page: not found at', privacyPagePath);
  }

  console.log('--- FLAT STATIC HTML DOM VERIFICATIONS COMPLETED ---');
}

runTests();
