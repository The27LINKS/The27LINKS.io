// properties.js — right-side context panel
export class Properties {
  constructor(state, selection, history) {
    this.state = state; this.selection = selection; this.history = history;
    this.body = document.getElementById('properties-body');
    this.title = document.getElementById('prop-title');
    this.hint = document.getElementById('prop-hint');
    this.header = this.title.parentElement;

    // MOBILE FIX: Add a close button to dismiss the properties sheet
    this.closeBtn = document.createElement('button');
    this.closeBtn.innerHTML = '✕';
    this.closeBtn.className = 'icon-btn mobile-close-btn';
    this.closeBtn.style.cssText = 'position: absolute; right: 8px; top: 8px; display: none;';
    
    this.closeBtn.addEventListener('click', () => {
      document.querySelector('.properties').classList.remove('active');
      this.selection.clear(); // Deselect element when closing
    });
    
    this.header.style.position = 'relative';
    this.header.appendChild(this.closeBtn);
  }

  render() {
    const sel = this.state.getSelected();
    this.body.innerHTML = '';
    
    // Show close button only on mobile (using a quick window width check)
    this.closeBtn.style.display = window.innerWidth <= 768 ? 'inline-flex' : 'none';

    if (sel.length === 0) {
      this.title.textContent = 'Canvas';
      this.hint.textContent = 'No element selected';
      this.body.appendChild(this.canvasProps());
      return;
    }
    const el = sel[0];
    this.title.textContent = ({ text: 'Text', shape: 'Shape', image: 'Image' }[el.type]) || 'Element';
    this.hint.textContent = el.type + ' · ' + Math.round(el.width) + '×' + Math.round(el.height) + ' px';
    this.body.appendChild(this.commonProps(el));
    if (el.type === 'text') this.body.appendChild(this.textProps(el));
    if (el.type === 'shape') this.body.appendChild(this.shapeProps(el));
    if (el.type === 'image') this.body.appendChild(this.imageProps(el));
    this.body.appendChild(this.actionsProps(el));
  }

  group(title) {
    const g = document.createElement('div'); g.className = 'prop-group';
    if (title) g.innerHTML = `<h4>${title}</h4>`;
    return g;
  }
  
  row(fields, single) {
    const r = document.createElement('div'); r.className = 'prop-row' + (single ? ' single' : '');
    fields.forEach(f => {
      const l = document.createElement('label');
      l.innerHTML = `<span>${f.label}</span>`;
      const input = document.createElement(f.tag || 'input');
      Object.entries(f.attrs || {}).forEach(([k, v]) => input.setAttribute(k, v));
      if (f.tag === 'select' && f.options) {
        f.options.forEach(o => {
          const op = document.createElement('option'); op.value = o.value ?? o; op.textContent = o.label ?? o;
          if ((o.value ?? o) == f.value) op.selected = true;
          input.appendChild(op);
        });
      } else {
        input.value = f.value ?? '';
      }
      if (f.tag === 'textarea') input.value = f.value ?? '';
      
      // Prevent keyboard from hiding the input on mobile
      input.addEventListener('focus', () => {
        if (window.innerWidth <= 768) {
          setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        }
      });

      input.addEventListener('input', () => f.onChange(input.value));
      input.addEventListener('change', () => { f.onChange(input.value); this.history.push(); });
      l.appendChild(input);
      r.appendChild(l);
    });
    return r;
  }
  
  buttons(items) {
    const b = document.createElement('div'); b.className = 'prop-buttons';
    items.forEach(it => {
      const bt = document.createElement('button');
      bt.textContent = it.label;
      if (it.active) bt.classList.add('active');
      if (it.danger) bt.classList.add('danger');
      bt.addEventListener('click', it.onClick);
      b.appendChild(bt);
    });
    return b;
  }

  canvasProps() {
    const g = this.group('Canvas');
    g.appendChild(this.row([
      { label: 'Width', attrs: { type: 'number', min: 10 }, value: this.state.canvas.width, onChange: v => { this.state.canvas.width = +v; this.state.trigger('canvas'); } },
      { label: 'Height', attrs: { type: 'number', min: 10 }, value: this.state.canvas.height, onChange: v => { this.state.canvas.height = +v; this.state.trigger('canvas'); } },
    ]));
    g.appendChild(this.row([
      { label: 'Background', attrs: { type: 'color' }, value: this.state.canvas.background || '#ffffff', onChange: v => { this.state.canvas.background = v; this.state.trigger('canvas'); } },
    ], true));
    return g;
  }

  commonProps(el) {
    const g = this.group('Position & Size');
    g.appendChild(this.row([
      { label: 'X', attrs: { type: 'number' }, value: Math.round(el.x), onChange: v => this.state.update(el.id, { x: +v }) },
      { label: 'Y', attrs: { type: 'number' }, value: Math.round(el.y), onChange: v => this.state.update(el.id, { y: +v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Width', attrs: { type: 'number' }, value: Math.round(el.width), onChange: v => this.state.update(el.id, { width: +v }) },
      { label: 'Height', attrs: { type: 'number' }, value: Math.round(el.height), onChange: v => this.state.update(el.id, { height: +v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Rotation', attrs: { type: 'number' }, value: Math.round(el.rotation || 0), onChange: v => this.state.update(el.id, { rotation: +v }) },
      { label: 'Opacity', attrs: { type: 'range', min: 0, max: 1, step: 0.01 }, value: el.opacity ?? 1, onChange: v => this.state.update(el.id, { opacity: +v }) },
    ]));
    return g;
  }

  textProps(el) {
    const g = this.group('Text');
    g.appendChild(this.row([
      { label: 'Content', tag: 'textarea', value: el.content || '', onChange: v => this.state.update(el.id, { content: v }) },
    ], true));
    g.appendChild(this.row([
      { label: 'Font', tag: 'select', value: el.fontFamily || 'Instrument Sans',
        options: ['Bricolage Grotesque','Instrument Sans','JetBrains Mono','Georgia','Times New Roman','Courier New','Arial','Verdana','Trebuchet MS','Impact'],
        onChange: v => this.state.update(el.id, { fontFamily: v }) },
      { label: 'Size', attrs: { type: 'number', min: 6 }, value: Math.round(el.fontSize || 40), onChange: v => this.state.update(el.id, { fontSize: +v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Weight', tag: 'select', value: el.fontWeight || 400,
        options: [{value:300,label:'Light'},{value:400,label:'Regular'},{value:500,label:'Medium'},{value:600,label:'Semibold'},{value:700,label:'Bold'}],
        onChange: v => this.state.update(el.id, { fontWeight: +v }) },
      { label: 'Color', attrs: { type: 'color' }, value: el.color || '#000000', onChange: v => this.state.update(el.id, { color: v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Line height', attrs: { type: 'number', step: 0.1, min: 0.5, max: 3 }, value: el.lineHeight || 1.2, onChange: v => this.state.update(el.id, { lineHeight: +v }) },
      { label: 'Letter sp.', attrs: { type: 'number', step: 0.5 }, value: el.letterSpacing || 0, onChange: v => this.state.update(el.id, { letterSpacing: +v }) },
    ]));
    g.appendChild(this.buttons([
      { label: 'Left',   active: (el.textAlign || 'left') === 'left',   onClick: () => { this.state.update(el.id, { textAlign: 'left' }); this.history.push(); } },
      { label: 'Center', active: el.textAlign === 'center', onClick: () => { this.state.update(el.id, { textAlign: 'center' }); this.history.push(); } },
      { label: 'Right',  active: el.textAlign === 'right',  onClick: () => { this.state.update(el.id, { textAlign: 'right' }); this.history.push(); } },
      { label: 'Justify',active: el.textAlign === 'justify',onClick: () => { this.state.update(el.id, { textAlign: 'justify' }); this.history.push(); } },
    ]));
    g.appendChild(this.buttons([
      { label: 'Bold',   active: (el.fontWeight || 400) >= 600, onClick: () => { this.state.update(el.id, { fontWeight: (el.fontWeight || 400) >= 600 ? 400 : 700 }); this.history.push(); } },
      { label: 'Italic', active: el.fontStyle === 'italic',     onClick: () => { this.state.update(el.id, { fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' }); this.history.push(); } },
      { label: 'Underline', active: el.textDecoration === 'underline', onClick: () => { this.state.update(el.id, { textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' }); this.history.push(); } },
      { label: 'UPPER', active: el.textTransform === 'uppercase', onClick: () => { this.state.update(el.id, { textTransform: el.textTransform === 'uppercase' ? 'none' : 'uppercase' }); this.history.push(); } },
    ]));
    return g;
  }

  shapeProps(el) {
    const g = this.group('Shape');
    g.appendChild(this.row([
      { label: 'Fill', attrs: { type: 'color' }, value: el.fill || '#ff6b4a', onChange: v => this.state.update(el.id, { fill: v }) },
      { label: 'Stroke', attrs: { type: 'color' }, value: el.stroke && el.stroke !== 'transparent' ? el.stroke : '#000000', onChange: v => this.state.update(el.id, { stroke: v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Stroke width', attrs: { type: 'number', min: 0 }, value: el.strokeWidth || 0, onChange: v => this.state.update(el.id, { strokeWidth: +v }) },
      { label: 'Corner radius', attrs: { type: 'number', min: 0 }, value: el.radius || 0, onChange: v => this.state.update(el.id, { radius: +v }) },
    ]));
    g.appendChild(this.buttons([
      { label: 'Dashed', active: !!el.dashed, onClick: () => { this.state.update(el.id, { dashed: !el.dashed }); this.history.push(); } },
      { label: 'Shadow', active: !!el.shadow, onClick: () => { this.state.update(el.id, { shadow: !el.shadow }); this.history.push(); } },
    ]));
    return g;
  }

  imageProps(el) {
    const g = this.group('Image');
    g.appendChild(this.row([
      { label: 'Source URL', value: el.src || '', onChange: v => this.state.update(el.id, { src: v }) },
    ], true));
    g.appendChild(this.row([
      { label: 'Brightness %', attrs: { type: 'number', min: 0, max: 300 }, value: el.brightness ?? 100, onChange: v => this.state.update(el.id, { brightness: +v }) },
      { label: 'Contrast %', attrs: { type: 'number', min: 0, max: 300 }, value: el.contrast ?? 100, onChange: v => this.state.update(el.id, { contrast: +v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Saturation %', attrs: { type: 'number', min: 0, max: 300 }, value: el.saturation ?? 100, onChange: v => this.state.update(el.id, { saturation: +v }) },
      { label: 'Blur px', attrs: { type: 'number', min: 0, max: 40 }, value: el.blur || 0, onChange: v => this.state.update(el.id, { blur: +v }) },
    ]));
    g.appendChild(this.row([
      { label: 'Radius', attrs: { type: 'number', min: 0 }, value: el.radius || 0, onChange: v => this.state.update(el.id, { radius: +v }) },
      { label: 'Border width', attrs: { type: 'number', min: 0 }, value: el.borderWidth || 0, onChange: v => this.state.update(el.id, { borderWidth: +v }) },
    ]));
    g.appendChild(this.buttons([
      { label: 'Flip H', active: !!el.flipH, onClick: () => { this.state.update(el.id, { flipH: !el.flipH }); this.history.push(); } },
      { label: 'Flip V', active: !!el.flipV, onClick: () => { this.state.update(el.id, { flipV: !el.flipV }); this.history.push(); } },
      { label: 'Shadow', active: !!el.shadow, onClick: () => { this.state.update(el.id, { shadow: !el.shadow }); this.history.push(); } },
    ]));
    return g;
  }

  actionsProps(el) {
    const g = this.group('Actions');
    g.appendChild(this.buttons([
      { label: '↑ Front', onClick: () => { this.state.raise(el.id, 'front'); this.history.push(); } },
      { label: '↑', onClick: () => { this.state.raise(el.id, 'up'); this.history.push(); } },
      { label: '↓', onClick: () => { this.state.raise(el.id, 'down'); this.history.push(); } },
      { label: '↓ Back', onClick: () => { this.state.raise(el.id, 'back'); this.history.push(); } },
    ]));
    g.appendChild(this.buttons([
      { label: 'Duplicate', onClick: () => { this.state.duplicate(el.id); this.history.push(); } },
      { label: el.locked ? 'Unlock' : 'Lock', onClick: () => { this.state.update(el.id, { locked: !el.locked }); this.history.push(); } },
      { label: el.hidden ? 'Show' : 'Hide', onClick: () => { this.state.update(el.id, { hidden: !el.hidden }); this.history.push(); } },
      { label: 'Delete', danger: true, onClick: () => { this.state.remove(el.id); this.history.push(); } },
    ]));
    return g;
  }
}