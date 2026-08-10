// shortcuts.js — keyboard shortcuts
export class Shortcuts {
  constructor(state, selection, history, canvas) {
    this.state = state; this.selection = selection; this.history = history; this.canvas = canvas;
    window.addEventListener('keydown', (e) => this.onKey(e));
  }
  onKey(e) {
    // Ignore when typing in an input/textarea/contenteditable
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.getAttribute('contenteditable') === 'true')) return;
    const mod = e.ctrlKey || e.metaKey;
    const sel = this.state.getSelected();

    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); this.history.undo(); return; }
    if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); this.history.redo(); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); sel.forEach(el => this.state.duplicate(el.id)); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); this.state.select(this.state.elements.map(el => el.id)); return; }
    if (mod && e.key.toLowerCase() === 'c') { this._clipboard = JSON.parse(JSON.stringify(sel)); return; }
    if (mod && e.key.toLowerCase() === 'v' && this._clipboard) {
      this._clipboard.forEach(el => {
        const c = { ...el, x: el.x + 20, y: el.y + 20 }; delete c.id;
        this.state.add(c, false);
      });
      this.state.trigger('paste'); return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (sel.length) { e.preventDefault(); sel.forEach(el => this.state.remove(el.id)); }
      return;
    }
    if (e.key.startsWith('Arrow') && sel.length) {
      e.preventDefault();
      const d = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0;
      const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
      sel.forEach(el => this.state.update(el.id, { x: el.x + dx, y: el.y + dy }, false));
      this.state.trigger('nudge');
    }
  }
}
