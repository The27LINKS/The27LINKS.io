// storage.js — localStorage autosave
export class Storage {
  constructor(state) {
    this.state = state;
    this.KEY = 'posterStudio.project.v1';
    this._t = null;
  }
  saveSoon() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.save(), 800);
  }
  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.state.serialize()));
      const el = document.getElementById('status-autosave');
      if (el) { el.textContent = 'Auto-saved · ' + new Date().toLocaleTimeString(); }
    } catch {}
  }
  load() {
    try { const raw = localStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
