// ui.js — left rail: templates, text presets, shapes, photos, upload, backgrounds, layers
import { applyTemplate } from './assets/posterStudio/js/templates.js';
import { uid, toast } from './assets/posterStudio/js/util.js';

export class UI {
  constructor(state, selection, history, data, canvas) {
    this.state = state; this.selection = selection; this.history = history; this.data = data; this.canvas = canvas;
    this.panelEl = document.getElementById('rail-panel');
    this.currentPanel = 'templates';
    
    document.querySelectorAll('.rail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // MOBILE FIX: If tapping the already active tab, just toggle the panel closed
        if (btn.classList.contains('active') && this.panelEl.classList.contains('active')) {
          this.panelEl.classList.remove('active');
          return;
        }

        document.querySelectorAll('.rail-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false'); // Accessibility sync
        });
        
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.currentPanel = btn.dataset.panel;
        this.renderPanel();
        
        // MOBILE FIX: Slide up this panel, and hide properties panel if it's open
        this.panelEl.classList.add('active');
        const propertiesPanel = document.querySelector('.properties');
        if (propertiesPanel) propertiesPanel.classList.remove('active');
      });
    });
    this.renderPanel();
  }

  // Helper to auto-close the panel on mobile after adding an element
  closeMobilePanel() {
    if (window.innerWidth <= 768) {
      this.panelEl.classList.remove('active');
    }
  }

  renderPanel() {
    const p = this.currentPanel;
    if (p === 'templates')   return this.renderTemplates();
    if (p === 'text')        return this.renderText();
    if (p === 'shapes')      return this.renderShapes();
    if (p === 'photos')      return this.renderPhotos();
    if (p === 'upload')      return this.renderUpload();
    if (p === 'backgrounds') return this.renderBackgrounds();
    if (p === 'layers')      return this.renderLayers();
  }

  renderTemplates() {
    const list = this.data.templates.templates;
    let html = `<h3>Templates</h3><p class="hint">Click to apply · replaces canvas</p><div class="template-grid">`;
    list.forEach((t, i) => {
      const w = t.canvas.width, h = t.canvas.height;
      const scale = 160 / Math.max(w, h);
      html += `<div class="tpl-card" data-i="${i}" data-testid="tpl-card-${t.id}">
        <div class="thumb" style="width:${w}px;height:${h}px;transform:scale(${scale});background:${t.canvas.background};position:relative;overflow:hidden;"></div>
        <div class="label">${t.name}</div>
      </div>`;
    });
    html += `</div>`;
    this.panelEl.innerHTML = html;
    // Insert real elements into thumbs
    this.panelEl.querySelectorAll('.tpl-card').forEach(card => {
      const i = +card.dataset.i;
      const t = list[i];
      const thumb = card.querySelector('.thumb');
      t.elements.forEach(el => {
        const d = document.createElement('div');
        d.style.position = 'absolute';
        d.style.left = el.x + 'px'; d.style.top = el.y + 'px';
        d.style.width = el.width + 'px'; d.style.height = el.height + 'px';
        if (el.type === 'text') {
          d.textContent = el.content || '';
          d.style.fontFamily = `"${el.fontFamily || 'Instrument Sans'}", sans-serif`;
          d.style.fontSize = (el.fontSize || 40) + 'px';
          d.style.fontWeight = el.fontWeight || 400;
          d.style.color = el.color || '#000';
          d.style.textAlign = el.textAlign || 'left';
          d.style.lineHeight = el.lineHeight || 1.2;
          d.style.overflow = 'hidden';
        } else if (el.type === 'shape') {
          d.style.background = el.fill || '#ff6b4a';
          if (el.shape === 'circle' || el.shape === 'ellipse') d.style.borderRadius = '50%';
          else if (el.radius) d.style.borderRadius = el.radius + 'px';
          d.style.opacity = el.opacity ?? 1;
        }
        thumb.appendChild(d);
      });
      card.addEventListener('click', () => {
        applyTemplate(this.state, t);
        this.history.push();
        this.canvas.fitToScreen();
        toast('Template applied');
        this.closeMobilePanel(); // MOBILE FIX
      });
    });
  }

  renderText() {
    this.panelEl.innerHTML = `
      <h3>Add Text</h3>
      <p class="hint">Click to add. Double-click on canvas to edit.</p>
      <div class="text-preset" data-preset="heading" data-testid="preset-heading" style="font-size:22px"><span class="h">Heading Text</span></div>
      <div class="text-preset" data-preset="subheading" data-testid="preset-subheading" style="font-size:16px"><span class="h">Sub Heading</span></div>
      <div class="text-preset" data-preset="body" data-testid="preset-body" style="font-size:13px">Body paragraph</div>
      <div class="text-preset" data-preset="caption" data-testid="preset-caption" style="font-size:11px;color:var(--text-muted)">CAPTION LABEL</div>
    `;
    this.panelEl.querySelectorAll('.text-preset').forEach(p => p.addEventListener('click', () => {
      this.addTextPreset(p.dataset.preset);
      this.closeMobilePanel(); // MOBILE FIX
    }));
  }

  addTextPreset(preset) {
    const cx = this.state.canvas.width / 2, cy = this.state.canvas.height / 2;
    const map = {
      heading:    { fontSize: 96, fontWeight: 700, fontFamily: 'Bricolage Grotesque', content: 'Your Heading', width: 800, height: 130 },
      subheading: { fontSize: 48, fontWeight: 500, fontFamily: 'Bricolage Grotesque', content: 'Sub heading text', width: 700, height: 80 },
      body:       { fontSize: 24, fontWeight: 400, fontFamily: 'Instrument Sans', content: 'A short paragraph describing your idea in a friendly, clear tone.', width: 600, height: 120 },
      caption:    { fontSize: 16, fontWeight: 500, fontFamily: 'JetBrains Mono', content: 'CAPTION LABEL', width: 300, height: 40, textTransform: 'uppercase', letterSpacing: 2 },
    };
    const cfg = map[preset];
    this.state.add({ type: 'text', x: cx - cfg.width / 2, y: cy - cfg.height / 2, color: '#101012', textAlign: 'left', lineHeight: 1.2, ...cfg });
    this.history.push();
  }

  renderShapes() {
    const shapes = this.data.shapes.shapes;
    let html = `<h3>Shapes</h3><p class="hint">Click to add</p><div class="shape-grid">`;
    shapes.forEach(s => {
      html += `<div class="shape-card" data-id="${s.id}" data-testid="shape-${s.id}" title="${s.name}"><svg viewBox="0 0 96 96">${s.svg}</svg></div>`;
    });
    html += `</div>`;
    this.panelEl.innerHTML = html;
    this.panelEl.querySelectorAll('.shape-card').forEach(c => c.addEventListener('click', () => {
      const cx = this.state.canvas.width / 2, cy = this.state.canvas.height / 2;
      this.state.add({ type: 'shape', shape: c.dataset.id, x: cx - 150, y: cy - 150, width: 300, height: 300, fill: '#ff6b4a' });
      this.history.push();
      this.closeMobilePanel(); // MOBILE FIX
    }));
  }

  renderPhotos() {
    const photos = this.data.defaults.photos;
    let html = `<h3>Photos</h3><p class="hint">Placeholder stock photos</p><div class="photo-grid">`;
    photos.forEach((url, i) => {
      html += `<div class="photo-card" data-url="${url}" data-testid="photo-${i}"><img src="${url}" alt="photo" crossorigin="anonymous"/></div>`;
    });
    html += `</div>`;
    this.panelEl.innerHTML = html;
    this.panelEl.querySelectorAll('.photo-card').forEach(c => c.addEventListener('click', () => {
      const cx = this.state.canvas.width / 2, cy = this.state.canvas.height / 2;
      this.state.add({ type: 'image', src: c.dataset.url, x: cx - 300, y: cy - 300, width: 600, height: 600, brightness: 100, contrast: 100, saturation: 100 });
      this.history.push();
      this.closeMobilePanel(); // MOBILE FIX
    }));
  }

  renderUpload() {
    this.panelEl.innerHTML = `
      <h3>Upload</h3>
      <p class="hint">Upload your own image (stored locally)</p>
      <div class="upload-drop" data-testid="upload-drop">
        <div>Click or drop image here</div>
        <input type="file" accept="image/*" hidden id="upload-input"/>
      </div>`;
    const drop = this.panelEl.querySelector('.upload-drop');
    const input = this.panelEl.querySelector('#upload-input');
    const handle = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        const cx = this.state.canvas.width / 2, cy = this.state.canvas.height / 2;
        this.state.add({ type: 'image', src, x: cx - 300, y: cy - 300, width: 600, height: 600 });
        this.history.push();
        toast('Image added');
        this.closeMobilePanel(); // MOBILE FIX
      };
      reader.readAsDataURL(file);
    };
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => handle(e.target.files[0]));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = 'var(--accent)'; });
    drop.addEventListener('dragleave', () => drop.style.borderColor = '');
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.style.borderColor = ''; handle(e.dataTransfer.files[0]); });
  }

  renderBackgrounds() {
    const bg = this.data.defaults.backgrounds;
    let html = `<h3>Background</h3><p class="hint">Click to apply to canvas</p>`;
    
    // Solid Colors Section
    html += `<h4>Solid Colors</h4><div class="bg-grid">`;
    bg.solids.forEach(c => { 
      if (c === 'transparent') {
        const checkerboard = `background-image: conic-gradient(#ccc 25%, #fff 25%, #fff 50%, #ccc 50%, #ccc 75%, #fff 75%, #fff); background-size: 10px 10px;`;
        html += `<div class="bg-card" data-testid="bg-solid-transparent" data-value="transparent" style="${checkerboard}" title="Transparent"></div>`;
      } else {
        html += `<div class="bg-card" data-testid="bg-solid-${c}" data-value="${c}" style="background:${c}"></div>`; 
      }
    });
    html += `</div>`;

    // Gradients Section
    html += `<h4 style="margin-top: 1rem;">Gradients</h4><div class="bg-grid">`;
    bg.gradients.forEach((g, i) => { 
      html += `<div class="bg-card" data-testid="bg-grad-${i}" data-value='${g}' style="background:${g}"></div>`; 
    });
    html += `</div>`;

    this.panelEl.innerHTML = html;
    this.panelEl.querySelectorAll('.bg-card').forEach(c => c.addEventListener('click', () => {
      this.state.canvas.background = c.dataset.value;
      this.state.trigger('canvas');
      this.history.push();
      // Notice: we DO NOT auto-close on background click, so they can test multiple colors
    }));
  }

  renderLayers() {
    if (this.currentPanel !== 'layers') return;
    const rev = [...this.state.elements].reverse();
    let html = `<h3>Layers</h3><p class="hint">${rev.length} element${rev.length===1?'':'s'}</p><div class="layer-list">`;
    rev.forEach(el => {
      const icon = el.type === 'text' ? 'T' : el.type === 'shape' ? '▲' : '◨';
      const name = el.type === 'text' ? ((el.content || '').slice(0, 24) || 'Text') : el.type;
      const active = this.state.selectedIds.includes(el.id);
      html += `<div class="layer-item ${active ? 'active' : ''}" data-id="${el.id}" data-testid="layer-${el.id}">
        <span class="icon">${icon}</span>
        <span class="name">${escapeHtml(name)}</span>
        <button data-act="hide" title="${el.hidden ? 'Show' : 'Hide'}">${el.hidden ? '◌' : '●'}</button>
        <button data-act="lock" title="${el.locked ? 'Unlock' : 'Lock'}">${el.locked ? '⚿' : '⚷'}</button>
        <button data-act="del" title="Delete">✕</button>
      </div>`;
    });
    html += `</div>`;
    this.panelEl.innerHTML = html;
    this.panelEl.querySelectorAll('.layer-item').forEach(li => {
      li.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        this.state.select([li.dataset.id]);
        this.closeMobilePanel(); // MOBILE FIX: Close layer panel when selecting an item to show properties
      });
      li.querySelectorAll('button').forEach(b => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = li.dataset.id;
        const el = this.state.elements.find(x => x.id === id);
        if (!el) return;
        const act = b.dataset.act;
        if (act === 'hide') this.state.update(id, { hidden: !el.hidden });
        else if (act === 'lock') this.state.update(id, { locked: !el.locked });
        else if (act === 'del') this.state.remove(id);
        this.history.push();
      }));
    });
  }
}

function escapeHtml(s) { return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
