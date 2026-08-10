// canvas.js — canvas transforms: zoom, fit-to-screen
export class Canvas {
  constructor(canvasEl, viewport, state) {
    this.el = canvasEl;
    this.wrap = document.getElementById('canvas-wrap');
    this.viewport = viewport;
    this.state = state;
    this.scale = 0.5;
    
    // Wheel zoom (ctrl+wheel)
    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
      }
    }, { passive: false });
    
    window.addEventListener('resize', () => this.applyScale());
  }

  setScale(s) { 
    this.scale = Math.max(0.05, Math.min(4, s)); 
    this.applyScale(); 
  }

  zoomBy(f) { 
    this.setScale(this.scale * f); 
  }

  fitToScreen() {
    // Dynamic padding: use less padding on mobile so the canvas fills more screen space
    const pad = window.innerWidth <= 768 ? 32 : 80;
    const w = this.viewport.clientWidth - pad;
    const h = this.viewport.clientHeight - pad;
    const s = Math.min(w / this.state.canvas.width, h / this.state.canvas.height);
    this.setScale(s);
  }

  applyScale() {
    this.wrap.style.width = (this.state.canvas.width * this.scale) + 'px';
    this.wrap.style.height = (this.state.canvas.height * this.scale) + 'px';
    this.el.style.transform = `scale(${this.scale})`;
    document.getElementById('zoom-level').textContent = Math.round(this.scale * 100) + '%';
    
    // trigger selection overlay update via state
    this.state.trigger('zoom');
  }
}