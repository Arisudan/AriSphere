/* client-side Router & SEO Controller - AriSphere Version 2 */

(function () {
  const ROUTER_CONTAINER_ID = 'main-viewport';
  
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
    '/editorial-policy': renderEditorialPolicy
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
  function getBaseURL() {
    return window.location.origin;
  }

  // SEO & Schema Injections
  function applySEO(meta) {
    const canonicalUrl = getBaseURL() + (window.location.pathname === '/' ? '' : window.location.pathname);
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
    schemaScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graphSchemas
    });

    // 7. GA4 SPA Virtual Page Tracking integration
    if (typeof gtag === 'function' && localStorage.getItem('cookie-consent') === 'accepted') {
      gtag('config', 'G-GA_MEASUREMENT_ID', {
        'page_title': finalTitle,
        'page_path': window.location.pathname
      });
    }
  }

  function setMetaTag(attribute, value, content) {
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
    let path = window.location.pathname || '/';
    
    // Normalize clean URL path redirects
    if (path.endsWith('/index.html')) {
      path = path.slice(0, -10);
    }
    if (path === '') path = '/';
    
    const viewport = document.getElementById(ROUTER_CONTAINER_ID);
    if (!viewport) return;
    
    // Add CSS transition fade-out class
    viewport.classList.add('fade-out');

    setTimeout(async () => {
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
    const trendingList = await db.getTrendingArticles(4);
    const latestList = await db.getLatestArticles(6);
    const mostRead = await db.getMostReadArticles(5);
    const trendingWeek = await db.getTrendingThisWeek(3);
    const editorsPicks = await db.getEditorsPicks(4);

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

        <!-- Hero Editorial Section -->
        <section class="hero-section">
          <div class="hero-featured-card card">
            <img class="hero-featured-img" src="${featured.image}" alt="${featured.title}" loading="eager" width="800" height="520">
            <div class="hero-featured-overlay"></div>
            <div class="hero-featured-content">
              <span class="badge ${featured.category}">${db.CATEGORIES[featured.category].name}</span>
              <h1 class="hero-featured-title">
                <a href="/article/${featured.id}">${featured.title}</a>
              </h1>
              <p class="hero-featured-desc">${featured.excerpt}</p>
              <div class="card-meta" style="color: #cbd5e1;">
                <span>By ${db.AUTHORS[featured.author].name}</span>
                <span class="card-meta-dot"></span>
                <span>${featured.publishDate}</span>
                <span class="card-meta-dot"></span>
                <span>${featured.readTime}</span>
              </div>
            </div>
          </div>

          <div class="hero-sidebar">
            <h3 class="widget-title">Trending This Week</h3>
            ${trendingWeek.map(art => `
              <div class="hero-sidebar-item" onclick="window.history.pushState(null, '', '/article/${art.id}'); window.dispatchEvent(new CustomEvent('pushstate-route'));">
                <img class="hero-sidebar-img" src="${art.image}" alt="${art.title}" loading="lazy" width="90" height="90">
                <div class="hero-sidebar-info">
                  <h4 class="hero-sidebar-title">${art.title}</h4>
                  <div class="card-meta">
                    <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                    <span>${art.readTime}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Inline Feed Advertisement Placement -->
        <div class="adsense-placement ad-infeed" id="adsense-home-infeed-1">
          <div class="adsense-label">In-Feed Responsive Placements</div>
          <div class="adsense-slot-info">Display fluid feed banner</div>
        </div>

        <!-- Latest Articles & Sidebar Column Grid -->
        <div class="grid-two-col">
          <section class="latest-section">
            <div class="section-header">
              <h2 class="section-title">Latest Perspective</h2>
              <a href="/category/technology" class="badge">View Tech Grid →</a>
            </div>
            <div class="grid-three-col" style="grid-template-columns: repeat(2, 1fr);">
              ${latestList.map(art => `
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
          </section>

          <!-- Sidebar Widgets -->
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
              <div class="adsense-placement ad-sidebar" id="adsense-home-sidebar">
                <div class="adsense-label">Sticky Rectangular Sidebar Ad</div>
                <div class="adsense-slot-info">Display size 300x250 / 300x600</div>
              </div>
            </div>
          </aside>
        </div>

        <!-- Editor's Picks Grid Section -->
        <section class="editors-picks-section" style="margin-top: var(--space-xl);">
          <div class="section-header">
            <h2 class="section-title">Editor's Picks</h2>
          </div>
          <div class="grid-three-col" style="grid-template-columns: repeat(4, 1fr);">
            ${editorsPicks.map(art => `
              <article class="card">
                <div class="card-img-wrapper" style="aspect-ratio: 16/9;">
                  <img class="card-img" src="${art.image}" alt="${art.title}" loading="lazy" width="300" height="170">
                </div>
                <div class="card-body" style="padding: var(--space-md);">
                  <div class="card-meta" style="margin-bottom: var(--space-xs);">
                    <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                  </div>
                  <h3 class="card-title" style="font-size: 1.05rem; margin-bottom: 0;">
                    <a href="/article/${art.id}">${art.title}</a>
                  </h3>
                </div>
              </article>
            `).join('')}
          </div>
        </section>

        <!-- Dynamic Category Matrix Links -->
        <section class="category-cards-section" style="margin-top: var(--space-xl);">
          <div class="section-header">
            <h2 class="section-title">Explore Categories</h2>
          </div>
          <div class="grid-three-col" style="grid-template-columns: repeat(6, 1fr); gap: var(--space-md);">
            ${Object.keys(db.CATEGORIES).filter(k => k !== 'trending').map(key => {
              const cat = db.CATEGORIES[key];
              return `
                <a href="/category/${cat.id}" class="badge ${cat.id}" style="text-align: center; padding: var(--space-md); font-size: 0.8rem; border-radius: var(--radius-md);">
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
              <div class="grid-three-col" style="grid-template-columns: repeat(2, 1fr);">
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

    // Increment view counter locally for realism
    article.views = (article.views || 0) + 1;

    // Dynamic Breadcrumbs
    const categoryInfo = db.CATEGORIES[article.category];
    const pathArray = [
      { name: categoryInfo.name, link: `/category/${categoryInfo.id}` },
      { name: article.title, link: `/article/${article.id}` }
    ];
    const breadcrumbsHTML = buildBreadcrumbsHTML(pathArray);
    const breadcrumbsSchema = buildBreadcrumbSchema(pathArray);

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
        'datePublished': new Date(article.publishDate).toISOString().split('T')[0],
        'dateModified': new Date(article.lastUpdatedDate).toISOString().split('T')[0],
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
      breadcrumbsSchema
    };
    applySEO(articleSEO);

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
                  <span>Updated: ${article.lastUpdatedDate}</span>
                  <span class="card-meta-dot"></span>
                  <span>${article.readTime}</span>
                </div>
                <h1 class="article-title">${article.title}</h1>
                <p class="article-subtitle">${article.subtitle}</p>

                <!-- Source Attribution Block -->
                <div style="font-size:0.775rem; color:var(--color-text-light); margin:-8px 0 16px; font-weight:600; font-family:var(--font-sans);">
                  Attribution: <span>${article.sourceAttribution}</span>
                </div>
                
                <!-- Author Bio Header -->
                <div class="article-author-meta">
                  <img class="author-avatar" style="width: 44px; height: 44px;" src="${authorInfo.avatar}" alt="${authorInfo.name}" loading="lazy" width="44" height="44">
                  <div>
                    <div style="font-weight: 700;"><a href="/author/${authorInfo.username}">${authorInfo.name}</a></div>
                    <div style="font-size: 0.75rem; color: var(--color-text-light);">${authorInfo.title}</div>
                  </div>
                </div>
              </header>

              <!-- Main Hero Image -->
              <img class="article-featured-img" src="${article.image}" alt="${article.title}" loading="eager" width="760" height="500">

              <!-- Typography Rich Body -->
              <div class="article-body-content">
                ${article.content}
              </div>

              <!-- Mid-Article Inline Ad Placement -->
              <div class="adsense-placement ad-infeed" id="adsense-mid-article">
                <div class="adsense-label">Mid-Article Responsive AdSense Banner</div>
                <div class="adsense-slot-info">Optimized for CTR</div>
              </div>

              <!-- Article Tags -->
              <div class="article-tags" style="display: flex; gap: var(--space-sm); flex-wrap: wrap; margin: var(--space-lg) 0;">
                ${article.tags.map(tag => `<span class="badge" style="background-color: var(--color-bg-offset); border: 1px solid var(--color-border); color: var(--color-text-muted); text-transform: none; font-weight: 500;">#${tag}</span>`).join('')}
              </div>

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
                      <p class="comment-text">Excellent read. The copyright discussion is key. If a model generates text, should public commons own it rather than corporate nodes?</p>
                    </div>
                  </div>
                </div>

                <!-- Add Comment Form -->
                <form class="comment-form" id="form-comment" style="background-color: var(--color-bg-offset); padding: var(--space-lg); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
                  <div class="form-group">
                    <label class="form-label" for="comment-user">Your Name</label>
                    <input class="form-control" type="text" id="comment-user" required placeholder="e.g. Alex Mercer">
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="comment-text">Add your comment</label>
                    <textarea class="form-control" id="comment-text" required placeholder="What are your thoughts on this perspective..."></textarea>
                  </div>
                  <button type="submit" class="btn btn-primary">Submit Comment</button>
                </form>
              </section>
            </article>
          </main>

          <!-- Sidebar Column -->
          <aside class="sidebar-column">
            <div class="sidebar-sticky">
              <!-- Related Articles -->
              <div class="widget">
                <h3 class="widget-title">Related Stories</h3>
                <div style="display: flex; flex-direction: column; gap: var(--space-md);">
                  ${related.map(art => `
                    <div style="display: flex; gap: var(--space-sm); cursor: pointer;" onclick="window.history.pushState(null, '', '/article/${art.id}'); window.dispatchEvent(new CustomEvent('pushstate-route'));">
                      <img style="width: 70px; height: 70px; object-fit: cover; border-radius: var(--radius-sm);" src="${art.image}" alt="${art.title}" loading="lazy" width="70" height="70">
                      <div>
                        <h4 style="font-size: 0.85rem; font-weight: 700; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${art.title}</h4>
                        <span class="badge ${art.category}" style="font-size: 0.6rem; padding: 2px 4px; margin-top: 4px;">${db.CATEGORIES[art.category].name}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Sidebar Ad Unit -->
              <div class="adsense-placement ad-sidebar" id="adsense-article-sidebar">
                <div class="adsense-label">Sticky Sidebar Ad Slot</div>
                <div class="adsense-slot-info">High-Viewability Rectangle 300x250</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    container.innerHTML = html;

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
            
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-text-light); margin-bottom: var(--space-md);">
              <span>Editorial Board Member</span>
              <span class="card-meta-dot" style="display:inline-block; margin: 0 var(--space-xs); vertical-align:middle;"></span>
              <span>${writtenArticles.length} publications on AriSphere</span>
            </div>

            <!-- Social and Contact Details -->
            <div class="author-profile-socials" style="display: flex; gap: var(--space-sm); align-items: center; margin-top: var(--space-md);">
              ${author.social?.twitter ? `
                <a href="${author.social.twitter}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Twitter X" title="Follow on X" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-full); border:1px solid var(--color-border); color:var(--color-text-muted); background-color:var(--color-bg-offset);">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              ` : ''}
              ${author.social?.linkedin ? `
                <a href="${author.social.linkedin}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="LinkedIn" title="Connect on LinkedIn" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-full); border:1px solid var(--color-border); color:var(--color-text-muted); background-color:var(--color-bg-offset);">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              ` : ''}
              ${author.social?.github ? `
                <a href="${author.social.github}" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="GitHub" title="View GitHub Profile" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-full); border:1px solid var(--color-border); color:var(--color-text-muted); background-color:var(--color-bg-offset);">
                  <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
                </a>
              ` : ''}
              ${author.contact ? `
                <a href="mailto:${author.contact}" class="social-icon" aria-label="Email Address" title="Send Email" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-full); border:1px solid var(--color-border); color:var(--color-text-muted); background-color:var(--color-bg-offset);">
                  <svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </a>
              ` : ''}
            </div>
          </div>
        </header>

        <!-- Dynamic list of articles authored -->
        <section class="author-articles-list">
          <div class="section-header">
            <h2 class="section-title">Authored by ${author.name}</h2>
          </div>
          <div class="grid-three-col" style="grid-template-columns: repeat(3, 1fr);">
            ${writtenArticles.map(art => `
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
                </div>
              </article>
            `).join('')}
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
          <h1 style="font-family: var(--font-serif); font-size: 2.75rem; font-weight: 700; margin: var(--space-xs) 0 var(--space-sm);">Where Trends Meet Perspective</h1>
          <p style="color: var(--color-text-muted); max-width: 700px; margin: 0 auto; font-size: 1.1rem; line-height: 1.6;">AriSphere is a digital publication dedicated to examining the structural forces underlying emerging technology trends, creative AI paradigms, global trade nearshoring, and evolving digital paradigms.</p>
        </header>

        <!-- Mission Grid -->
        <section class="about-grid">
          <div class="about-visual">
            <img src="/assets/images/business-cover.png" alt="AriSphere Editorial Room" style="width: 100%; height: auto; display: block; border-radius: var(--radius-lg);" loading="eager" width="600" height="400">
          </div>
          <div class="about-mission-box">
            <h2 style="font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; margin-bottom: var(--space-md);">Core Coverage & Editorial Pillars</h2>
            <p style="margin-bottom: var(--space-md); font-size: 0.975rem; color: var(--color-text-muted); line-height: 1.7;">We reject superficial headlines in favor of deep-dive analyses. By looking past short-term speculative waves, we focus on the fundamental shifts transforming societal dynamics.</p>
            <ul style="padding-left: var(--space-lg); margin-bottom: var(--space-md); font-size: 0.925rem; color: var(--color-text-muted); line-height: 1.8;">
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
        <section style="margin-bottom: var(--space-xxl);">
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
      title: 'Editorial Policy',
      description: 'AriSphere editorial policy. Our commitments to independence, source attribution, truth validation, and correction guidelines.',
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

        <h1 class="privacy-title">Editorial Policy</h1>
        <div class="legal-card">
          <p><em>Last updated: June 9, 2026</em></p>
          <p>AriSphere aims to deliver professional, objective, and analytically rich digital journalism. Our writers and analysts adhere to the following principles to maintain editorial integrity and trust.</p>
          
          <h2>1. Editorial Independence</h2>
          <p>Our coverage and analysis are determined solely by our editorial board. Sponsors, commercial partners, or advertisers hold no influence over our critical reporting, evaluations, or opinion conclusions.</p>

          <h2>2. Source Verification & Attribution</h2>
          <p>We believe in source transparent reporting. All data points, external scientific claims, and policy quote excerpts are explicitly attributed to their primary sources in our article footnotes and databases.</p>

          <h2>3. Ethics and Fact-Checking</h2>
          <p>Articles go through rigorous evaluation before publishing. When errors occur, we commit to correcting them promptly. Readers can submit correction requests to our editorial desk at pitch@arisphere.com.</p>
        </div>
      </div>
    `;

    container.innerHTML = html;
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
                <div style="display: flex; gap: var(--space-sm); padding: var(--space-sm); border-bottom: 1px solid var(--color-border); cursor: pointer;" onclick="window.history.pushState(null, '', '/article/${art.id}'); window.dispatchEvent(new CustomEvent('pushstate-route'));">
                  <img src="${art.image}" alt="${art.title}" style="width: 50px; height: 40px; object-fit: cover; border-radius: var(--radius-sm);">
                  <div style="display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 0.85rem; font-weight: 600; line-height: 1.3; color: var(--color-text); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${art.title}</div>
                    <span class="badge ${art.category}" style="font-size: 0.55rem; padding: 1px 3px; align-self: flex-start; margin-top: 2px;">${window.AriSphereDB.CATEGORIES[art.category].name}</span>
                  </div>
                </div>
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
