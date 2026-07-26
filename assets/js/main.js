(function () {
  // ---------- Theme ----------
  const saved = localStorage.getItem('t27-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  window.toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem('t27-theme', cur);
  };

  // ---------- Toast ----------
  function ensureToastHost() {
    let host = document.querySelector('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }
  
  window.toast = function (msg, type = 'ok') {
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { 
      el.style.transition = 'opacity .3s'; 
      el.style.opacity = '0'; 
      setTimeout(() => el.remove(), 320); 
    }, 2800);
  };

  // ---------- Render tool grids ----------
  function iconFor(name) { return (window.TOOL_ICONS && window.TOOL_ICONS[name]) || ''; }
  
  function renderTools(mountId, opts = {}) {
    const mount = document.getElementById(mountId);
    if (!mount || !window.TOOLS) return;
    
    const limit = opts.limit || window.TOOLS.length;
    // UPDATED: Removed .html for clean URLs
    mount.innerHTML = window.TOOLS.slice(0, limit).map(t => `
      <a href="/tools/${t.slug}" class="tool-card stagger-item" data-category="${t.category}" data-testid="tool-card-${t.slug}" data-slug="${t.slug}" data-name="${t.name.toLowerCase()}" data-tags="${t.tags.join(',')}">
        <div class="icon">${iconFor(t.icon)}</div>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
        <div class="meta"><span>${t.category}</span><span class="arrow">Open →</span></div>
      </a>
    `).join('');
    mount.classList.add('stagger');

    // parallax glow
    mount.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--x', (e.clientX - r.left) + 'px');
        card.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });
  }
  window.renderTools = renderTools;

  // ---------- Filter / Search ----------
  window.initToolFilter = function () {
    const chips = document.querySelectorAll('[data-filter]');
    const input = document.getElementById('tool-search');
    const grid = document.getElementById('tools-grid');

    function apply() {
      if (!grid) return;
      const active = document.querySelector('[data-filter].active')?.dataset.filter || 'all';
      const q = (input?.value || '').trim().toLowerCase();
      
      grid.querySelectorAll('.tool-card').forEach(card => {
        const cat = card.dataset.category;
        const name = card.dataset.name;
        const tags = card.dataset.tags;
        const catOk = active === 'all' || cat === active;
        const qOk = !q || name.includes(q) || tags.includes(q);
        card.style.display = (catOk && qOk) ? '' : 'none';
      });
    }
    
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      apply();
    }));
    
    input?.addEventListener('input', apply);
  };

  // ---------- Home search (type-ahead redirect) ----------
  window.initHomeSearch = function () {
    const input = document.getElementById('home-search');
    if (!input) return;
    
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = input.value.trim().toLowerCase();
        if (!q) return;
        const hit = window.TOOLS.find(t => t.name.toLowerCase().includes(q) || t.tags.some(tg => tg.includes(q)));
        // UPDATED: Removed .html for clean URLs
        if (hit) location.href = '/tools/' + hit.slug;
        else location.href = '/tools?q=' + encodeURIComponent(q);
      }
    });
  };

  // ---------- Initialization on DOM Load ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Active nav link
    const path = location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.main-nav a').forEach(a => {
      const href = a.getAttribute('href');
      // Still strips out .html just in case you missed removing it in the DOM
      if ((href === '/' && path === '/') || (href !== '/' && path.startsWith(href.replace('.html', '')))) {
        a.classList.add('active');
      }
    });

    // Read ?q from tools page URL parameter
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const input = document.getElementById('tool-search');
    if (q && input) { 
        input.value = q; 
        window.initToolFilter && window.initToolFilter(); 
        input.dispatchEvent(new Event('input')); 
    }

    // Auto-update copyright year
    document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  });

  // ---------- Shared dropzone helper ----------
  window.makeDropzone = function (zoneEl, onFiles, { accept = '*', multiple = true } = {}) {
    const input = zoneEl.querySelector('input[type="file"]');
    if (input) {
      if (accept !== '*') input.setAttribute('accept', accept);
      input.toggleAttribute('multiple', multiple);
    }
    zoneEl.addEventListener('click', () => input && input.click());
    zoneEl.addEventListener('dragover', e => { e.preventDefault(); zoneEl.classList.add('is-drag'); });
    zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('is-drag'));
    zoneEl.addEventListener('drop', e => {
      e.preventDefault(); zoneEl.classList.remove('is-drag');
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) onFiles(files);
    });
    input && input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (files.length) onFiles(files);
      input.value = '';
    });
  };

  // ---------- File Size Formatter ----------
  window.fmtBytes = function (n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // ---------- Generic File Downloader ----------
  window.download = function (data, filename, mime = 'application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); 
    a.click(); 
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.querySelector('[data-testid="theme-toggle-btn"]');
  const menuBtn = document.querySelector('[data-testid="menu-toggle-btn"]');
  
  if (themeBtn && typeof toggleTheme === 'function') {
    themeBtn.addEventListener('click', toggleTheme);
  }
  
  if (menuBtn && typeof toggleNav === 'function') {
    menuBtn.addEventListener('click', toggleNav);
  }

  if (typeof renderTools === 'function') {
    renderTools('tools-grid', { limit: 6 });
  }
  
  if (typeof initHomeSearch === 'function') {
    initHomeSearch();
  }

  // Theme selector dropdown logic - Wrapped in safety check to prevent null errors
  const themeSelect = document.getElementById('theme-select');
  const htmlElement = document.documentElement;

  if (themeSelect) {
    const savedTheme = localStorage.getItem('theme') || 'system';
    applyTheme(savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      applyTheme(selectedTheme);
      localStorage.setItem('theme', selectedTheme);
    });
  }

  function applyTheme(theme) {
    if (theme === 'system') {
      htmlElement.removeAttribute('data-theme');
    } else {
      htmlElement.setAttribute('data-theme', theme);
    }
  }
});
