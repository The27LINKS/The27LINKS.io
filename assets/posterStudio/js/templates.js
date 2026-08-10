// templates.js — apply a template definition to state
import { uid, deepClone } from './util.js';

export function applyTemplate(state, template) {
  const t = deepClone(template);
  state.canvas = { ...t.canvas };
  state.elements = (t.elements || []).map(el => ({
    id: uid(),
    rotation: 0,
    opacity: 1,
    ...el
  }));
  state.selectedIds = [];
  state.trigger('template');
}
