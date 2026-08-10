// util.js — small helpers
export function uid() { return 'e' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
export function toast(msg, ms = 1800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), ms);
}