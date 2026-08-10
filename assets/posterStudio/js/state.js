// state.js — central mutable state
import { uid, deepClone } from './assets/posterStudio/js/util.js';

export class State {
  constructor() {
    this.canvas = { width: 1080, height: 1080, background: '#ffffff' };
    this.elements = [];
    this.selectedIds = [];
    this.onChange = null;
  }
  trigger(reason) { if (this.onChange) this.onChange(reason); }
  reset(w, h) {
    this.canvas = { width: w, height: h, background: '#ffffff' };
    this.elements = []; this.selectedIds = [];
  }
  add(el, trigger = true) {
    const e = { id: uid(), rotation: 0, opacity: 1, locked: false, hidden: false, ...el };
    this.elements.push(e);
    this.selectedIds = [e.id];
    if (trigger) this.trigger('add');
    return e;
  }
  remove(id) {
    this.elements = this.elements.filter(e => e.id !== id);
    this.selectedIds = this.selectedIds.filter(x => x !== id);
    this.trigger('remove');
  }
  update(id, patch, trigger = true) {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    Object.assign(el, patch);
    if (trigger) this.trigger('update');
  }
  duplicate(id) {
    const el = this.elements.find(e => e.id === id);
    if (!el) return;
    const copy = { ...deepClone(el), id: uid(), x: el.x + 20, y: el.y + 20 };
    this.elements.push(copy);
    this.selectedIds = [copy.id];
    this.trigger('duplicate');
  }
  select(ids) { this.selectedIds = Array.isArray(ids) ? ids : [ids].filter(Boolean); this.trigger('select'); }
  getSelected() { return this.elements.filter(e => this.selectedIds.includes(e.id)); }
  raise(id, dir) {
    const idx = this.elements.findIndex(e => e.id === id);
    if (idx < 0) return;
    const el = this.elements.splice(idx, 1)[0];
    let ni;
    if (dir === 'front') ni = this.elements.length;
    else if (dir === 'back') ni = 0;
    else if (dir === 'up') ni = Math.min(this.elements.length, idx + 1);
    else ni = Math.max(0, idx - 1);
    this.elements.splice(ni, 0, el);
    this.trigger('order');
  }
  serialize() { return deepClone({ canvas: this.canvas, elements: this.elements, version: 1 }); }
  load(data) {
    if (!data || !data.canvas || !data.elements) return;
    this.canvas = deepClone(data.canvas);
    this.elements = deepClone(data.elements);
    this.selectedIds = [];
  }
}
