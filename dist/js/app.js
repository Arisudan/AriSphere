/* Global Application Controller - AriSphere Version 2 */

document.addEventListener('DOMContentLoaded', async () => {
  const db = window.AriSphereDB;
  if (!db) {
    console.error('Database connection failed.');
    return;
  }

  // Client-safe DOMPurify XSS Sanitizer wrapper
  function safeSanitize(html) {
    if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(html);
    }
    return html;
  }

  // Safe LocalStorage Wrapper to prevent crashes when storage is disabled
  const safeStorage = {
    getItem: (key) => {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem: (key, val) => {
      try { localStorage.setItem(key, val); } catch (e) {}
    }
  };

  // --- 1. Light / Dark Theme Management ---
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = safeStorage.getItem('theme') || 'light';
  
  // Set initial theme
  document.documentElement.setAttribute('data-theme', storedTheme);
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      safeStorage.setItem('theme', newTheme);
      
      // Toast notification
      showToast(`Switched to ${newTheme} theme`);
    });
  }

  // --- 2. Mobile Drawer Navigation ---
  const hamburgerBtn = document.getElementById('mobile-hamburger');
  const navMenu = document.getElementById('nav-menu');
  
  if (hamburgerBtn && navMenu) {
    // Set initial state
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.setAttribute('aria-controls', 'nav-menu');

    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('mobile-active');
      const isActive = navMenu.classList.contains('mobile-active');
      if (isActive) {
        document.body.classList.add('menu-open');
      } else {
        document.body.classList.remove('menu-open');
      }
      hamburgerBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      hamburgerBtn.innerHTML = isActive 
        ? `<svg style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
        : `<svg style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        if (navMenu.classList.contains('mobile-active')) {
          navMenu.classList.remove('mobile-active');
          document.body.classList.remove('menu-open');
          hamburgerBtn.setAttribute('aria-expanded', 'false');
          hamburgerBtn.innerHTML = `<svg style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
        }
      }
    });

    // Close menu on navigation link click
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-active');
        document.body.classList.remove('menu-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.innerHTML = `<svg style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
      });
    });
  }

  // --- 3. Dynamic News Ticker (Breaking News) ---
  const tickerContainer = document.getElementById('ticker-content');
  if (tickerContainer) {
    const trendingArticles = await db.getTrendingArticles(6);
    // Double items to create endless scrolling effect
    const tickerItems = [...trendingArticles, ...trendingArticles];
    
    tickerContainer.innerHTML = tickerItems.map(art => `
      <a class="ticker-item" href="/article/${art.id}">
        ⚡ ${safeSanitize(art.title)}
      </a>
    `).join('');
  }

  // --- 4. Global Search Dialog Overlay (With Trapped WCAG Focus & Accessibility) ---
  const searchToggleBtn = document.getElementById('search-toggle');
  const searchModal = document.getElementById('search-modal');
  const closeSearchBtn = document.getElementById('close-search');
  const searchInput = document.getElementById('search-input');
  const searchResultsBox = document.getElementById('search-results');

  if (searchToggleBtn && searchModal && closeSearchBtn && searchInput && searchResultsBox) {
    let activeTriggerElement = null;

    const openSearch = () => {
      activeTriggerElement = document.activeElement; // Track the element that triggered the modal
      searchModal.classList.add('active');
      searchModal.setAttribute('aria-hidden', 'false');
      if (searchToggleBtn) searchToggleBtn.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      searchResultsBox.innerHTML = '<div class="search-no-results">Type keywords to search our publications...</div>';
      setTimeout(() => searchInput.focus(), 150);
    };

    const closeSearch = () => {
      searchModal.classList.remove('active');
      searchModal.setAttribute('aria-hidden', 'true');
      if (searchToggleBtn) {
        searchToggleBtn.setAttribute('aria-expanded', 'false');
        if (activeTriggerElement) {
          activeTriggerElement.focus();
        } else {
          searchToggleBtn.focus();
        }
      }
    };

    // Toggle Search Modal Active
    searchToggleBtn.addEventListener('click', openSearch);
    closeSearchBtn.addEventListener('click', closeSearch);

    // Close search on ESC key or Trap focus within the modal
    window.addEventListener('keydown', (e) => {
      if (searchModal.classList.contains('active')) {
        if (e.key === 'Escape') {
          closeSearch();
        } else if (e.key === 'Tab') {
          // Dynamic query of visible focusable items within search modal
          const focusable = Array.from(searchModal.querySelectorAll(
            'input, button, a[href]'
          )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);

          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
              if (document.activeElement === first) {
                last.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === last) {
                first.focus();
                e.preventDefault();
              }
            }
          } else {
            e.preventDefault();
          }
        }
      }
    });

    // Close search overlay and clear focus constraints on routing
    searchResultsBox.addEventListener('click', (e) => {
      const resultLink = e.target.closest('.search-result-item');
      if (resultLink) {
        // Only close search modal for normal left clicks (not Ctrl, Shift, Cmd, Alt, or middle clicks)
        if (!(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0)) {
          searchModal.classList.remove('active');
          searchModal.setAttribute('aria-hidden', 'true');
          if (searchToggleBtn) searchToggleBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Perform live database search indexing
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        searchResultsBox.innerHTML = '<div class="search-no-results">Type at least 2 characters to search...</div>';
        return;
      }

      db.searchArticles(query).then(results => {
        if (results.length === 0) {
          searchResultsBox.innerHTML = `<div class="search-no-results">No results found for "${query}"</div>`;
          return;
        }

        searchResultsBox.innerHTML = results.map(art => `
          <a class="search-result-item" href="/article/${art.id}">
            <img class="search-result-img" src="${art.image}" alt="${safeSanitize(art.title)}" loading="lazy" width="80" height="60">
            <div class="search-result-info">
              <h4 class="search-result-title">${safeSanitize(art.title)}</h4>
              <div class="search-result-meta">
                <span class="badge ${art.category}">${db.CATEGORIES[art.category].name}</span>
                <span class="card-meta-dot" style="display:inline-block; margin: 0 var(--space-xs); vertical-align:middle;"></span>
                <span>${art.publishDate}</span>
              </div>
            </div>
          </a>
        `).join('');
      });
    });
  }

  // --- 5. Newsletter Subscription Forms ---
  const newsletterForms = document.querySelectorAll('.newsletter-form');
  newsletterForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      if (emailInput && emailInput.value.trim()) {
        const email = emailInput.value.trim();
        
        // Extract Turnstile CAPTCHA token (Phase 7)
        const turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : '';
        
        // Show loading spinner on button
        const submitBtn = form.querySelector('button');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<svg style="width:18px;height:18px;animation:spin 1s linear infinite" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="32" /></svg>`;
        
        // Fetch newsletter subscription endpoint
        fetch('/api/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, turnstileToken })
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Subscription failed'); });
          }
          return response.json();
        })
        .then(data => {
          showToast(data.message || 'Successfully subscribed!');
          submitBtn.innerHTML = `✓ Subscribed`;
          emailInput.value = '';
          
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }, 3000);
        })
        .catch(error => {
          console.error('Newsletter API Error:', error);
          showToast(error.message || 'Subscription failed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        });
      }
    });
  });

  // --- 6. Global Custom Toast Event Handler ---
  window.addEventListener('show-toast', (e) => {
    if (e.detail) {
      showToast(e.detail);
    }
  });

  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg style="width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'toast-in var(--transition-normal) reverse forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3500);
  }

  // --- 7. Cookie Consent Banner Handler ---
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieAcceptBtn = document.getElementById('cookie-accept');
  const cookieDeclineBtn = document.getElementById('cookie-decline');

  if (cookieBanner && cookieAcceptBtn && cookieDeclineBtn) {
    const consent = safeStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after short delay for animations
      setTimeout(() => {
        cookieBanner.style.display = 'block';
        setTimeout(() => cookieBanner.classList.add('active'), 50);
      }, 1000);
    } else if (consent === 'accepted') {
      initializeGA4();
    }

    cookieAcceptBtn.addEventListener('click', () => {
      safeStorage.setItem('cookie-consent', 'accepted');
      closeCookieBanner();
      initializeGA4();
      showToast('Analytics & personalization cookies accepted');
    });

    cookieDeclineBtn.addEventListener('click', () => {
      safeStorage.setItem('cookie-consent', 'declined');
      closeCookieBanner();
      showToast('Cookies declined. Privacy lock active.');
    });
  }

  function closeCookieBanner() {
    if (cookieBanner) {
      cookieBanner.classList.remove('active');
      setTimeout(() => {
        cookieBanner.style.display = 'none';
      }, 500);
    }
  }

  function initializeGA4() {
    if (typeof gtag === 'function') {
      gtag('config', 'G-Q6NZ4JZX2J', {
        'page_title': document.title,
        'page_path': window.location.pathname
      });
    }
  }

  // --- 8. Reading Progress Indicator scroll listener ---
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const isArticleView = window.location.pathname.startsWith('/article/');
      if (isArticleView) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = scrollPercent + '%';
      } else {
        progressBar.style.width = '0%';
      }
    });

    window.addEventListener('popstate', () => {
      progressBar.style.width = '0%';
    });
    window.addEventListener('pushstate-route', () => {
      progressBar.style.width = '0%';
    });
  }

  // --- 9. FAQ Accordion Toggling ---
  document.addEventListener('click', (e) => {
    const accordionHeader = e.target.closest('.accordion-header');
    if (accordionHeader) {
      const accordionItem = accordionHeader.closest('.accordion-item');
      if (accordionItem) {
        const accordion = accordionItem.closest('.accordion');
        const isAlreadyActive = accordionItem.classList.contains('active');
        
        // Collapse all items in the current accordion
        if (accordion) {
          accordion.querySelectorAll('.accordion-item').forEach(item => {
            item.classList.remove('active');
          });
        }
        
        // Toggle the clicked item
        if (!isAlreadyActive) {
          accordionItem.classList.add('active');
        }
      }
    }
  });

  // --- 10. Global URL Click Interceptor (HTML5 History API) ---
  document.addEventListener('click', (e) => {
    // Check for modifier keys or non-left-click buttons to preserve browser defaults (e.g. Open in New Tab)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    const anchor = e.target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      
      // Ensure we don't intercept mailto, tel, absolute external links, or hash targets
      if (href && href.startsWith('/') && !href.startsWith('//') && !anchor.getAttribute('target')) {
        const url = new URL(href, window.location.origin);
        
        // Check if origin matches
        if (url.origin === window.location.origin) {
          e.preventDefault();
          
          // Push state and dispatch routing update event
          window.history.pushState(null, '', href);
          window.dispatchEvent(new CustomEvent('pushstate-route'));
          
          // Collapse mobile menu if open
          if (navMenu && navMenu.classList.contains('mobile-active')) {
            navMenu.classList.remove('mobile-active');
            if (hamburgerBtn) {
              hamburgerBtn.innerHTML = `<svg style="width:24px;height:24px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`;
            }
          }
        }
      }
    }
  });

  // --- 11. Performance & Resize Optimization (Task 8) ---
  let resizeTimer;
  window.addEventListener('resize', () => {
    document.body.classList.add('resize-active');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      document.body.classList.remove('resize-active');
    }, 100);
  });

  // --- 12. Progressive Web App (PWA) Service Worker Registration (Phase 7F) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('ServiceWorker registered successfully:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed:', err));
    });
  }

  // --- 13. Observability & Monitoring Stubs (Phase 7E) ---
  window.Sentry = window.Sentry || {
    captureException: (err) => console.error('[Sentry Mock Log]:', err),
    captureMessage: (msg) => console.log('[Sentry Mock Log]:', msg)
  };
  window.posthog = window.posthog || {
    capture: (event, props) => console.log('[PostHog Mock Event]:', event, props)
  };

});

// Spinner CSS animation injection if not present
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);
