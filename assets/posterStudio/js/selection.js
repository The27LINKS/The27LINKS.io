// selection.js — selection + drag + resize + rotate handles (with Mobile Touch Support)
export class Selection {
  constructor(state, canvasEl, overlayEl, canvas) {
    this.state = state;
    this.canvasEl = canvasEl;
    this.overlayEl = overlayEl;
    this.canvas = canvas;
    this.buildHandles();
    this.bindCanvas();
    this.bindDoubleClickEdit();
  }

  buildHandles() {
    const dirs = ['nw','n','ne','e','se','s','sw','w'];
    this.overlayEl.innerHTML = '';
    dirs.forEach(d => {
      const h = document.createElement('div');
      h.className = 'handle';
      h.dataset.dir = d;
      this.overlayEl.appendChild(h);
      
      // Bind both Mouse and Touch events for resizing
      h.addEventListener('mousedown', (e) => this.startResize(e, d));
      h.addEventListener('touchstart', (e) => this.startResize(e, d), { passive: false });
    });
    
    const rot = document.createElement('div');
    rot.className = 'handle rot';
    this.overlayEl.appendChild(rot);
    
    // Bind both Mouse and Touch events for rotation
    rot.addEventListener('mousedown', (e) => this.startRotate(e));
    rot.addEventListener('touchstart', (e) => this.startRotate(e), { passive: false });
  }

  bindCanvas() {
    const handleSelectAndDrag = (e) => {
      const target = e.target.closest('.el');
      if (!target) return;
      
      const id = target.dataset.id;
      const el = this.state.elements.find(x => x.id === id);
      if (!el || el.locked) return;
      
      // If clicking already-editing text, skip drag
      if (e.target.getAttribute('contenteditable') === 'true') return;
      
      const additive = e.shiftKey;
      if (additive) {
        if (this.state.selectedIds.includes(id))
          this.state.select(this.state.selectedIds.filter(x => x !== id));
        else this.state.select([...this.state.selectedIds, id]);
      } else if (!this.state.selectedIds.includes(id)) {
        this.state.select([id]);
      }
      this.startDrag(e);
    };

    // Support both mouse clicks and mobile taps
    this.canvasEl.addEventListener('mousedown', handleSelectAndDrag);
    this.canvasEl.addEventListener('touchstart', handleSelectAndDrag, { passive: false });
  }

  bindDoubleClickEdit() {
    // Double click for desktop
    this.canvasEl.addEventListener('dblclick', (e) => this.triggerEdit(e));
    
    // Tap-twice simulation or standard double-click fallback can go here if needed
  }

  triggerEdit(e) {
    const t = e.target.closest('.el-text');
    if (!t) return;
    const node = t.closest('.el');
    const id = node.dataset.id;
    const el = this.state.elements.find(x => x.id === id);
    if (!el || el.locked) return;
    
    t.setAttribute('contenteditable', 'true');
    t.focus();
    
    // place cursor at end
    const range = document.createRange();
    range.selectNodeContents(t); range.collapse(false);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    
    const finish = () => {
      t.removeAttribute('contenteditable');
      el.content = t.innerText;
      this.state.trigger('edit');
      t.removeEventListener('blur', finish);
    };
    t.addEventListener('blur', finish);
  }

  clear() { this.state.select([]); }

  startDrag(e) {
    if (e.type === 'touchstart') e.preventDefault(); // Stop page scrolling
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const scale = this.canvas.scale;
    const startX = clientX, startY = clientY;
    const sel = this.state.getSelected();
    const originals = sel.map(el => ({ id: el.id, x: el.x, y: el.y }));
    
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = (cx - startX) / scale;
      const dy = (cy - startY) / scale;
      originals.forEach(o => this.state.update(o.id, { x: o.x + dx, y: o.y + dy }, false));
      this.state.trigger('drag-move');
    };
    
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      this.state.trigger('drag-end');
    };
    
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }

  startResize(e, dir) {
    e.preventDefault(); e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const scale = this.canvas.scale;
    const sel = this.state.getSelected()[0]; if (!sel) return;
    const startX = clientX, startY = clientY;
    const o = { x: sel.x, y: sel.y, w: sel.width, h: sel.height, fs: sel.fontSize };
    const isText = sel.type === 'text';
    
    const move = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = (cx - startX) / scale;
      const dy = (cy - startY) / scale;
      let { x, y, w, h } = o;
      if (dir.includes('e')) w = Math.max(20, o.w + dx);
      if (dir.includes('s')) h = Math.max(20, o.h + dy);
      if (dir.includes('w')) { w = Math.max(20, o.w - dx); x = o.x + (o.w - w); }
      if (dir.includes('n')) { h = Math.max(20, o.h - dy); y = o.y + (o.h - h); }
      const patch = { x, y, width: w, height: h };
      if (isText && (dir === 'nw' || dir === 'ne' || dir === 'sw' || dir === 'se')) {
        const ratio = w / o.w;
        patch.fontSize = Math.max(8, o.fs * ratio);
      }
      this.state.update(sel.id, patch, false);
      this.state.trigger('resize-move');
    };
    
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      this.state.trigger('resize-end');
    };
    
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }

  startRotate(e) {
    e.preventDefault(); e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const sel = this.state.getSelected()[0]; if (!sel) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const scale = this.canvas.scale;
    const cx = rect.left + (sel.x + sel.width / 2) * scale;
    const cy = rect.top + (sel.y + sel.height / 2) * scale;
    const startAngle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
    const startRot = sel.rotation || 0;
    
    const move = (ev) => {
      const ccx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const ccy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const ang = Math.atan2(ccy - cy, ccx - cx) * 180 / Math.PI;
      let r = startRot + (ang - startAngle);
      if (ev.shiftKey) r = Math.round(r / 15) * 15;
      this.state.update(sel.id, { rotation: r }, false);
      this.state.trigger('rotate-move');
    };
    
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
      this.state.trigger('rotate-end');
    };
    
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }

  updateOverlay() {
    const sel = this.state.getSelected();
    if (sel.length === 0) { this.overlayEl.classList.remove('active'); return; }
    // Bounding box for first selection (multi-select uses first)
    const el = sel[0];
    const scale = this.canvas.scale;
    this.overlayEl.classList.add('active');
    this.overlayEl.style.left = (el.x * scale) + 'px';
    this.overlayEl.style.top = (el.y * scale) + 'px';
    this.overlayEl.style.width = (el.width * scale) + 'px';
    this.overlayEl.style.height = (el.height * scale) + 'px';
    this.overlayEl.style.transform = `rotate(${el.rotation || 0}deg)`;
    this.overlayEl.style.transformOrigin = 'center center';
  }
}