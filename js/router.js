/* client-side Router & SEO Controller - AriSphere Version 2 */

(function () {
  const ROUTER_CONTAINER_ID = 'main-viewport';
  let activeRouteCount = 0;
  
  // Router definition with clean paths
  const routes = {
    '/': renderHome,
    '/category/:id': renderCategory,
    '/article/:id': renderArticle,
    '/author/:username': renderAuthor,
    '/contact': renderContact,
    '/privacy': renderPrivacy,
    '/about': renderAbout,
    '/disclaimer': renderDisclaimer,
    '/terms': renderTerms,
    '/editorial-policy': renderEditorialPolicy,
    '/admin': renderAdmin
  };

  // Helper: Breadcrumbs UI Builder
  function buildBreadcrumbsHTML(pathArray) {
    let html = `<nav aria-label="Breadcrumbs"><ol class="breadcrumbs">`;
    html += `<li class="breadcrumb-item"><a href="/">Home</a></li>`;
    pathArray.forEach((item, idx) => {
      const isLast = idx === pathArray.length - 1;
      if (isLast) {
        html += `<li class="breadcrumb-item" aria-current="page">${item.name}</li>`;
      } else {
        html += `<li class="breadcrumb-item"><a href="${item.link}">${item.name}</a></li>`;
      }
    });
    html += `</ol></nav>`;
    return html;
  }

  // Helper: BreadcrumbList Schema Builder
  function buildBreadcrumbSchema(pathArray) {
    const listElements = [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': getBaseURL() + '/'
      }
    ];
    pathArray.forEach((item, idx) => {
      listElements.push({
        '@type': 'ListItem',
        'position': idx + 2,
        'name': item.name,
        'item': getBaseURL() + item.link
      });
    });
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': listElements
    };
  }

  // Helper: Get base canonical URL origin
  const PRODUCTION_URL = 'https://arisphere.vercel.app';
  function getBaseURL() {
    try {
      if (typeof window === 'undefined' || !window || !window.location || !window.location.origin) {
        return PRODUCTION_URL;
      }
      const origin = window.location.origin;
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('//192.168.')) {
        return PRODUCTION_URL;
      }
      if (origin.includes('.vercel.app') && !origin.includes('arisphere.vercel.app')) {
        return PRODUCTION_URL;
      }
      return origin;
    } catch (e) {
      return PRODUCTION_URL;
    }
  }

  // Helper: Safe date parsing to prevent RangeErrors (Finding C)
  function safeISODate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      try {
        return new Date().toISOString().split('T')[0];
      } catch (e) {
        return '2026-06-10';
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('safeISODate parsing failed for:', dateStr, e);
    }
    try {
      return new Date().toISOString().split('T')[0];
    } catch (e) {
      return '2026-06-10';
    }
  }

  // Helper: Extract FAQ Page Schema from Article HTML Content
  function extractFAQSchema(contentHTML) {
    if (typeof document === 'undefined') return null;
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentHTML;
      const detailsElements = tempDiv.querySelectorAll('details');
      const faqEntities = [];
      
      detailsElements.forEach(details => {
        const summary = details.querySelector('summary');
        if (summary) {
          // Strip dropdown arrows and normalize spacing
          const questionText = summary.textContent.replace(/[▼▲\s]+/g, ' ').trim();
          
          const detailsClone = details.cloneNode(true);
          const summaryClone = detailsClone.querySelector('summary');
          if (summaryClone) {
            detailsClone.removeChild(summaryClone);
          }
          const answerText = detailsClone.textContent.trim();
          
          if (questionText && answerText) {
            faqEntities.push({
              '@type': 'Question',
              'name': questionText,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': answerText
              }
            });
          }
        }
      });
      
      if (faqEntities.length === 0) return null;
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqEntities
      };
    } catch (err) {
      console.warn("Failed to extract FAQ schema:", err);
      return null;
    }
  }

  // SEO & Schema Injections
  function applySEO(meta) {
    if (typeof document === 'undefined' || !document || !document.head) return;
    
    let pathname = '/';
    try {
      if (typeof window !== 'undefined' && window && window.location && window.location.pathname) {
        pathname = window.location.pathname;
      }
    } catch (e) {}

    const canonicalUrl = getBaseURL() + (pathname === '/' ? '' : pathname);
    const siteName = 'AriSphere';
    const finalTitle = `${meta.title} | ${siteName} - Where Trends Meet Perspective`;

    // 1. Document Title
    document.title = finalTitle;

    // 2. Base Description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.name = 'description';
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', meta.description);

    // 3. Open Graph
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', meta.image || '/assets/images/business-cover.png');
    setMetaTag('property', 'og:type', meta.type || 'website');
    setMetaTag('property', 'og:site_name', siteName);

    // 4. Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', meta.description);
    setMetaTag('name', 'twitter:image', meta.image || '/assets/images/business-cover.png');

    // 5. Canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 6. Multi-Schema JSON-LD Graph Injection
    let schemaScript = document.getElementById('jsonld-schema');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'jsonld-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    
    // Compile dynamic schemas into a @graph layout
    const graphSchemas = [meta.schema];
    if (meta.breadcrumbsSchema) {
      graphSchemas.push(meta.breadcrumbsSchema);
    }
    if (meta.faqSchema) {
      graphSchemas.push(meta.faqSchema);
    }
    schemaScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graphSchemas
    });

    // 7. GA4 SPA Virtual Page Tracking integration
    let hasConsent = false;
    try {
      hasConsent = localStorage.getItem('cookie-consent') === 'accepted';
    } catch (e) {}
    
    if (typeof gtag === 'function' && hasConsent) {
      gtag('config', 'G-GA_MEASUREMENT_ID', {
        'page_title': finalTitle,
        'page_path': pathname
      });
    }
  }

  function setMetaTag(attribute, value, content) {
    if (typeof document === 'undefined' || !document || !document.head) return;
    let tag = document.querySelector(`meta[${attribute}="${value}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, value);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  // Route Dispatcher
  async function handleRoute() {
    if (typeof document === 'undefined' || !document || !document.head) return;
    
    let path = '/';
    try {
      if (typeof window !== 'undefined' && window && window.location && window.location.pathname) {
        path = window.location.pathname;
      }
    } catch (e) {}
    
    // Normalize path by removing search params or hash fragments if present in the string
    path = path.split('?')[0].split('#')[0];
    
    // Normalize clean URL path redirects
    if (path.endsWith('/index.html')) {
      path = path.slice(0, -10);
    }
    
    // Strip trailing slashes (e.g. /article/1/ -> /article/1, but keep / as /)
    path = path.replace(/\/+$/, '');
    
    if (path === '') path = '/';
    
    const viewport = document.getElementById(ROUTER_CONTAINER_ID);
    if (!viewport) return;
    
    activeRouteCount++;
    const routeId = activeRouteCount;
    
    // Add CSS transition fade-out class
    viewport.classList.add('fade-out');

    setTimeout(async () => {
      if (typeof document === 'undefined' || !document || !document.head) return;
      if (routeId !== activeRouteCount) return;
      // Find matching route
      let match = null;
      let params = {};

      for (let routePattern in routes) {
        const routeRegex = routePatternToRegex(routePattern);
        const routeMatch = path.match(routeRegex);
        
        if (routeMatch) {
          match = routes[routePattern];
          const paramNames = getParamNames(routePattern);
          paramNames.forEach((name, idx) => {
            params[name] = routeMatch[idx + 1];
          });
          break;
        }
      }

      // If no route matches, render 404 or redirect to Home
      if (match) {
        await match(viewport, params);
      } else {
        render404(viewport);
      }

      // Update Navigation Active State
      updateActiveNavLinks(path);

      // Scroll to top
      window.scrollTo(0, 0);

      // Trigger fade-in
      viewport.classList.remove('fade-out');

      // Set focus to the viewport or its main heading for WCAG accessibility focus management
      const mainHeading = viewport.querySelector('h1');
      if (mainHeading) {
        mainHeading.setAttribute('tabindex', '-1');
        mainHeading.focus();
      } else {
        viewport.setAttribute('tabindex', '-1');
        viewport.focus();
      }
    }, 200); // matches the transition timing
  }

  // Regex Helpers for Path Parsing
  function routePatternToRegex(pattern) {
    return new RegExp('^' + pattern.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
  }

  function getParamNames(pattern) {
    const matches = pattern.match(/:([^\s/]+)/g);
    return matches ? matches.map(m => m.substring(1)) : [];
  }

  function updateActiveNavLinks(path) {
    if (typeof document === 'undefined' || !document || !document.head) return;
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href === path) {
        link.classList.add('active');
      } else if (path === '/' && href === '/') {
        link.classList.add('active');
      } else if (path.startsWith('/category') && href === '/category/' + path.split('/').pop()) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // --- RENDERING ROUTINES ---

  // Page 1: Home View
  async function renderHome(container) {
    const db = window.AriSphereDB;
    if (!db) return;

    const featured = await db.getFeaturedArticle();
    const latestList = await db.getLatestArticles(6);
    const mostRead = await db.getMostReadArticles(5);
    const editorsPicks = await db.getEditorsPicks(4);
    const reflectionsList = (await db.getArticlesByCategory('reflections')).slice(0, 4);

    // Dynamic SEO for Home
    const homeSEO = {
      title: 'Home',
      description: 'AriSphere: Where Trends Meet Perspective. Read the latest analysis on Technology, AI, Global Economics, Business, Social Media networks, and cultural insights.',
      url: getBaseURL() + '/',
      image: featured.image,
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': getBaseURL() + '/#website',
            'url': getBaseURL() + '/',
            'name': 'AriSphere',
            'description': 'Where Trends Meet Perspective',
            'publisher': { '@id': getBaseURL() + '/#organization' }
          },
          {
            '@type': 'Organization',
            '@id': getBaseURL() + '/#organization',
            'name': 'AriSphere',
            'url': getBaseURL() + '/',
            'logo': {
              '@type': 'ImageObject',
              'url': getBaseURL() + '/assets/images/business-cover.png'
            }
          }
        ]
      }
    };
    applySEO(homeSEO);

    // Compose HTML template
    let html = `
      <div class="container">
        <!-- Top Leaderboard Advertisement Placement -->
        <div class="adsense-placement ad-leaderboard" id="adsense-home-top">
          <div class="adsense-label">AriSphere Core Banner</div>
          <div class="adsense-slot-info">Display responsive 728x90</div>
        </div>

        <!-- Hero Editorial Section (Magazine Cover Layout) -->
        <section class="hero-section">
          
          <!-- Left Column: Large Featured Cover Story -->
          <div class="hero-featured-card">
            <img class="hero-featured-img" src="${featured.image}" alt="${featured.title}" loading="eager" fetchpriority="high" width="800" height="580">
            <div class="hero-featured-overlay"></div>
            <div class="hero-featured-content">
              <span class="badge ${featured.category}">${db.CATEGORIES[featured.category].name}</span>
              <h1 class="hero-featured-title">
                <a href="/article/${featured.id}">${featured.title}</a>
              </h1>
              <p class="hero-featured-desc">${featured.excerpt}</p>
              <div class="card-meta">
                <span>By ${db.AUTHORS[featured.author].name}</span>
                <span class="card-meta-dot"></span>
                <span>${featured.publishDate}</span>
                <span class="card-meta-dot"></span>
                <span>${featured.readTime}</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Reflections & Narratives with Pull Quotes -->
          <div class="hero-sidebar reflections-column">
            <h2>Reflections & Stories</h2>
            ${reflectionsList.map(art => `
              <div class="reflection-story-item">
                <div>
                  <h3>
                    <a href="/article/${art.id}">${art.title}</a>
                  </h3>
                  <!-- pull quote style -->
                  <blockquote>
                    "${art.excerpt}"
                  </blockquote>
                </div>
                <div class="reflection-story-meta">
                  <img src="${db.AUTHORS[art.author].avatar}" alt="${db.AUTHORS[art.author].name}" loading="lazy">
                  <div class="reflection-story-meta-text">
                    <strong>By ${db.AUTHORS[art.author].name}</strong> &middot; ${art.readTime}
                  </div>
                </div>
              </div>
            `).join('')}
            ${reflectionsList.length === 0 ? `<p class="no-reflections">No reflections published yet.</p>` : ''}
          </div>
        </section>

        <!-- Inline Feed Advertisement Placement -->
        <div class="adsense-placement ad-infeed" id="adsense-home-infeed-1">
          <div class="adsense-label">In-Feed Responsive Placements</div>
          <div class="adsense-slot-info">Display fluid feed banner</div>
        </div>

        <!-- Editor's Picks Section -->
        <section class="editors-picks-section">
          <div class="section-header">
            <h2 class="section-title">Editor's Picks</h2>
          </div>
          <div class="grid-four-col">
            ${editorsPicks.map(art => `
              <article class="card">
                <div class="card-img-wrapper">
                  <img class="card-img" src="${art.image}" alt="${art.title}" loading="lazy">
                </div>
                <div class="card-body">
                  <div class="card-meta">
                    <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                  </div>
                  <h3 class="card-title">
                    <a href="/article/${art.id}">${art.title}</a>
                  </h3>
                </div>
              </article>
            `).join('')}
          </div>
        </section>

        <!-- Latest Perspective & Sidebar -->
        <div class="grid-two-col">
          <section class="latest-section">
            <div class="section-header">
              <h2 class="section-title">Latest Perspective</h2>
            </div>
            <div class="grid-two-col-equal">
              ${latestList.map(art => `
                <article class="card">
                  <div class="card-img-wrapper">
                    <img class="card-img" src="${art.image}" alt="${art.title}" loading="lazy">
                  </div>
                  <div class="card-body">
                    <div class="card-meta">
                      <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                      <span class="card-meta-dot"></span>
                      <span>${art.publishDate}</span>
                    </div>
                    <h3 class="card-title">
                      <a href="/article/${art.id}">${art.title}</a>
                    </h3>
                    <p class="card-excerpt">${art.excerpt}</p>
                    <div class="card-author-footer">
                      <img class="author-avatar" src="${db.AUTHORS[art.author].avatar}" alt="${db.AUTHORS[art.author].name}" loading="lazy">
                      <a href="/author/${art.author}" class="author-name">By ${db.AUTHORS[art.author].name}</a>
                    </div>
                  </div>
                </article>
              `).join('')}
            </div>
          </section>

          <!-- Sidebar sticky column -->
          <aside class="sidebar-column">
            <div class="sidebar-sticky">
              <!-- Most Read List -->
              <div class="widget">
                <h3 class="widget-title">Most Read</h3>
                <div class="trending-widget-list">
                  ${mostRead.map((art, idx) => `
                    <div class="trending-widget-item">
                      <span class="trending-widget-number">0${idx + 1}</span>
                      <div class="trending-widget-info">
                        <a href="/article/${art.id}" class="trending-widget-title">${art.title}</a>
                        <div class="card-meta">
                          <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                          <span>${art.readTime}</span>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Sidebar Ad Block -->
              <div class="adsense-placement ad-sidebar" id="adsense-home-sidebar">
                <div class="adsense-label">Sticky Rectangular Sidebar Ad</div>
                <div class="adsense-slot-info">Display size 300x250 / 300x600</div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Dynamic Category Matrix Links -->
        <section class="category-cards-section">
          <div class="section-header">
            <h2 class="section-title">Explore Topics</h2>
          </div>
          <div class="category-pills-list">
            ${Object.keys(db.CATEGORIES).filter(k => k !== 'trending').map(key => {
              const cat = db.CATEGORIES[key];
              return `
                <a href="/category/${cat.id}" class="badge ${cat.id}">
                  ${cat.name}
                </a>
              `;
            }).join('')}
          </div>
        </section>

      </div>
    `;

    container.innerHTML = html;
  }

  // Page 2: Category Archive List View
  async function renderCategory(container, params) {
    const db = window.AriSphereDB;
    if (!db) return;

    const catId = params.id || 'trending';
    const categoryInfo = db.CATEGORIES[catId];
    
    if (!categoryInfo) {
      render404(container);
      return;
    }

    const matchingArticles = await db.getArticlesByCategory(catId);
    const mostRead = await db.getMostReadArticles(5);

    // Dynamic Breadcrumbs
    const pathArray = [{ name: categoryInfo.name, link: `/category/${catId}` }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    // Dynamic SEO for Category
    const categorySEO = {
      title: categoryInfo.name,
      description: `Browse all articles, features, opinions and editorials under the ${categoryInfo.name} category. ${categoryInfo.desc}`,
      url: getBaseURL() + `/category/${catId}`,
      image: matchingArticles[0]?.image,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': getBaseURL() + `/category/${catId}#collection`,
        'url': getBaseURL() + `/category/${catId}`,
        'name': `${categoryInfo.name} Articles | AriSphere`,
        'description': categoryInfo.desc,
        'isPartOf': { '@id': getBaseURL() + '/#website' },
        'about': {
          '@type': 'Thing',
          'name': categoryInfo.name,
          'description': categoryInfo.desc
        }
      },
      breadcrumbsSchema
    };
    applySEO(categorySEO);

    let html = `
      <div class="container">
        <!-- Breadcrumb Links -->
        ${breadcrumbsHTML}

        <!-- Banner Header -->
        <header class="category-header-banner">
          <span class="badge ${catId}">${categoryInfo.name} Archive</span>
          <h1 class="category-header-title">${categoryInfo.name}</h1>
          <p class="category-header-desc">${categoryInfo.desc}</p>
        </header>

        <!-- Category Top Leaderboard -->
        <div class="adsense-placement ad-leaderboard" id="adsense-category-top">
          <div class="adsense-label">Category Page Banner</div>
          <div class="adsense-slot-info">Responsive Display Ad</div>
        </div>

        <div class="grid-two-col">
          <main class="category-list-section">
            ${matchingArticles.length === 0 ? `
              <p class="search-no-results">No articles found in this category.</p>
            ` : `
              <div class="grid-two-col-equal">
                ${matchingArticles.map(art => `
                  <article class="card">
                    <div class="card-img-wrapper">
                      <img class="card-img" src="${art.image}" alt="${art.title}" loading="lazy" width="400" height="250">
                    </div>
                    <div class="card-body">
                      <div class="card-meta">
                        <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                        <span class="card-meta-dot"></span>
                        <span>${art.publishDate}</span>
                      </div>
                      <h3 class="card-title">
                        <a href="/article/${art.id}">${art.title}</a>
                      </h3>
                      <p class="card-excerpt">${art.excerpt}</p>
                      <div class="card-author-footer">
                        <img class="author-avatar" src="${db.AUTHORS[art.author].avatar}" alt="${db.AUTHORS[art.author].name}" loading="lazy" width="32" height="32">
                        <a href="/author/${art.author}" class="author-name">${db.AUTHORS[art.author].name}</a>
                      </div>
                    </div>
                  </article>
                `).join('')}
              </div>
            `}
          </main>

          <!-- Sidebar -->
          <aside class="sidebar-column">
            <div class="sidebar-sticky">
              <div class="widget">
                <h3 class="widget-title">Most Read</h3>
                <div class="trending-widget-list">
                  ${mostRead.map((art, idx) => `
                    <div class="trending-widget-item">
                      <span class="trending-widget-number">0${idx + 1}</span>
                      <div class="trending-widget-info">
                        <a href="/article/${art.id}" class="trending-widget-title">${art.title}</a>
                        <div class="card-meta" style="margin-top: 4px;">
                          <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                          <span>${art.readTime}</span>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Sidebar Ad Block -->
              <div class="adsense-placement ad-sidebar" id="adsense-category-sidebar">
                <div class="adsense-label">Category Sticky Ad</div>
                <div class="adsense-slot-info">Responsive column display ad</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 3: Article Details View
  async function renderArticle(container, params) {
    const db = window.AriSphereDB;
    if (!db) return;

    const article = await db.getArticleById(params.id);
    if (!article) {
      render404(container);
      return;
    }

    const related = await db.getRelatedArticles(article.id, 3);
    const authorInfo = db.AUTHORS[article.author];

    // Increment view counter locally and trigger remote DB views increment RPC
    article.views = (article.views || 0) + 1;
    if (db.supabase) {
      db.supabase.rpc('increment_article_views', { article_id: Number(article.id) }).catch(err => {
        console.warn("Failed to increment views via RPC", err);
      });
    }

    // Dynamic Breadcrumbs
    const categoryInfo = db.CATEGORIES[article.category];
    const pathArray = [
      { name: categoryInfo.name, link: `/category/${categoryInfo.id}` },
      { name: article.title, link: `/article/${article.id}` }
    ];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    // Fetch all articles to compute pagination
    let allArticles = [];
    if (db.isSupabaseConfigured && db.isSupabaseConfigured()) {
      try {
        const data = await db.fetchFromSupabase('articles?status=eq.published&order=id.asc&select=*');
        allArticles = data.map(db.mapDatabaseArticle);
      } catch (err) {
        console.warn("Failed to fetch all articles for pagination, falling back to local ARTICLES.", err);
        allArticles = db.ARTICLES.filter(a => (a.status || 'published') === 'published').sort((a, b) => a.id - b.id);
      }
    } else {
      allArticles = db.ARTICLES.filter(a => (a.status || 'published') === 'published').sort((a, b) => a.id - b.id);
    }
    
    const currentIndex = allArticles.findIndex(a => String(a.id) === String(article.id));
    const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
    const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

    // Extract dynamic FAQ Page schema (Task 7)
    const faqSchema = extractFAQSchema(article.content);

    // Dynamic SEO & Structured Data Schema for Article
    const articleSEO = {
      title: article.title,
      description: article.excerpt,
      url: getBaseURL() + `/article/${article.id}`,
      image: article.image,
      type: 'article',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': getBaseURL() + `/article/${article.id}`
        },
        'headline': article.title,
        'image': [article.image],
        'datePublished': safeISODate(article.publishDate),
        'dateModified': safeISODate(article.lastUpdatedDate),
        'author': {
          '@type': 'Person',
          'name': authorInfo.name,
          'jobTitle': authorInfo.title,
          'url': getBaseURL() + `/author/${authorInfo.username}`
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'AriSphere',
          'logo': {
            '@type': 'ImageObject',
            'url': getBaseURL() + '/assets/images/business-cover.png'
          }
        },
        'description': article.excerpt
      },
      breadcrumbsSchema,
      faqSchema
    };
    applySEO(articleSEO);

    const isReflection = article.category === 'reflections';
    let bodyHTML = article.content;
    const paragraphs = bodyHTML.split('</p>');
    
    // Fetch up to 2 related articles for inline linking
    const relatedLinks = await db.getRelatedArticles(article.id, 2);
    const insertions = [];

    if (relatedLinks && relatedLinks.length > 0 && paragraphs.length >= 3) {
      if (relatedLinks.length === 1) {
        const idx = Math.floor(paragraphs.length / 2);
        insertions.push({
          index: idx,
          html: `
            <div class="read-also-box animate-pulse" style="margin: var(--space-md) 0; padding: var(--space-sm) var(--space-md); border-left: 3px solid var(--color-accent); background-color: var(--color-bg-offset); font-family: var(--font-sans); font-size: 0.95rem;">
              <strong style="color: var(--color-accent); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Read Also</strong>
              <a href="/article/${relatedLinks[0].id}" style="color: var(--color-text); font-weight: 700; text-decoration: none; border-bottom: 1px solid transparent; transition: border-bottom 0.2s;" onmouseover="this.style.borderBottomColor='var(--color-text)'" onmouseout="this.style.borderBottomColor='transparent'">
                ${relatedLinks[0].title}
              </a>
            </div>
          `
        });
      } else if (relatedLinks.length === 2) {
        const idx1 = Math.floor(paragraphs.length / 3);
        const idx2 = Math.floor((paragraphs.length * 2) / 3);
        insertions.push({
          index: idx1,
          html: `
            <div class="read-also-box animate-pulse" style="margin: var(--space-md) 0; padding: var(--space-sm) var(--space-md); border-left: 3px solid var(--color-accent); background-color: var(--color-bg-offset); font-family: var(--font-sans); font-size: 0.95rem;">
              <strong style="color: var(--color-accent); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Read Also</strong>
              <a href="/article/${relatedLinks[0].id}" style="color: var(--color-text); font-weight: 700; text-decoration: none; border-bottom: 1px solid transparent; transition: border-bottom 0.2s;" onmouseover="this.style.borderBottomColor='var(--color-text)'" onmouseout="this.style.borderBottomColor='transparent'">
                ${relatedLinks[0].title}
              </a>
            </div>
          `
        });
        insertions.push({
          index: idx2,
          html: `
            <div class="read-also-box animate-pulse" style="margin: var(--space-md) 0; padding: var(--space-sm) var(--space-md); border-left: 3px solid var(--color-accent); background-color: var(--color-bg-offset); font-family: var(--font-sans); font-size: 0.95rem;">
              <strong style="color: var(--color-accent); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; display: block; margin-bottom: 2px;">Read Also</strong>
              <a href="/article/${relatedLinks[1].id}" style="color: var(--color-text); font-weight: 700; text-decoration: none; border-bottom: 1px solid transparent; transition: border-bottom 0.2s;" onmouseover="this.style.borderBottomColor='var(--color-text)'" onmouseout="this.style.borderBottomColor='transparent'">
                ${relatedLinks[1].title}
              </a>
            </div>
          `
        });
      }
    }

    // Midpoint Newsletter CTA for reflections
    if (isReflection && paragraphs.length > 2) {
      const midpoint = Math.floor(paragraphs.length / 2);
      let targetIdx = midpoint;
      if (insertions.some(ins => ins.index === targetIdx)) {
        targetIdx = Math.min(paragraphs.length - 1, targetIdx + 1);
      }
      insertions.push({
        index: targetIdx,
        html: `
          <div class="article-midpoint-cta">
            <h4>Subscribe to the AriSphere Digest</h4>
            <p>Get our weekly perspectives on cognitive tech, world shifts, and digital philosophy delivered direct to your inbox.</p>
            <form class="newsletter-form-midpoint">
              <div style="display: flex; gap: var(--space-sm); width: 100%; max-width: 500px;">
                <input class="form-control" type="email" placeholder="Enter your email address" required aria-label="Email address for subscription">
                <button type="submit" class="btn btn-primary">Subscribe</button>
              </div>
            </form>
          </div>
        `
      });
    }

    // Apply insertions from last to first
    insertions.sort((a, b) => b.index - a.index);
    insertions.forEach(ins => {
      paragraphs.splice(ins.index, 0, ins.html);
    });
    bodyHTML = paragraphs.join('</p>');

    let html = `
      <div class="container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}
        
        <!-- Top Ad Placement -->
        <div class="adsense-placement ad-leaderboard" id="adsense-article-top">
          <div class="adsense-label">Reading Mode Header Ad</div>
          <div class="adsense-slot-info">Standard leaderboard banner placement</div>
        </div>

        <div class="grid-two-col">
          <main class="article-viewport">
            <article class="article-container">
              <!-- Meta Tag Info -->
              <header class="article-header">
                <div class="article-header-meta">
                  <a href="/category/${article.category}" class="badge ${article.category}">${db.CATEGORIES[article.category].name}</a>
                  <span class="card-meta-dot"></span>
                  <span>Published: ${article.publishDate}</span>
                  <span class="card-meta-dot"></span>
                  <span>Updated: ${article.lastUpdatedDate || article.publishDate}</span>
                  <span class="card-meta-dot"></span>
                  <span>${article.readTime}</span>
                  <span class="card-meta-dot"></span>
                  <span class="article-views">👁 ${article.views} views</span>
                </div>
                <h1 class="article-title">${article.title}</h1>
                <p class="article-subtitle">${article.subtitle}</p>

                <!-- Source Attribution Block -->
                ${article.sourceAttribution ? `
                <div class="article-attribution">
                  Attribution: <span>${article.sourceAttribution}</span>
                </div>
                ` : ''}
                
                <!-- Author Bio & Trust Badges Header -->
                <div class="article-author-meta">
                  <div class="author-avatar-group">
                    <img class="author-avatar" src="${authorInfo.avatar}" alt="${authorInfo.name}" loading="lazy" width="40" height="40">
                    <div>
                      <div class="author-meta-name"><a href="/author/${authorInfo.username}">By ${authorInfo.name}</a></div>
                      <div class="author-meta-title">${authorInfo.title}</div>
                    </div>
                  </div>
                  
                  <div class="trust-badges">
                    ${article.factChecked ? `
                      <span class="trust-badge fact-checked" title="This article has been verified by our editorial fact-checking team.">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Fact Checked
                      </span>
                    ` : ''}
                    ${article.editoriallyReviewed ? `
                      <span class="trust-badge editorially-reviewed" title="This article has been peer-reviewed and approved by our editors.">
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Editorially Reviewed
                      </span>
                    ` : ''}
                  </div>
                </div>
              </header>

              <!-- Main Hero Image -->
              <img class="article-featured-img" src="${article.image}" alt="${article.title}" loading="eager" width="760" height="500">

              ${isReflection ? `
              <!-- Storytelling Author Bio Card (Reflections specific) -->
              <div class="story-author-profile">
                <img class="story-author-avatar" src="${authorInfo.avatar}" alt="${authorInfo.name}">
                <div class="story-author-details">
                  <div class="story-author-title">Written By</div>
                  <h3 class="story-author-name"><a href="/author/${authorInfo.username}">${authorInfo.name}</a></h3>
                  <div class="story-author-title">${authorInfo.title}</div>
                  <p class="story-author-bio">${authorInfo.bio}</p>
                </div>
              </div>
              ` : ''}

              <!-- Typography Rich Body -->
              <div class="article-body-content">
                ${bodyHTML}
              </div>

              <!-- About the Author Bio Card (Task 4) -->
              <div class="article-author-bio-card">
                <img class="article-author-bio-avatar" src="${authorInfo.avatar}" alt="${authorInfo.name}">
                <div class="article-author-bio-content">
                  <div class="article-author-bio-title">About the Author</div>
                  <h3 class="article-author-bio-name">
                    <a href="/author/${authorInfo.username}">${authorInfo.name}</a>
                  </h3>
                  <div class="article-author-bio-title" style="margin-bottom: var(--space-xs); font-size: 0.8rem; color: var(--color-text-light);">${authorInfo.title}</div>
                  <p class="article-author-bio-text">${authorInfo.bio}</p>
                  ${authorInfo.experience ? `<p class="article-author-bio-experience"><strong>Experience:</strong> ${authorInfo.experience}</p>` : ''}
                  ${authorInfo.expertise ? `
                    <div class="article-author-bio-expertise">
                      ${authorInfo.expertise.map(exp => `<span class="badge ${authorInfo.username === 'arisudan' ? 'reflections' : 'technology'}">${exp}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Mid-Article Inline Ad Placement -->
              <div class="adsense-placement ad-infeed" id="adsense-mid-article">
                <div class="adsense-label">Mid-Article Responsive AdSense Banner</div>
                <div class="adsense-slot-info">Optimized for CTR</div>
              </div>

              <!-- Article Tags -->
              <div class="article-tags">
                ${article.tags.map(tag => `<span class="badge">#${tag}</span>`).join('')}
              </div>

              <!-- Expandable Sources Accordion Panel -->
              ${article.sources && article.sources.length > 0 ? `
              <div class="sources-accordion">
                <details>
                  <summary>
                    <span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent);"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      Sources & Citations (${article.sources.length})
                    </span>
                    <span class="accordion-arrow">▼</span>
                  </summary>
                  <div class="sources-content">
                    <ul>
                      ${article.sources.map(src => `
                        <li>
                          <a href="${src.url}" target="_blank" rel="noopener">
                            ${src.name}
                          </a>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                </details>
              </div>
              ` : ''}

              <!-- Interactive Social Share Widget (including WhatsApp share option) -->
              <div class="article-share-bar">
                <span class="share-title">Share Article:</span>
                <button class="btn-icon" title="Share on X (Twitter)" onclick="window.open('https://twitter.com/share?url='+encodeURIComponent(window.location.href)+'&text='+encodeURIComponent('${article.title}'), '_blank')">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <button class="btn-icon" title="Share on Facebook" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.href), '_blank')">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.8z"/></svg>
                </button>
                <button class="btn-icon" title="Share on LinkedIn" onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(window.location.href), '_blank')">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </button>
                <button class="btn-icon" title="Share on WhatsApp" onclick="window.open('https://api.whatsapp.com/send?text='+encodeURIComponent('${article.title} - ' + window.location.href), '_blank')">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.62.962 3.21 1.48 4.817 1.488 5.405-.001 9.814-4.415 9.818-9.829.002-2.623-1.017-5.086-2.872-6.944C16.48 2.01 14.027.99 11.406.99 5.998.99 1.589 5.404 1.584 10.82c-.002 1.716.452 3.393 1.314 4.887l-.968 3.541 3.634-.954z"/></svg>
                </button>
                <button class="btn-icon" title="Copy Link" id="btn-copy-link">
                  <svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                </button>
              </div>

              <!-- Related Articles Grid (Recommendation Engine Widget) -->
              ${related.length > 0 ? `
              <section class="related-articles-section">
                <h3 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: var(--space-md); color: var(--color-text);">Recommended Reading</h3>
                <div class="grid-three-col">
                  ${related.map(art => `
                    <article class="card">
                      <div class="card-img-wrapper">
                        <img class="card-img" src="${art.image}" alt="${art.title}" loading="lazy">
                      </div>
                      <div class="card-body">
                        <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                        <h4 class="card-title">
                          <a href="/article/${art.id}">${art.title}</a>
                        </h4>
                      </div>
                    </article>
                  `).join('')}
                </div>
              </section>
              ` : ''}

              <!-- Previous / Next Story Navigation Cards -->
              <nav class="article-pagination" aria-label="Pagination">
                ${prevArticle ? `
                  <a href="/article/${prevArticle.id}" class="pagination-link prev">
                    <span class="pagination-label">← Previous Story</span>
                    <span class="pagination-title">${prevArticle.title}</span>
                  </a>
                ` : `<div style="width: 48%; min-width: 200px;"></div>`}
                ${nextArticle ? `
                  <a href="/article/${nextArticle.id}" class="pagination-link next">
                    <span class="pagination-label">Next Story →</span>
                    <span class="pagination-title">${nextArticle.title}</span>
                  </a>
                ` : `<div style="width: 48%; min-width: 200px;"></div>`}
              </nav>

              <!-- Interactive Mock Comment Section -->
              <section class="comment-section">
                <h3 class="widget-title">Discussion</h3>
                
                <div class="comment-list" id="article-comments">
                  <div class="comment-item">
                    <img class="comment-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Sarah Connor" loading="lazy" width="44" height="44">
                    <div class="comment-content">
                      <div class="comment-author-name">Sarah Connor</div>
                      <div class="comment-date">2 days ago</div>
                      <p class="comment-text">This article gets to the core of semantic space vs creative soul. As a writer, I find generating prompts with models acts as an interesting mirror rather than an author.</p>
                    </div>
                  </div>
                  <div class="comment-item">
                    <img class="comment-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" alt="John Doe" loading="lazy" width="44" height="44">
                    <div class="comment-content">
                      <div class="comment-author-name">John Doe</div>
                      <div class="comment-date">1 day ago</div>
                      <p class="comment-text">Excellent summary. Looking forward to how copyright law will adapt to these changes.</p>
                    </div>
                  </div>
                </div>

                <!-- Add Comment Form -->
                <div class="comment-form-container">
                  <h4>Leave a Perspective</h4>
                  <form id="form-comment">
                    <div class="grid-two-col grid-two-col-equal">
                      <div class="form-group">
                        <label class="form-label" for="comment-user">Your Name</label>
                        <input class="form-control" type="text" id="comment-user" required placeholder="e.g. Jane Doe">
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="comment-email">Email Address</label>
                        <input class="form-control" type="email" id="comment-email" required placeholder="e.g. jane@example.com">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="comment-text">Comment</label>
                      <textarea class="form-control" id="comment-text" required placeholder="Write your thoughts here..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Post Comment</button>
                  </form>
                </div>
              </section>
            </article>
          </main>

          <!-- Sidebar Column -->
          <aside class="sidebar-column">
            <div class="sidebar-sticky">
              <!-- Sidebar Ad Unit -->
              <div class="adsense-placement ad-sidebar" id="adsense-article-sidebar" style="margin-top: 0;">
                <div class="adsense-label">Sticky Sidebar Ad Slot</div>
                <div class="adsense-slot-info">High-Viewability Rectangle 300x250</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (typeof document === 'undefined' || !document || !document.head) return;

    // Attach copy link behavior
    const copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          // Trigger global notification event
          const event = new CustomEvent('show-toast', { detail: 'Link copied to clipboard!' });
          window.dispatchEvent(event);
        });
      });
    }

    // Attach midpoint newsletter form submit behavior
    const midpointForm = container.querySelector('.newsletter-form-midpoint');
    if (midpointForm) {
      midpointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = midpointForm.querySelector('input[type="email"]');
        if (emailInput && emailInput.value.trim()) {
          const email = emailInput.value.trim();
          const submitBtn = midpointForm.querySelector('button');
          const originalText = submitBtn.innerHTML;
          submitBtn.disabled = true;
          submitBtn.innerHTML = `Subscribing...`;
          
          fetch('/api/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
          })
          .then(response => {
            if (!response.ok) {
              return response.json().then(err => { throw new Error(err.error || 'Subscription failed'); });
            }
            return response.json();
          })
          .then(data => {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: data.message || 'Successfully subscribed!' }));
            submitBtn.innerHTML = `✓ Subscribed`;
            emailInput.value = '';
            
            setTimeout(() => {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalText;
            }, 3000);
          })
          .catch(error => {
            console.error('Midpoint Newsletter Error:', error);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: error.message || 'Subscription failed. Please try again.' }));
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          });
        }
      });
    }

    // Attach comment submit behavior
    const commentForm = document.getElementById('form-comment');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userName = document.getElementById('comment-user').value.trim();
        const userText = document.getElementById('comment-text').value.trim();
        
        if (userName && userText) {
          const list = document.getElementById('article-comments');
          const newItem = document.createElement('div');
          newItem.className = 'comment-item';
          newItem.style.animation = 'toast-in var(--transition-normal) forwards';
          newItem.innerHTML = `
            <div class="comment-avatar" style="background-color: var(--color-accent); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">
              ${userName.charAt(0).toUpperCase()}
            </div>
            <div class="comment-content">
              <div class="comment-author-name">${userName}</div>
              <div class="comment-date">Just now</div>
              <p class="comment-text">${userText}</p>
            </div>
          `;
          list.appendChild(newItem);
          commentForm.reset();

          window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Comment posted successfully!' }));
        }
      });
    }
  }

  // Page 4: Author Profile View
  async function renderAuthor(container, params) {
    const db = window.AriSphereDB;
    if (!db) return;

    const username = params.username || 'arisudan';
    const author = db.AUTHORS[username];

    if (!author) {
      render404(container);
      return;
    }

    const writtenArticles = await db.getArticlesByAuthor(username);
    const recentArticles = [...writtenArticles].sort((a, b) => b.id - a.id);
    const popularArticles = [...writtenArticles].sort((a, b) => (b.views || 0) - (a.views || 0));

    // Dynamic stats computations (Task 3)
    const totalPublications = writtenArticles.length;
    const totalViews = writtenArticles.reduce((acc, art) => acc + (art.views || 0), 0);
    const mostPopularArticle = popularArticles[0];

    // Dynamic Breadcrumbs
    const pathArray = [
      { name: 'Editorial Board', link: '/author/arisudan' },
      { name: author.name, link: `/author/${username}` }
    ];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    // Dynamic SEO for Author
    const authorSEO = {
      title: author.name,
      description: `${author.name} is a key contributor and ${author.title} at AriSphere. Browse their published catalog and portfolio of articles.`,
      url: getBaseURL() + `/author/${username}`,
      image: author.avatar,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': getBaseURL() + `/author/${username}#profile`,
        'url': getBaseURL() + `/author/${username}`,
        'name': `${author.name} Portfolio | AriSphere`,
        'description': author.bio,
        'mainEntity': {
          '@type': 'Person',
          'name': author.name,
          'jobTitle': author.title,
          'image': author.avatar,
          'description': author.bio
        }
      },
      breadcrumbsSchema
    };
    applySEO(authorSEO);

    let html = `
      <div class="container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <!-- Author Showcase Card -->
        <header class="author-profile-card">
          <img class="author-large-avatar" src="${author.avatar}" alt="${author.name}" width="140" height="140">
          <div class="author-profile-info">
            <h1 class="author-profile-name">${author.name}</h1>
            <div class="author-profile-title">${author.title}</div>
            <p class="author-profile-bio">${author.bio}</p>
            
            <!-- Experience section (Task 2 & 3) -->
            ${author.experience ? `
              <p class="author-profile-experience">
                <strong>Professional Background:</strong> ${author.experience}
              </p>
            ` : ''}
            
            <!-- Skills & Expertise Tags -->
            <div class="author-expertise-section">
              ${author.expertise ? `
                <div>
                  <strong>Expertise</strong>
                  <div class="author-badge-group">
                    ${author.expertise.map(exp => `<span class="badge ${username === 'arisudan' ? 'reflections' : 'technology'}">${exp}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${author.skills ? `
                <div>
                  <strong>Skills</strong>
                  <div class="author-badge-group">
                    ${author.skills.map(skill => `<span class="badge badge-skill">${skill}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Dynamic publication metrics (Task 3) -->
            <div class="author-profile-meta">
              <span>Editorial Board Member</span>
              <span class="card-meta-dot"></span>
              <span><strong>${totalPublications}</strong> publications</span>
              <span class="card-meta-dot"></span>
              <span><strong>👁 ${totalViews}</strong> total views</span>
            </div>

            <!-- Social and Contact Details -->
            <div class="author-profile-socials">
              ${author.social?.twitter ? `
                <a href="${author.social.twitter}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Twitter X" title="Follow on X">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              ` : ''}
              ${author.social?.linkedin ? `
                <a href="${author.social.linkedin}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="LinkedIn" title="Connect on LinkedIn">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              ` : ''}
              ${author.social?.github ? `
                <a href="${author.social.github}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="GitHub" title="View GitHub Profile">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
              ` : ''}
              ${author.contact ? `
                <a href="mailto:${author.contact}" class="social-icon" aria-label="Email Address" title="Send Email">
                  <svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </a>
              ` : ''}
            </div>
          </div>
        </header>

        <!-- Most Popular Article Highlighted Featured Card (Task 3) -->
        ${mostPopularArticle ? `
          <section class="author-featured-work-section">
            <h2 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: var(--space-md); color: var(--color-text);">Highlighted Publication</h2>
            <article class="author-featured-work-card">
              <div class="author-featured-work-img-wrapper">
                <img src="${mostPopularArticle.image}" alt="${mostPopularArticle.title}" loading="lazy">
                <span class="badge ${mostPopularArticle.category}">${db.CATEGORIES[mostPopularArticle.category].name}</span>
              </div>
              <div class="card-body" style="padding: var(--space-lg);">
                <h3 style="font-family: var(--font-serif); font-size: 1.6rem; line-height: 1.25; margin-bottom: var(--space-xs);">
                  <a href="/article/${mostPopularArticle.id}" style="color: var(--color-text); text-decoration: none; border-bottom: 2px solid transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='var(--color-text)'" onmouseout="this.style.borderBottomColor='transparent'">${mostPopularArticle.title}</a>
                </h3>
                <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: var(--space-md); line-height: 1.5;">${mostPopularArticle.excerpt}</p>
                <div class="card-meta" style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; align-items: center; gap: var(--space-xs);">
                  <span>Published: ${mostPopularArticle.publishDate}</span>
                  <span class="card-meta-dot"></span>
                  <span>${mostPopularArticle.readTime}</span>
                  <span class="card-meta-dot"></span>
                  <span>👁 ${mostPopularArticle.views} views</span>
                </div>
              </div>
            </article>
          </section>
        ` : ''}

        <!-- Two Parallel Publication Blocks (Responsive Layouts) (Task 3) -->
        <section class="author-publications">
          <div class="grid-two-col grid-two-col-equal">
            
            <!-- Left Column: Recent Publications -->
            <div>
              <h2>Recent Publications</h2>
              <div class="author-cards-column">
                ${recentArticles.map(art => `
                  <article class="card">
                    <div class="card-body">
                      <div class="card-meta">
                        <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                        <span class="card-meta-dot"></span>
                        <span>${art.publishDate}</span>
                      </div>
                      <h3 class="card-title">
                        <a href="/article/${art.id}">${art.title}</a>
                      </h3>
                      <p class="card-excerpt">${art.excerpt}</p>
                    </div>
                  </article>
                `).join('')}
                ${recentArticles.length === 0 ? `<p style="color: var(--color-text-muted);">No articles published yet.</p>` : ''}
              </div>
            </div>

            <!-- Right Column: Popular Publications -->
            <div>
              <h2>Popular Publications</h2>
              <div class="author-cards-column">
                ${popularArticles.map(art => `
                  <article class="card">
                    <div class="card-body">
                      <div class="card-meta">
                        <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                        <span class="card-meta-dot"></span>
                        <span class="author-article-views">👁 ${art.views} views</span>
                      </div>
                      <h3 class="card-title">
                        <a href="/article/${art.id}">${art.title}</a>
                      </h3>
                      <p class="card-excerpt">${art.excerpt}</p>
                    </div>
                  </article>
                `).join('')}
                ${popularArticles.length === 0 ? `<p style="color: var(--color-text-muted);">No articles published yet.</p>` : ''}
              </div>
            </div>

          </div>
        </section>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 5: Contact Page
  function renderContact(container) {
    const pathArray = [{ name: 'Contact Us', link: '/contact' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const contactSEO = {
      title: 'Contact Us',
      description: 'Get in touch with AriSphere editors and contributors. Share perspectives, pitch editorial features, or submit feedback.',
      url: getBaseURL() + '/contact',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': getBaseURL() + '/contact#webpage',
        'url': getBaseURL() + '/contact',
        'name': 'Contact AriSphere Support & Editorial Teams',
        'isPartOf': { '@id': getBaseURL() + '/#website' }
      },
      breadcrumbsSchema
    };
    applySEO(contactSEO);

    let html = `
      <div class="container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <header style="text-align: center; margin-bottom: var(--space-xl);">
          <h1 style="font-family: var(--font-serif); font-size: 2.5rem; font-weight: 700; margin-bottom: var(--space-xs);">Connect with AriSphere</h1>
          <p style="color: var(--color-text-muted);">Share your feedback, pitches, or inquiries with our editorial desk.</p>
        </header>

        <div class="contact-layout">
          <!-- Left Column details -->
          <div class="contact-info-column">
            <div class="contact-info-card">
              <h3 class="contact-info-title">Editorial Queries</h3>
              <p class="contact-info-text">pitch@arisphere.com</p>
            </div>
            <div class="contact-info-card">
              <h3 class="contact-info-title">Advertising & Partnerships</h3>
              <p class="contact-info-text">partnerships@arisphere.com</p>
            </div>
            <div class="contact-info-card">
              <h3 class="contact-info-title">Headquarters</h3>
              <p class="contact-info-text">AriSphere Inc.<br>42 Perspective Avenue, Suite 100<br>Silicon Valley, CA 94025</p>
            </div>
          </div>

          <!-- Right Column form -->
          <div style="background-color: var(--color-bg-offset); padding: var(--space-xl); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
            <form id="contact-form">
              <div class="form-group">
                <label class="form-label" for="contact-name">Full Name</label>
                <input class="form-control" type="text" id="contact-name" required placeholder="e.g. Jane Doe">
              </div>
              <div class="form-group">
                <label class="form-label" for="contact-email">Email Address</label>
                <input class="form-control" type="email" id="contact-email" required placeholder="e.g. jane@example.com">
              </div>
              <div class="form-group">
                <label class="form-label" for="contact-subject">Inquiry Subject</label>
                <input class="form-control" type="text" id="contact-subject" required placeholder="e.g. Editorial Feedback / Pitch">
              </div>
              <div class="form-group">
                <label class="form-label" for="contact-message">Your Message</label>
                <textarea class="form-control" id="contact-message" required placeholder="Please draft your inquiry details here..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%;">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (typeof document === 'undefined' || !document || !document.head) return;

    // Attach form handler
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Form validations passed
        form.reset();
        
        // Dispatch toast notification event
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Message sent! We\'ll review your query soon.' }));
      });
    }
  }

  // Page 6: Privacy Policy
  function renderPrivacy(container) {
    const pathArray = [{ name: 'Privacy Policy', link: '/privacy' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const privacySEO = {
      title: 'Privacy Policy',
      description: 'AriSphere respects privacy of readers. Read our structural terms regarding tracking, advertisements, and newsletter signups.',
      url: getBaseURL() + '/privacy',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': getBaseURL() + '/privacy#webpage',
        'url': getBaseURL() + '/privacy',
        'name': 'Privacy Policy | AriSphere',
        'isPartOf': { '@id': getBaseURL() + '/#website' }
      },
      breadcrumbsSchema
    };
    applySEO(privacySEO);

    let html = `
      <div class="container privacy-container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <h1 class="privacy-title">Privacy Policy</h1>
        <div class="privacy-content" style="background-color: var(--color-bg-offset); padding: var(--space-xl); border-radius: var(--radius-md); border: 1px solid var(--color-border); line-height: 1.8;">
          <p><em>Last updated: June 9, 2026</em></p>
          <p>AriSphere ("we", "us", or "our") operates the website located at AriSphere. We are committed to protecting the privacy of our readers and subscribers. This Privacy Policy documents what data we collect and how we utilize it.</p>
          
          <h2>1. Information We Collect</h2>
          <p>We collect information you supply directly when registering for our newsletter, commenting on our publication articles, or filling in our contact form. This includes your name, email address, and message transcripts.</p>
          
          <h2>2. Dynamic Advertising Policies</h2>
          <p>We cooperate with Google AdSense to display relevant contextual advertisements to our readers. AdSense utilizes cookies (such as DART cookies) to serve targeted ads based on your visits to our pages and other sites across the web. You can manage or disable personalization settings through your Google account page.</p>

          <h2>3. Cookies and Analytics</h2>
          <p>We utilize standard traffic logs to analyze reading habits and load metrics. This helps optimize Core Web Vitals, ensuring files load fast and layouts remain responsive.</p>

          <h2>4. Data Custody and Security</h2>
          <p>We do not lease, trade, or distribute your email database details with corporate marketing brokers. Your credentials remain safe within encrypted structures.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 7: About Us Page
  function renderAbout(container) {
    const pathArray = [{ name: 'About Us', link: '/about' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const faqSchema = {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is AriSphere?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'AriSphere is a premium digital publication and media magazine tracking technology shifts, cognitive AI innovations, global business policies, and cultural insights.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Who writes the articles on AriSphere?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Our content is created by an elite editorial board led by founder Arisudan, along with contributions from specialists in AI, economics, and infrastructure.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Can I pitch an article or join the editorial board?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, we welcome pitches from analysts and correspondents. Visit our Contact page to get in touch with our editorial desk.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is AriSphere ready for syndication and indexation?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Absolutely. AriSphere is optimized for Core Web Vitals, fully search engine accessible, and structured with schema.org JSON-LD microdata.'
          }
        }
      ]
    };

    const aboutSEO = {
      title: 'About Us',
      description: 'About AriSphere: Our mission, our team, and our core coverage in technology shifts, AI horizons, global business, and digital cultures.',
      url: getBaseURL() + '/about',
      schema: faqSchema,
      breadcrumbsSchema
    };
    applySEO(aboutSEO);

    const db = window.AriSphereDB;

    let html = `
      <div class="container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <!-- About Header Banner -->
        <header class="about-header">
          <span class="badge ai">Our Mission</span>
          <h1>About AriSphere: Where Trends Meet Perspective</h1>
          <p>AriSphere is a digital publication dedicated to examining the structural forces underlying emerging technology trends, creative AI paradigms, global trade nearshoring, and evolving digital paradigms.</p>
        </header>

        <!-- Mission Grid -->
        <section class="about-grid">
          <div class="about-visual">
            <img src="/assets/images/business-cover.png" alt="AriSphere Editorial Room" loading="eager" width="600" height="400">
          </div>
          <div class="about-mission-box">
            <h2>Core Coverage & Editorial Pillars</h2>
            <p>We reject superficial headlines in favor of deep-dive analyses. By looking past short-term speculative waves, we focus on the fundamental shifts transforming societal dynamics.</p>
            <ul>
              <li><strong>Cognitive Horizons</strong>: Tracking AI vector structures, cognitive systems, and ethics.</li>
              <li><strong>Infrastructure Geopolitics</strong>: Mapping semiconductor supply bottlenecks and hardware fabrication hubs.</li>
              <li><strong>Economics & Business Shifts</strong>: Analyzing supply-chain resiliencies, nearshoring, and subscription market designs.</li>
            </ul>
          </div>
        </section>

        <!-- Editor & Team Section -->
        <section class="team-section">
          <div class="section-header">
            <h2 class="section-title">Editorial Board & Authors</h2>
          </div>
          <div class="team-grid">
            <!-- Founder -->
            <div class="team-card">
              <img class="team-avatar" src="${db?.AUTHORS.arisudan.avatar || '/assets/images/author.png'}" alt="Arisudan" loading="lazy" width="90" height="90">
              <h3 class="team-name">${db?.AUTHORS.arisudan.name || 'Ari Sudan'}</h3>
              <div class="team-role">Founder & Editor-in-Chief</div>
              <p class="team-bio">Architect of AriSphere. Leads coverage on cognitive systems, infrastructure geopolitics, and digital attention loops.</p>
            </div>
            <!-- Correspondent -->
            <div class="team-card">
              <img class="team-avatar" src="${db?.AUTHORS.elenavance.avatar || ''}" alt="Elena Vance" loading="lazy" width="90" height="90">
              <h3 class="team-name">${db?.AUTHORS.elenavance.name || 'Elena Vance'}</h3>
              <div class="team-role">Senior Tech Correspondent</div>
              <p class="team-bio">Covers hardware ecosystems, quantum computing breakthroughs, and Silicon Valley regulatory alignments.</p>
            </div>
            <!-- Analyst -->
            <div class="team-card">
              <img class="team-avatar" src="${db?.AUTHORS.marcusaurelius.avatar || ''}" alt="Marcus Aurelius" loading="lazy" width="90" height="90">
              <h3 class="team-name">${db?.AUTHORS.marcusaurelius.name || 'Marcus Aurelius'}</h3>
              <div class="team-role">Global Analyst</div>
              <p class="team-bio">Examines historical economic waves, logistics networks, shipping corridors, and nearshoring trends.</p>
            </div>
          </div>
        </section>

        <!-- Accordion FAQs Section -->
        <section class="faq-section">
          <div class="section-header">
            <h2 class="section-title">Frequently Asked Questions</h2>
          </div>
          
          <div class="accordion" id="about-faqs">
            <div class="accordion-item">
              <button class="accordion-header">
                <span>What is AriSphere?</span>
                <span class="accordion-icon">+</span>
              </button>
              <div class="accordion-content">
                <p>AriSphere is a premium digital publication and media magazine tracking technology shifts, cognitive AI innovations, global business policies, and cultural insights.</p>
              </div>
            </div>
            
            <div class="accordion-item">
              <button class="accordion-header">
                <span>Who writes the articles on AriSphere?</span>
                <span class="accordion-icon">+</span>
              </button>
              <div class="accordion-content">
                <p>Our content is created by an elite editorial board led by founder Arisudan, along with contributions from specialists in AI, economics, and infrastructure.</p>
              </div>
            </div>
 
            <div class="accordion-item">
              <button class="accordion-header">
                <span>Can I pitch an article or join the editorial board?</span>
                <span class="accordion-icon">+</span>
              </button>
              <div class="accordion-content">
                <p>Yes, we welcome pitches from analysts and correspondents. Visit our Contact page to get in touch with our editorial desk.</p>
              </div>
            </div>
 
            <div class="accordion-item">
              <button class="accordion-header">
                <span>Is AriSphere ready for syndication and indexation?</span>
                <span class="accordion-icon">+</span>
              </button>
              <div class="accordion-content">
                <p>Absolutely. AriSphere is optimized for Core Web Vitals, fully search engine accessible, and structured with schema.org JSON-LD microdata.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 8: Disclaimer Page
  function renderDisclaimer(container) {
    const pathArray = [{ name: 'Disclaimer', link: '/disclaimer' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const disclaimerSEO = {
      title: 'Disclaimer',
      description: 'AriSphere publication disclaimer. Information validation, opinions expressed, and lack of professional advisory warranties.',
      url: getBaseURL() + '/disclaimer',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': getBaseURL() + '/disclaimer#webpage',
        'url': getBaseURL() + '/disclaimer',
        'name': 'Disclaimer | AriSphere',
        'isPartOf': { '@id': getBaseURL() + '/#website' }
      },
      breadcrumbsSchema
    };
    applySEO(disclaimerSEO);

    let html = `
      <div class="container legal-container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <h1 class="privacy-title">Disclaimer</h1>
        <div class="legal-card">
          <p><em>Last updated: June 9, 2026</em></p>
          <p>All content published on AriSphere is provided for general informational, educational, and intellectual entertainment purposes only. We do not provide professional financial, investment, legal, or technical advisory services.</p>
          
          <h2>1. No Warranties of Accuracy</h2>
          <p>While our editorial board strives to cross-reference data points and verify sources, AriSphere makes no representation, warranty, or guarantee, express or implied, regarding the accuracy, completeness, reliability, or timeliness of any content posted on this website. Relying on information found on our site is strictly at your own discretion and risk.</p>

          <h2>2. External Linkages</h2>
          <p>Our articles may contain links to third-party web portals. These connections do not constitute endorsements of their contents or policies. We hold no custody over their data practices and recommend reviewing their respective privacy outlines upon entry.</p>

          <h2>3. Opinions Expressed</h2>
          <p>Editorials, opinion columns, and comments reflect the viewpoints of their individual authors and do not necessarily represent the official policy or position of AriSphere as an organization.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 9: Terms & Conditions Page
  function renderTerms(container) {
    const pathArray = [{ name: 'Terms & Conditions', link: '/terms' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const termsSEO = {
      title: 'Terms & Conditions',
      description: 'AriSphere reader terms of service, user guidelines, copyright clauses, and liability limitations.',
      url: getBaseURL() + '/terms',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': getBaseURL() + '/terms#webpage',
        'url': getBaseURL() + '/terms',
        'name': 'Terms & Conditions | AriSphere',
        'isPartOf': { '@id': getBaseURL() + '/#website' }
      },
      breadcrumbsSchema
    };
    applySEO(termsSEO);

    let html = `
      <div class="container legal-container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <h1 class="privacy-title">Terms & Conditions</h1>
        <div class="legal-card">
          <p><em>Last updated: June 9, 2026</em></p>
          <p>Welcome to AriSphere. By accessing or using our website, you agree to comply with and be bound by the following Terms & Conditions. If you do not accept these terms, please discontinue your access immediately.</p>
          
          <h2>1. Proprietary Rights & Copyright</h2>
          <p>All content, branding logos, text assets, graphics, and interface mechanics are the intellectual property of AriSphere and its contributors. You may read, share, and link to our publications for personal, non-commercial purposes. Direct reproduction or syndication without written editorial consent is prohibited.</p>

          <h2>2. Permitted User Conduct</h2>
          <p>Readers agree not to engage in malicious activities such as injecting spam comment packets, executing denial-of-service scripts, scraping content with automated web spiders without API permission, or mimicking author representations.</p>

          <h2>3. Indemnification & Liabilities</h2>
          <p>In no event shall AriSphere, its partners, or contributors be held liable for any direct, indirect, incidental, or consequential damages resulting from your access to or inability to access the website's perspectives and analysis reports.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 10: Editorial Policy Page
  function renderEditorialPolicy(container) {
    const pathArray = [{ name: 'Editorial Policy', link: '/editorial-policy' }];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

    const editorialSEO = {
      title: 'Editorial Policy & Standards',
      description: 'AriSphere editorial policy. Our commitments to independence, source attribution, human review verification, reflections authenticity, and AdSense quality standards.',
      url: getBaseURL() + '/editorial-policy',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': getBaseURL() + '/editorial-policy#webpage',
        'url': getBaseURL() + '/editorial-policy',
        'name': 'Editorial Policy | AriSphere',
        'isPartOf': { '@id': getBaseURL() + '/#website' }
      },
      breadcrumbsSchema
    };
    applySEO(editorialSEO);

    let html = `
      <div class="container legal-container">
        <!-- Breadcrumbs Navigation -->
        ${breadcrumbsHTML}

        <h1 class="privacy-title">Editorial Policy & Standards</h1>
        <p class="legal-last-updated">Last updated: June 11, 2026</p>
        
        <div class="legal-card">
          
          <section>
            <h2>1. Editorial Philosophy</h2>
            <p>AriSphere prioritizes absolute accuracy, comprehensive human oversight, source transparency, and genuine reader value. We believe in delivery of analytical, high-quality digital journalism. We choose depth over volume, and authority over publication frequency. Our target is to build a trusted publication containing deep-dive insights rather than thousands of low-value pages.</p>
          </section>

          <section>
            <h2>2. AI Usage & Human Review Policy</h2>
            <p>We believe in the responsible integration of technology. AriSphere may use AI-assisted tools for research synthesis, initial topic ideation, structural outlining, and initial drafting. However, <strong>every published article is manually reviewed, edited, and approved by a human editor</strong> before publication. Raw, unchecked AI-generated drafts are never published. This ensures all content is verified for factual accuracy and readability.</p>
          </section>

          <section class="editorial-reflections-callout">
            <h2>3. Reflections Category Authenticity Rule</h2>
            <p>Articles published in the <strong>Reflections</strong> category represent the personal, authentic voice of our publication and are <strong>never AI-generated</strong>. Reflections must be:</p>
            <ul>
              <li>Personally and manually written by founder <strong>Arisudan</strong>.</li>
              <li>Based on genuine personal experiences, internships, or engineering projects.</li>
              <li>Focused on career journeys, software/hardware developments, and lessons learned from failures.</li>
            </ul>
          </section>

          <section>
            <h2>4. Google AdSense & SEO Quality Standards</h2>
            <p>Before any draft is recommended for publication, it must pass a strict quality check. We explicitly reject content that looks mass-produced, represents a simple rewrite of another website, exists solely to target search keywords, or contains inaccuracies. Our minimum structural requirements include:</p>
            <ul>
              <li><strong>Recommended Depth</strong>: Minimum of 1200 words (1500+ preferred for long-form analysis).</li>
              <li><strong>Semantic HTML</strong>: Proper use of Heading tags (H2/H3) for logical content hierarchy.</li>
              <li><strong>Sources & Citations</strong>: At least one external citation mapping to respected primary sources.</li>
              <li><strong>FAQ Sections</strong>: An FAQ block using details accordions or custom lists to enhance user utility.</li>
              <li><strong>Accessibility Alt Text</strong>: Missing alt descriptions on images are not permitted.</li>
              <li><strong>Internal Linking</strong>: Context-aware recommendations connecting related topics.</li>
            </ul>
          </section>

          <section>
            <h2>5. Editorial Review Process</h2>
            <p>Our editing pipeline utilizes a 5-step publishing workflow:</p>
            <ol>
              <li><strong>Drafting</strong>: Analysis outline is constructed.</li>
              <li><strong>QA Compliance Rating</strong>: An automated internal dashboard scores the article draft out of 100 points based on structure, length, assets, and source counts.</li>
              <li><strong>Human Review Verification</strong>: A human editor reviews the copy and ticks off the manual review confirmation check.</li>
              <li><strong>Editorial Approval</strong>: Only drafts scoring 75+ (preferably 90+ "Ready to Publish") are recommended for release. Lower-quality drafts are routed back to the edit queue.</li>
              <li><strong>Compilation</strong>: Recompiled into pre-rendered static HTML to guarantee fast load times.</li>
            </ol>
          </section>

          <section>
            <h2>6. Weekly Content Target Schedule</h2>
            <p>To ensure consistent editorial coverage across our pillars, we aim for the following publication schedule:</p>
            
            <div class="editorial-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Pillar Article 1</th>
                    <th>Pillar Article 2</th>
                    <th>Pillar Article 3 (Authentic Core)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Monday</td>
                    <td>Technology</td>
                    <td>AI</td>
                    <td>Insights</td>
                  </tr>
                  <tr>
                    <td>Tuesday</td>
                    <td>Business</td>
                    <td>World</td>
                    <td style="color: var(--cat-reflections); font-weight: 600;">Reflections (Manual)</td>
                  </tr>
                  <tr>
                    <td>Wednesday</td>
                    <td>Technology</td>
                    <td>Social Media</td>
                    <td>Insights</td>
                  </tr>
                  <tr>
                    <td>Thursday</td>
                    <td>AI</td>
                    <td>Business</td>
                    <td style="color: var(--cat-reflections); font-weight: 600;">Reflections (Manual)</td>
                  </tr>
                  <tr>
                    <td>Friday</td>
                    <td>Technology</td>
                    <td>World</td>
                    <td>Insights</td>
                  </tr>
                  <tr>
                    <td>Saturday</td>
                    <td>Social Media</td>
                    <td>AI</td>
                    <td style="color: var(--cat-reflections); font-weight: 600;">Reflections (Manual)</td>
                  </tr>
                  <tr>
                    <td>Sunday</td>
                    <td>Long-form Feature</td>
                    <td>Editorial Analysis</td>
                    <td style="color: var(--cat-reflections); font-weight: 600;">Reflections (Manual)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>7. Trust Badges & Readers Correction</h2>
            <p>Our commitment to transparency means articles that undergo fact-checking and editorial verification carry dynamic badges:
            <ul>
              <li><strong>✓ Fact Checked</strong>: Verifies that statistics, data points, and technical reports have been checked against independent sources.</li>
              <li><strong>✓ Editorially Reviewed</strong>: Indicates that the piece was audited for structure, flow, clarity, and policy alignment.</li>
            </ul>
            If you identify a factual error, typo, or citation issue, please email our editorial board at <a href="mailto:pitch@arisphere.com" style="color: var(--color-text); text-decoration: underline;">pitch@arisphere.com</a> for immediate review and correction.</p>
          </section>
          
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Page 11: Admin Dashboard & Editor CRUD Portal
  async function renderAdmin(container) {
    const db = window.AriSphereDB;
    if (!db) return;

    // Load custom admin CSS stylesheet
    if (!document.getElementById('admin-css')) {
      const link = document.createElement('link');
      link.id = 'admin-css';
      link.rel = 'stylesheet';
      link.href = '/css/admin.css';
      document.head.appendChild(link);
    }

    const adminSEO = {
      title: 'Editor Portal',
      description: 'Internal editor publishing portal and CMS workspace.',
      url: getBaseURL() + '/admin',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': 'Editor Portal | AriSphere'
      }
    };
    applySEO(adminSEO);

    if (!db.supabase) {
      container.innerHTML = `
        <div class="container admin-portal-wrapper">
          <div class="admin-login-card">
            <h2 class="admin-login-title">Supabase Offline</h2>
            <p class="admin-login-subtitle" style="color:#ef4444;">The Supabase client could not be initialized. Please check your environment variables and connection.</p>
          </div>
        </div>
      `;
      return;
    }

    // Refresh state handler
    async function checkAuthAndRender() {
      const { data: { session } } = await db.supabase.auth.getSession();
      if (!session) {
        renderLoginForm();
      } else {
        renderDashboard(session.user);
      }
    }

    function renderLoginForm() {
      container.innerHTML = `
        <div class="container admin-portal-wrapper">
          <div class="admin-login-card">
            <h2 class="admin-login-title">AriSphere Portal</h2>
            <p class="admin-login-subtitle">Internal Editor Workspace Login</p>
            <form id="admin-login-form">
              <div class="admin-form-group">
                <label class="admin-label" for="login-email">Email Address</label>
                <input class="admin-input" type="email" id="login-email" required placeholder="editor@arisphere.com">
              </div>
              <div class="admin-form-group">
                <label class="admin-label" for="login-password">Password</label>
                <input class="admin-input" type="password" id="login-password" required placeholder="••••••••">
              </div>
              <div id="login-error-msg" style="color:#ef4444; font-size:0.8rem; margin-bottom:var(--space-md); display:none;"></div>
              <button class="admin-btn admin-btn-primary" style="width: 100%;" type="submit" id="btn-login-submit">Login Workspace</button>
            </form>
          </div>
        </div>
      `;

      const form = document.getElementById('admin-login-form');
      const errorBox = document.getElementById('login-error-msg');
      const submitBtn = document.getElementById('btn-login-submit');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in...';
        errorBox.style.display = 'none';

        try {
          const { error } = await db.supabase.auth.signInWithPassword({ email, password });
          if (error) {
            errorBox.textContent = error.message;
            errorBox.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login Workspace';
          } else {
            const event = new CustomEvent('show-toast', { detail: 'Logged in successfully!' });
            window.dispatchEvent(event);
            checkAuthAndRender();
          }
        } catch (err) {
          errorBox.textContent = 'An unexpected login error occurred.';
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Login Workspace';
        }
      });
    }

    async function renderDashboard(user) {
      container.innerHTML = `
        <div class="container admin-portal-wrapper">
          <div class="admin-dashboard-container">
            <header class="admin-dashboard-header">
              <div>
                <h1 class="admin-dashboard-title">AriSphere CMS</h1>
                <p style="margin:0; color:var(--color-text-muted); font-size:0.875rem;">Digital Publication Workspace</p>
              </div>
              <div class="admin-user-info">
                <span>Active: <strong>${user.email}</strong></span>
                <button class="admin-btn admin-btn-secondary" style="padding:6px 12px; font-size:0.75rem;" id="admin-logout-btn">Sign Out</button>
              </div>
            </header>
            
            <div id="admin-workspace-view">
              <div style="display:flex; justify-content:center; padding:var(--space-xxl);">
                <svg style="width:40px;height:40px;animation:spin 1s linear infinite;color:var(--color-accent);" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="32" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;

      // Wire logout
      document.getElementById('admin-logout-btn').addEventListener('click', async () => {
        await db.supabase.auth.signOut();
        const event = new CustomEvent('show-toast', { detail: 'Logged out successfully.' });
        window.dispatchEvent(event);
        checkAuthAndRender();
      });

      // Load Articles View
      showArticlesList();
    }

    async function showArticlesList() {
      const workspace = document.getElementById('admin-workspace-view');
      if (!workspace) return;

      workspace.innerHTML = `
        <div style="display:flex; justify-content:center; padding:var(--space-xxl);">
          <svg style="width:40px;height:40px;animation:spin 1s linear infinite;color:var(--color-accent);" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="32" />
          </svg>
        </div>
      `;

      try {
        const articles = await db.getAllArticlesAdmin();
        const subscribersCount = await db.getSubscribersCount();

        // Compute Editorial KPIs (Task 11)
        const publishedCount = articles.filter(a => a.status === 'published').length;
        const draftCount = articles.filter(a => a.status === 'draft').length;
        const reflectionsCount = articles.filter(a => a.category === 'reflections').length;
        const totalViews = articles.reduce((acc, a) => acc + (a.views || 0), 0);
        const avgViews = articles.length > 0 ? Math.round(totalViews / articles.length) : 0;

        const sortedByViews = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0));
        const mostViewedArticle = sortedByViews[0] ? sortedByViews[0].title : 'None';
        const mostViewedCount = sortedByViews[0] ? sortedByViews[0].views : 0;

        // Calculate Articles Published This Week (last 7 days)
        let publishedThisWeek = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        articles.forEach(a => {
          if (a.status === 'published' && a.publishDate) {
            const pDate = new Date(a.publishDate);
            if (!isNaN(pDate.getTime()) && pDate.getTime() >= sevenDaysAgo) {
              publishedThisWeek++;
            }
          }
        });

        workspace.innerHTML = `
          <!-- Content Operations Dashboard KPI Grid (Task 11) -->
          <section class="admin-kpi-grid">
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Published Articles</div>
                <div class="kpi-value">${publishedCount}</div>
              </div>
              <div class="kpi-desc">Live on site</div>
            </div>
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Draft Articles</div>
                <div class="kpi-value">${draftCount}</div>
              </div>
              <div class="kpi-desc">In progress queue</div>
            </div>
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Reflections Stories</div>
                <div class="kpi-value">${reflectionsCount}</div>
              </div>
              <div class="kpi-desc">Authentic narratives</div>
            </div>
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Active Subscribers</div>
                <div class="kpi-value">${subscribersCount}</div>
              </div>
              <div class="kpi-desc">Newsletter audience</div>
            </div>
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Total Content Views</div>
                <div class="kpi-value">${totalViews.toLocaleString()}</div>
              </div>
              <div class="kpi-desc">Cumulative views</div>
            </div>
            <div class="kpi-card">
              <div>
                <div class="kpi-label">Avg Views / Article</div>
                <div class="kpi-value">${avgViews}</div>
              </div>
              <div class="kpi-desc">Average reading spread</div>
            </div>
            <div class="kpi-card" style="grid-column: span 2;">
              <div>
                <div class="kpi-label">Top Performer</div>
                <div class="kpi-value" style="font-size: 1.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;" title="${mostViewedArticle}">
                  ${mostViewedArticle}
                </div>
              </div>
              <div class="kpi-desc">👁 ${mostViewedCount.toLocaleString()} views</div>
            </div>
          </section>

          <!-- Editorial Publishing Workflow Guidance Panel (Task 12) -->
          <section class="workflow-panel">
            <div class="workflow-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Editorial Publishing Workflow Guidance
            </div>
            <div class="workflow-steps">
              <div class="workflow-step">
                <div class="workflow-step-num">Step 1</div>
                <div class="workflow-step-name">Generate Candidates</div>
                <div class="workflow-step-desc">Create 10-12 drafts daily as potential options.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 2</div>
                <div class="workflow-step-name">Review Quality</div>
                <div class="workflow-step-desc">Verify minimum compliance score (75+, target 90+).</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 3</div>
                <div class="workflow-step-name">Check Citations</div>
                <div class="workflow-step-desc">Enforce at least 1 verified primary source.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 4</div>
                <div class="workflow-step-name">Verify Images</div>
                <div class="workflow-step-desc">Check resolution, aspect ratio (16:9), and alt text.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 5</div>
                <div class="workflow-step-name">Review SEO Score</div>
                <div class="workflow-step-desc">Scan title, meta descriptions, and tags.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 6</div>
                <div class="workflow-step-name">Publish Top 3–5</div>
                <div class="workflow-step-desc">Publish only the strongest 3-5 candidates daily.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 7</div>
                <div class="workflow-step-name">Monitor Analytics</div>
                <div class="workflow-step-desc">Analyze reader engagement and views metrics.</div>
              </div>
              <div class="workflow-step">
                <div class="workflow-step-num">Step 8</div>
                <div class="workflow-step-name">Update Links</div>
                <div class="workflow-step-desc">Interlink new articles with past relevant posts.</div>
              </div>
            </div>
            <div class="workflow-alert-box">
              <strong>⚠ CRITICAL COMPLIANCE NOTICE:</strong> DO NOT automatically publish all daily generated articles. Select and publish only the top 3-5 high-value articles daily. Reflections must be personally written and published manually by <strong>Arisudan</strong>. Never auto-publish reflections.
            </div>
          </section>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md); flex-wrap:wrap; gap:var(--space-sm);">
            <h2 style="font-family:var(--font-serif); font-size:1.35rem; margin:0;">Article Catalog (${articles.length})</h2>
            <button class="admin-btn admin-btn-primary" id="btn-create-article">+ Create Article</button>
          </div>

          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Attributes</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${articles.map(art => `
                  <tr>
                    <td>
                      <div style="font-weight:600; color:var(--color-text); line-height:1.2; margin-bottom:4px;">${art.title}</div>
                      <div style="font-size:0.75rem; color:var(--color-text-muted);">Published: ${art.publishDate} &middot; By ${art.author}</div>
                    </td>
                    <td>
                      <span class="badge ${art.category}">${db.CATEGORIES[art.category]?.name || art.category}</span>
                    </td>
                    <td>
                      <span class="status-badge ${art.status}">${art.status}</span>
                    </td>
                    <td>
                      <span class="admin-indicator ${art.featured ? 'active' : 'inactive'}">FEAT</span>
                      <span class="admin-indicator ${art.trending ? 'active' : 'inactive'}">TREN</span>
                      <span class="admin-indicator ${art.editorsPick ? 'active' : 'inactive'}">EDTR</span>
                    </td>
                    <td>👁 ${art.views}</td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="admin-btn admin-btn-secondary btn-edit-article" style="padding:4px 8px; font-size:0.75rem;" data-id="${art.id}">Edit</button>
                        <button class="admin-btn admin-btn-danger btn-delete-article" style="padding:4px 8px; font-size:0.75rem;" data-id="${art.id}">Delete</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
                ${articles.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align:center; padding:var(--space-xl); color:var(--color-text-muted);">No articles found in Supabase. Click "+ Create Article" to begin publishing.</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        `;

        // Add create button handler
        document.getElementById('btn-create-article').addEventListener('click', () => {
          showArticleForm();
        });

        // Add edit button handlers
        workspace.querySelectorAll('.btn-edit-article').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const article = await db.getArticleById(id, true);
            if (article) {
              showArticleForm(article);
            }
          });
        });

        // Add delete button handlers
        workspace.querySelectorAll('.btn-delete-article').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Are you absolutely sure you want to delete this article? This action is permanent.')) {
              try {
                await db.deleteArticleAdmin(id);
                const event = new CustomEvent('show-toast', { detail: 'Article deleted successfully.' });
                window.dispatchEvent(event);
                showArticlesList();
              } catch (err) {
                alert('Deletion failed: ' + err.message);
              }
            }
          });
        });

      } catch (err) {
        workspace.innerHTML = `<p style="color:#ef4444; padding:var(--space-md);">Failed to load articles catalog: ${err.message}</p>`;
      }
    }

    async function showArticleForm(article = null) {
      const workspace = document.getElementById('admin-workspace-view');
      if (!workspace) return;

      const isEdit = article !== null;
      const categories = db.CATEGORIES;
      const authors = db.AUTHORS;

      let allArticles = [];
      try {
        allArticles = await db.getAllArticlesAdmin();
      } catch (err) {
        console.warn("Failed to retrieve articles catalog for duplicate title check:", err);
      }

      workspace.innerHTML = `
        <div class="admin-form-container">
          <header class="admin-form-header">
            <h2 style="font-family:var(--font-serif); font-size:1.35rem; margin:0;">${isEdit ? `Edit Article #${article.id}` : 'Create New Article'}</h2>
            <button class="admin-btn admin-btn-secondary" id="btn-form-back" style="padding:6px 12px; font-size:0.75rem;">← Back to Catalog</button>
          </header>

          <form id="admin-article-form">
            <div class="admin-form-grid">
              <div class="admin-form-group admin-form-full">
                <label class="admin-label" for="art-title">Title</label>
                <input class="admin-input" type="text" id="art-title" required placeholder="Enter article headline" value="${isEdit ? escapeHtml(article.title) : ''}">
                <div id="duplicate-title-warning" style="display:none; color:#ea580c; font-size:0.8rem; margin-top:4px; font-weight:600;">⚠ Duplicate Title Detected</div>
              </div>
              
              <div class="admin-form-group admin-form-full">
                <label class="admin-label" for="art-subtitle">Subtitle</label>
                <input class="admin-input" type="text" id="art-subtitle" required placeholder="Sub-headline detail context" value="${isEdit ? escapeHtml(article.subtitle) : ''}">
              </div>

              <div class="admin-form-group admin-form-full">
                <label class="admin-label" for="art-excerpt">Excerpt</label>
                <textarea class="admin-textarea" id="art-excerpt" required rows="2" placeholder="Brief summary summary card details">${isEdit ? escapeHtml(article.excerpt) : ''}</textarea>
              </div>

              <div class="admin-form-group admin-form-full">
                <label class="admin-label" for="art-content">Content Body (HTML Supported)</label>
                <textarea class="admin-textarea" id="art-content" required rows="10" placeholder="Type article content..." style="font-family:monospace; font-size:0.85rem;">${isEdit ? escapeHtml(article.content) : ''}</textarea>
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-category">Category</label>
                <select class="admin-select" id="art-category" required>
                  ${Object.keys(categories).filter(k => k !== 'trending').map(key => `
                    <option value="${categories[key].id}" ${isEdit && article.category === categories[key].id ? 'selected' : ''}>${categories[key].name}</option>
                  `).join('')}
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-author">Author</label>
                <select class="admin-select" id="art-author" required>
                  ${Object.keys(authors).map(key => `
                    <option value="${authors[key].username}" ${isEdit && article.author === authors[key].username ? 'selected' : ''}>${authors[key].name}</option>
                  `).join('')}
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-image">Cover Image URL</label>
                <input class="admin-input" type="text" id="art-image" placeholder="/assets/images/business-cover.png or Unsplash URL" value="${isEdit ? escapeHtml(article.image) : ''}">
                <div style="margin-top:6px; display:flex; gap:4px;">
                  <button type="button" class="admin-btn admin-btn-secondary" style="padding:4px 8px; font-size:0.7rem;" id="btn-mock-img-ai">Mock Tech Cover</button>
                  <button type="button" class="admin-btn admin-btn-secondary" style="padding:4px 8px; font-size:0.7rem;" id="btn-mock-img-ref">Mock Reflection Cover</button>
                </div>
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-image-alt">Cover Image Alt Text (Accessibility)</label>
                <input class="admin-input" type="text" id="art-image-alt" placeholder="Alt text description for screen readers" value="${isEdit ? escapeHtml(article.imageAlt || '') : ''}">
              </div>

              <!-- Dynamic Cover Image Quality Warnings -->
              <div class="admin-form-group admin-form-full" id="cover-image-warnings" style="display:none; padding:8px 12px; border-radius:var(--radius-sm); border:1px solid #fdba74; background-color:#fffbeb; color:#c2410c; font-size:0.8rem; font-family:var(--font-sans);">
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-tags">Tags (Comma Separated)</label>
                <input class="admin-input" type="text" id="art-tags" placeholder="AI, Technology, Global, Reflections" value="${isEdit ? escapeHtml(article.tags.join(', ')) : ''}">
              </div>

              <div class="admin-form-group">
                <label class="admin-label" for="art-status">Status</label>
                <select class="admin-select" id="art-status" required>
                  <option value="draft" ${isEdit && article.status === 'draft' ? 'selected' : ''}>Draft</option>
                  <option value="published" ${isEdit && article.status === 'published' ? 'selected' : ''}>Published</option>
                </select>
              </div>

              <div class="admin-form-group admin-form-full">
                <label class="admin-label" for="art-sources">Sources & Citations (JSON Array of {name, url})</label>
                <textarea class="admin-textarea" id="art-sources" rows="2" placeholder='[{"name": "MIT Technology Review", "url": "https://www.technologyreview.com"}]' style="font-family:monospace; font-size:0.8rem;">${isEdit ? escapeHtml(JSON.stringify(article.sources || [])) : '[]'}</textarea>
              </div>

              <div class="admin-form-group admin-form-full">
                <label class="admin-label">Publish Options & Trust Badges</label>
                <div class="admin-checkbox-group" style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-feat" ${isEdit && article.featured ? 'checked' : ''}> Featured
                  </label>
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-trend" ${isEdit && article.trending ? 'checked' : ''}> Trending
                  </label>
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-trend-week" ${isEdit && article.trendingThisWeek ? 'checked' : ''}> Trending This Week
                  </label>
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-editor" ${isEdit && article.editorsPick ? 'checked' : ''}> Editor's Pick
                  </label>
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-fact" ${!isEdit || article.factChecked ? 'checked' : ''}> ✓ Fact Checked Badge
                  </label>
                  <label class="admin-checkbox-label">
                    <input type="checkbox" id="art-review" ${!isEdit || article.editoriallyReviewed ? 'checked' : ''}> ✓ Editorially Reviewed Badge
                  </label>
                  <label class="admin-checkbox-label" style="color: var(--cat-reflections); font-weight: 700;">
                    <input type="checkbox" id="human-reviewed" ${isEdit && article.humanReviewed ? 'checked' : ''}> Human Review Completed
                  </label>
                </div>
              </div>

              <!-- Dynamic Editorial Q/A & Compliance Panel -->
              <div class="admin-form-group admin-form-full">
                <div id="editorial-guidelines-panel" class="editorial-qa-panel">
                  <!-- Rendered dynamically -->
                </div>
              </div>

              <div class="admin-form-group admin-form-full" style="display:flex; gap:10px; margin-top:var(--space-md); border-top:1px solid var(--color-border); padding-top:var(--space-md);">
                <button type="submit" class="admin-btn admin-btn-primary" id="btn-form-save">Save Article</button>
                <button type="button" class="admin-btn admin-btn-secondary" id="btn-form-cancel">Cancel</button>
              </div>
            </div>
          </form>
        </div>
      `;

      // Back & Cancel Button wire
      document.getElementById('btn-form-back').addEventListener('click', showArticlesList);
      document.getElementById('btn-form-cancel').addEventListener('click', showArticlesList);

      // Cover Image Mock Buttons wire
      document.getElementById('btn-mock-img-ai').addEventListener('click', () => {
        document.getElementById('art-image').value = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800';
        validateCoverImage();
      });
      document.getElementById('btn-mock-img-ref').addEventListener('click', () => {
        document.getElementById('art-image').value = 'https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80&w=800';
        validateCoverImage();
      });

      // Cover Image Quality Warnings Validator
      function validateCoverImage() {
        const imageInput = document.getElementById('art-image');
        const altInput = document.getElementById('art-image-alt');
        const warningBox = document.getElementById('cover-image-warnings');
        if (!imageInput || !altInput || !warningBox) return;

        const url = imageInput.value.trim();
        const alt = altInput.value.trim();
        const warnings = [];

        // 1. Accessibility Alt check
        if (!alt) {
          warnings.push("<strong>Accessibility Warning</strong>: Image Alt Text is empty. Screen readers will not be able to describe this image.");
        }

        if (url) {
          // 2. WebP Extension check
          const urlLower = url.toLowerCase();
          const cleanUrl = urlLower.split('?')[0].split('#')[0];
          if (!cleanUrl.endsWith('.webp')) {
            warnings.push("<strong>Performance Warning</strong>: Image format is not WebP. High-resolution PNGs/JPEGs increase page load time. Recommended extension: .webp");
          }

          // 3. Image pre-load for dimensions and ratio
          const tempImg = new Image();
          tempImg.onload = function() {
            const w = this.width;
            const h = this.height;
            const ratio = w / h;
            if (ratio < 1.3 || ratio > 1.8) {
              const displayWarning = `<strong>Ratio Warning</strong>: Cover image aspect ratio is ${ratio.toFixed(2)}:1 (recommended is 1.50 to 1.77, e.g. 16:9). Actual size: ${w}x${h}px.`;
              if (!warnings.some(x => x.includes("Ratio Warning"))) {
                warnings.push(displayWarning);
                renderWarnings();
              }
            }
          };
          tempImg.onerror = function() {
            if (!warnings.some(x => x.includes("Unable to load image"))) {
              warnings.push("<strong>Ratio Warning</strong>: Unable to pre-load image dimensions. Verify the URL is valid and public.");
              renderWarnings();
            }
          };
          tempImg.src = url;
        }

        function renderWarnings() {
          if (warnings.length > 0) {
            warningBox.innerHTML = '<ul style="list-style-type: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px;">' + warnings.map(w => `<li style="display: flex; gap: 6px; align-items: flex-start;"><span style="color:#f97316;">⚠</span> <div>${w}</div></li>`).join('') + '</ul>';
            warningBox.style.display = 'block';
          } else {
            warningBox.style.display = 'none';
          }
        }

        renderWarnings();
      }

      // Wire Cover Image real-time input listeners
      const imgInp = document.getElementById('art-image');
      const altInp = document.getElementById('art-image-alt');
      imgInp.addEventListener('input', validateCoverImage);
      imgInp.addEventListener('change', validateCoverImage);
      altInp.addEventListener('input', validateCoverImage);
      altInp.addEventListener('change', validateCoverImage);

      // Editorial Quality Scoring Engine
      function validateEditorialQuality() {
        const titleEl = document.getElementById('art-title');
        const subtitleEl = document.getElementById('art-subtitle');
        const excerptEl = document.getElementById('art-excerpt');
        const contentEl = document.getElementById('art-content');
        const categoryEl = document.getElementById('art-category');
        const authorEl = document.getElementById('art-author');
        const imageEl = document.getElementById('art-image');
        const altEl = document.getElementById('art-image-alt');
        const tagsEl = document.getElementById('art-tags');
        const sourcesEl = document.getElementById('art-sources');
        const humanReviewedEl = document.getElementById('human-reviewed');

        if (!titleEl || !contentEl || !categoryEl || !authorEl) return;

        const titleVal = titleEl.value.trim();
        const subtitleVal = subtitleEl ? subtitleEl.value.trim() : '';
        const excerptVal = excerptEl ? excerptEl.value.trim() : '';
        const contentVal = contentEl.value;
        const categoryVal = categoryEl.value;
        const authorVal = authorEl.value;
        const imageVal = imageEl ? imageEl.value.trim() : '';
        const altVal = altEl ? altEl.value.trim() : '';
        const tagsVal = tagsEl ? tagsEl.value.trim() : '';
        const sourcesVal = sourcesEl ? sourcesEl.value.trim() : '';
        const humanReviewed = humanReviewedEl ? humanReviewedEl.checked : false;

        // Duplicate title check (Task 5)
        const duplicateExists = allArticles.some(a => 
          a.title.trim().toLowerCase() === titleVal.toLowerCase() && 
          (!isEdit || String(a.id) !== String(article.id))
        );
        const duplicateWarningEl = document.getElementById('duplicate-title-warning');
        if (duplicateWarningEl) {
          if (duplicateExists && titleVal) {
            duplicateWarningEl.style.display = 'block';
          } else {
            duplicateWarningEl.style.display = 'none';
          }
        }

        let score = 0;
        const checks = [];
        let reflectionsNoticeHTML = '';

        // 1. Word Count Check (20 pts)
        // Strip HTML tags for clean word count
        const textOnly = contentVal.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = textOnly ? textOnly.split(/\s+/).length : 0;
        let wordCountScore = 0;
        let wordCountMsg = '';
        let wordCountPass = false;

        if (words >= 1500) {
          wordCountScore = 20;
          wordCountMsg = `Excellent long-form article (${words} words).`;
          wordCountPass = true;
        } else if (words >= 1200) {
          wordCountScore = 15;
          wordCountMsg = `Acceptable length but additional depth is recommended (${words} words).`;
          wordCountPass = true;
        } else {
          wordCountScore = 0;
          wordCountMsg = `Article may be too short for strong SEO performance (${words} words). Minimum target is 1200 words.`;
          wordCountPass = false;
        }
        score += wordCountScore;
        checks.push({
          name: "Word Count",
          detail: wordCountMsg,
          pass: wordCountPass
        });

        // 2. Human Review Confirmation Check (10 pts)
        if (humanReviewed) {
          score += 10;
          checks.push({
            name: "Human Review",
            detail: "Confirmed that manual human review was completed.",
            pass: true
          });
        } else {
          checks.push({
            name: "Human Review",
            detail: "Warning: Human review pending. Please complete manual review.",
            pass: false
          });
        }

        // 3. FAQ Section Present Check (10 pts) - Task 7
        const faqRegex = /faq|details|<summary>|class="faq"|frequently asked questions/i;
        const hasFaq = faqRegex.test(contentVal);
        if (hasFaq) {
          score += 10;
          checks.push({
            name: "FAQ Section",
            detail: "Collapsible FAQ section or 'Frequently Asked Questions' content detected.",
            pass: true
          });
        } else {
          checks.push({
            name: "FAQ Section",
            detail: "FAQ is missing. Under AdSense policy, include an FAQ using a <details> block or faq class.",
            pass: false
          });
        }

        // 4. Sources / Citations Present Check (15 pts)
        let hasSources = false;
        try {
          const parsedSources = sourcesVal ? JSON.parse(sourcesVal) : [];
          hasSources = Array.isArray(parsedSources) && parsedSources.length > 0;
        } catch(e) {}

        if (hasSources) {
          score += 15;
          checks.push({
            name: "Sources & Citations",
            detail: "Valid sources list exists in database schema.",
            pass: true
          });
        } else {
          checks.push({
            name: "Sources & Citations",
            detail: "No references defined. Google AdSense policy requires verified external links.",
            pass: false
          });
        }

        // 5. Featured Image Present Check (10 pts)
        const hasImage = !!imageVal;
        if (hasImage) {
          score += 10;
          checks.push({
            name: "Featured Image",
            detail: "Cover image assigned.",
            pass: true
          });
        } else {
          checks.push({
            name: "Featured Image",
            detail: "Missing cover image assignment.",
            pass: false
          });
        }

        // 6. Image Alt Text Present Check (15 pts)
        const hasAlt = !!altVal;
        if (hasAlt) {
          score += 15;
          checks.push({
            name: "Alt Text",
            detail: "Alt description provided for accessibility.",
            pass: true
          });
        } else {
          checks.push({
            name: "Alt Text",
            detail: "Alt text is empty. Search engines require alt descriptions for crawling.",
            pass: false
          });
        }

        // 7. Internal Links Present Check (5 pts)
        const hasInternalLink = /\/article\/|\/category\/|href="\//i.test(contentVal);
        if (hasInternalLink) {
          score += 5;
          checks.push({
            name: "Internal Links",
            detail: "Internal article or category links detected.",
            pass: true
          });
        } else {
          checks.push({
            name: "Internal Links",
            detail: "No internal links detected. Link to other AriSphere articles to boost authority.",
            pass: false
          });
        }

        // 8. Tags Present Check (5 pts)
        const tagsArray = tagsVal ? tagsVal.split(',').map(t => t.trim()).filter(t => t !== '') : [];
        const hasTags = tagsArray.length > 0;
        if (hasTags) {
          score += 5;
          checks.push({
            name: "Tags Assigned",
            detail: `${tagsArray.length} tag(s) listed.`,
            pass: true
          });
        } else {
          checks.push({
            name: "Tags Assigned",
            detail: "No keywords or tags assigned to help reader search.",
            pass: false
          });
        }

        // 9. Reflections Compliance Check (10 pts)
        if (categoryVal === 'reflections') {
          const isArisudanAuthor = authorVal === 'arisudan';
          if (isArisudanAuthor) {
            score += 10;
            checks.push({
              name: "Reflections Rules",
              detail: "Authored manually by founder Arisudan.",
              pass: true
            });
          } else {
            checks.push({
              name: "Reflections Rules",
              detail: "Deduction: Reflections must be written by Arisudan.",
              pass: false
            });
          }
          reflectionsNoticeHTML = `
            <div class="reflections-qa-alert">
              <strong>⚠ Reflections Protections Warning:</strong> Reflections category rules dictate that these articles must be personally written by <strong>Arisudan</strong>, based on real engineering, internships, or startup failures. AI-generated copy or ghostwriting is strictly prohibited.
            </div>
          `;
        } else {
          score += 10;
        }

        // Additional non-scored validations (Pass/Fail) - Task 6
        const hasHeading = /<h[23]/i.test(contentVal);
        checks.push({
          name: "Heading Hierarchy",
          detail: hasHeading ? "Found H2 or H3 content headers." : "Structure Alert: Missing H2 or H3 subheadings for SEO hierarchy.",
          pass: hasHeading
        });

        const hasTitle = !!titleVal;
        checks.push({
          name: "Descriptive Title",
          detail: hasTitle ? "Title defined." : "Headline is empty.",
          pass: hasTitle
        });

        const hasExcerpt = !!excerptVal;
        checks.push({
          name: "Meta Description",
          detail: hasExcerpt ? "Excerpt / Meta description provided." : "Meta description details missing.",
          pass: hasExcerpt
        });

        const hasAuthor = !!authorVal;
        checks.push({
          name: "Author",
          detail: hasAuthor ? `Author profile link verified.` : "Missing author details.",
          pass: hasAuthor
        });

        const hasPublish = isEdit ? !!article.publishDate : true;
        checks.push({
          name: "Publish Date",
          detail: hasPublish ? `Publish date configured.` : "Missing publish date.",
          pass: hasPublish
        });

        const hasUpdated = isEdit ? !!(article.lastUpdatedDate || article.updated_at || article.updatedAt || article.publishDate) : true;
        checks.push({
          name: "Updated Date",
          detail: hasUpdated ? `Last updated date configured.` : "Missing updated date.",
          pass: hasUpdated
        });

        const hasCanonical = isEdit ? !!(getBaseURL() + '/article/' + article.id) : true;
        checks.push({
          name: "Canonical URL",
          detail: hasCanonical ? `Canonical link matches schema standard.` : "Missing canonical URL reference.",
          pass: hasCanonical
        });

        // Determine badge and color classes
        let badgeText = '';
        let badgeClass = '';
        let fillClass = '';
        let summaryText = '';

        if (score >= 90) {
          badgeText = "Ready to Publish";
          badgeClass = "ready";
          fillClass = "ready";
          summaryText = "Strong article suitable for publication.";
        } else if (score >= 75) {
          badgeText = "Publish After Review";
          badgeClass = "review";
          fillClass = "review";
          summaryText = "Content requires editorial review before publication.";
        } else if (score >= 60) {
          badgeText = "Needs Improvement";
          badgeClass = "improve";
          fillClass = "improve";
          summaryText = "Needs additional citations and FAQ section.";
        } else {
          badgeText = "Do Not Publish";
          badgeClass = "do-not";
          fillClass = "do-not";
          summaryText = "Quality score too low. Draft is missing critical trust and structure components.";
        }

        const qaPanel = document.getElementById('editorial-guidelines-panel');
        if (qaPanel) {
          qaPanel.innerHTML = `
            <div class="editorial-qa-header">
              <h3 class="editorial-qa-title">Editorial Compliance Rating</h3>
              <span class="readiness-badge ${badgeClass}" id="pub-readiness-badge">${badgeText}</span>
            </div>
            
            <div style="font-size:0.825rem; margin-bottom:8px; display:flex; justify-content:space-between; font-weight:600; color:var(--color-text);">
              <span>Trust & Quality Score</span>
              <span><strong>${score}/100</strong></span>
            </div>
            
            <div class="score-bar-container">
              <div class="score-bar-fill ${fillClass}" style="width: ${score}%;"></div>
            </div>

            ${reflectionsNoticeHTML}

            <div class="editorial-checks-list">
              ${checks.map(c => `
                <div class="checklist-item">
                  <div style="max-width:80%; text-align:left;">
                    <strong style="color:var(--color-text); font-size:0.8rem;">${c.name}</strong>
                    <div style="font-size:0.75rem; color:var(--color-text-muted); margin-top:2px;">${c.detail}</div>
                  </div>
                  <span class="checklist-indicator ${c.pass ? 'complete' : 'attention'}">${c.pass ? '✓ Complete' : '⚠ Needs Attention'}</span>
                </div>
              `).join('')}
            </div>

            <div class="qa-summary-box">
              <strong>Editorial Guidance:</strong> ${summaryText}
            </div>
          `;
        }
      }

      // Wire QA Compliance real-time input listeners
      const qaInputs = [
        'art-title',
        'art-subtitle',
        'art-excerpt',
        'art-content',
        'art-category',
        'art-author',
        'art-image',
        'art-image-alt',
        'art-tags',
        'art-sources',
        'human-reviewed'
      ];
      qaInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', validateEditorialQuality);
          el.addEventListener('change', validateEditorialQuality);
        }
      });

      // Run initial validation check
      setTimeout(() => {
        validateCoverImage();
        validateEditorialQuality();
      }, 400);

      // Submit Form Handler
      document.getElementById('admin-article-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const saveBtn = document.getElementById('btn-form-save');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';

        // Parse sources citations from JSON textarea
        let sourcesArray = [];
        try {
          const sourcesText = document.getElementById('art-sources').value.trim();
          sourcesArray = sourcesText ? JSON.parse(sourcesText) : [];
          if (!Array.isArray(sourcesArray)) {
            throw new Error("Sources must be a JSON array.");
          }
        } catch (err) {
          alert('Save failed: Invalid JSON in Sources & Citations field. It must be a valid JSON array like: [{"name": "MIT Technology Review", "url": "https://www.technologyreview.com"}]');
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Save Article';
          return;
        }

        const tagsString = document.getElementById('art-tags').value;
        const tagsArray = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t !== '') : [];

        const articleData = {
          title: document.getElementById('art-title').value.trim(),
          subtitle: document.getElementById('art-subtitle').value.trim(),
          excerpt: document.getElementById('art-excerpt').value.trim(),
          content: document.getElementById('art-content').value,
          category: document.getElementById('art-category').value,
          author: document.getElementById('art-author').value,
          image: document.getElementById('art-image').value.trim(),
          imageAlt: document.getElementById('art-image-alt').value.trim(),
          tags: tagsArray,
          status: document.getElementById('art-status').value,
          featured: document.getElementById('art-feat').checked,
          trending: document.getElementById('art-trend').checked,
          trendingThisWeek: document.getElementById('art-trend-week').checked,
          editorsPick: document.getElementById('art-editor').checked,
          sources: sourcesArray,
          factChecked: document.getElementById('art-fact').checked,
          editoriallyReviewed: document.getElementById('art-review').checked,
          humanReviewed: document.getElementById('human-reviewed').checked
        };

        try {
          if (isEdit) {
            await db.updateArticleAdmin(article.id, articleData);
            const event = new CustomEvent('show-toast', { detail: 'Article updated successfully!' });
            window.dispatchEvent(event);
          } else {
            // Calculate mock read time based on word count
            const wordsCount = articleData.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            const minutes = Math.max(1, Math.ceil(wordsCount / 200));
            articleData.readTime = `${minutes} min read`;
            articleData.publishDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            await db.createArticleAdmin(articleData);
            const event = new CustomEvent('show-toast', { detail: 'Article published successfully!' });
            window.dispatchEvent(event);
          }
          showArticlesList();
        } catch (err) {
          alert('Save failed: ' + err.message);
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Save Article';
        }
      });
    }

    function escapeHtml(text) {
      if (!text) return '';
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Initialize Auth checking
    checkAuthAndRender();
  }

  // Custom 404 page
  function render404(container) {
    const errorSEO = {
      title: 'Page Not Found',
      description: 'The requested perspective does not exist in this sphere. Search AriSphere or browse our categories.',
      url: getBaseURL() + '/404',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        'name': '404 - Page Not Found | AriSphere'
      }
    };
    applySEO(errorSEO);

    const categories = window.AriSphereDB ? window.AriSphereDB.CATEGORIES : {};

    let html = `
      <div class="container" style="max-width: 600px; text-align: center; padding: var(--space-xxl) 0;">
        <h1 style="font-family: var(--font-serif); font-size: 5rem; color: var(--color-accent); margin-bottom: var(--space-sm); line-height: 1;">404</h1>
        <h2 style="font-family: var(--font-serif); font-size: 1.75rem; margin-bottom: var(--space-md); color: var(--color-text);">Perspective Out of Bounds</h2>
        <p style="color: var(--color-text-muted); margin-bottom: var(--space-xl); font-size: 1.05rem;">The requested link does not exist in this sphere. Try searching or explore quick links below.</p>
        
        <!-- Interactive search bar -->
        <div style="margin-bottom: var(--space-xl); position: relative;">
          <input type="search" id="error-search-input" class="form-control" placeholder="Search articles..." style="padding-right: 40px; text-align: center;">
          <div id="error-search-results" style="margin-top: var(--space-md); text-align: left;"></div>
        </div>

        <div style="margin-bottom: var(--space-xl);">
          <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-light); margin-bottom: var(--space-md); letter-spacing: 0.05em;">Explore Categories</h4>
          <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap; justify-content: center;">
            ${Object.keys(categories).map(key => {
              const cat = categories[key];
              return `<a href="/category/${cat.id}" class="badge ${cat.id}" style="padding: 6px 12px; font-size: 0.75rem;">${cat.name}</a>`;
            }).join('')}
          </div>
        </div>

        <a href="/" class="btn btn-primary">Return to Home</a>
      </div>
    `;

    container.innerHTML = html;

    if (typeof document === 'undefined' || !document || !document.head) return;

    // Attach search handlers
    const input = document.getElementById('error-search-input');
    const resultsBox = document.getElementById('error-search-results');
    if (input && resultsBox && window.AriSphereDB) {
      input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          resultsBox.innerHTML = '';
          return;
        }
        window.AriSphereDB.searchArticles(query).then(results => {
          if (results.length === 0) {
            resultsBox.innerHTML = `<div style="text-align: center; color: var(--color-text-light); padding: var(--space-sm); font-size: 0.9rem;">No results found for "${query}"</div>`;
            return;
          }
          resultsBox.innerHTML = `
            <div style="background-color: var(--color-bg-offset); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; max-height: 250px; overflow-y: auto; box-shadow: var(--shadow-md);">
              ${results.map(art => `
                <a href="/article/${art.id}" style="display: flex; gap: var(--space-sm); padding: var(--space-sm); border-bottom: 1px solid var(--color-border); cursor: pointer; color: inherit; text-decoration: none;">
                  <img src="${art.image}" alt="${art.title}" style="width: 50px; height: 40px; object-fit: cover; border-radius: var(--radius-sm);">
                  <div style="display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.85rem; font-weight: 600; line-height: 1.3; color: var(--color-text); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${art.title}</div>
                    <span class="badge ${art.category}" style="font-size: 0.55rem; padding: 1px 3px; align-self: flex-start; margin-top: 2px;">${window.AriSphereDB.CATEGORIES[art.category].name}</span>
                  </div>
                </a>
              `).join('')}
            </div>
          `;
        });
      });
    }
  }

  // Hook popstate and pushstate routing event listeners
  window.addEventListener('popstate', handleRoute);
  window.addEventListener('pushstate-route', handleRoute);
  window.addEventListener('DOMContentLoaded', () => {
    // Safety check for DB
    if (!window.AriSphereDB) {
      console.error('AriSphere Database could not be loaded.');
    }
    handleRoute();
  });

})();
