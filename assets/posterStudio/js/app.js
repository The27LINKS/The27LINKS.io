// Theme initialization moved OUTSIDE main() to execute synchronously 
// and prevent the "Flash of Unstyled Content" (FOUC).
const savedTheme = localStorage.getItem('poster.theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// ✅ FIX 2: Moved this variable outside main() so syncCanvasSizeDropdown can access it!
let previousSizeValue = 'square'; 

import { loadAll } from '../assets/posterStudio/js/loader.js';
import { State } from '../assets/posterStudio/js/state.js';
import { Canvas } from '../assets/posterStudio/js/canvas.js';
import { Selection } from '../assets/posterStudio/js/selection.js';
import { History } from '../assets/posterStudio/js/history.js';
import { Storage } from '../assets/posterStudio/js/storage.js';
import { UI } from '../assets/posterStudio/js/ui.js';
import { Properties } from '../assets/posterStudio/js/properties.js';
import { Shortcuts } from '../assets/posterStudio/js/shortcuts.js';
import { renderElement } from '../assets/posterStudio/js/elements.js';
import { applyTemplate } from '../assets/posterStudio/js/templates.js';
import { exportProject } from '../assets/posterStudio/js/export.js';
import { toast } from '../assets/posterStudio/js/util.js';

async function main() {
  const data = await loadAll();
  const canvasEl = document.getElementById('canvas');
  const overlayEl = document.getElementById('selection-overlay');
  const viewport = document.getElementById('viewport');

  const state = new State();
  const canvas = new Canvas(canvasEl, viewport, state);
  const selection = new Selection(state, canvasEl, overlayEl, canvas);
  const history = new History(state);
  const storage = new Storage(state);
  const properties = new Properties(state, selection, history);
  const ui = new UI(state, selection, history, data, canvas);
  new Shortcuts(state, selection, history, canvas);

  state.onChange = (reason) => {
    render(state, canvasEl);
    selection.updateOverlay();
    
    const active = document.activeElement;
    const inProps = active && document.getElementById('properties-body')?.contains(active);
    const inLayers = active && document.getElementById('rail-panel')?.contains(active);
    
    if (!inProps) properties.render();
    if (!inLayers && ui.currentPanel === 'layers') ui.renderLayers();
    
    document.getElementById('status-elements').textContent = `${state.elements.length} element${state.elements.length === 1 ? '' : 's'}`;
    
    // Run sync unconditionally on EVERY change
    syncCanvasSizeDropdown(state, data.defaults.canvasSizes);

    // Automatically show/hide properties sheet
    const propertiesPanel = document.querySelector('.properties');
    if (propertiesPanel && window.innerWidth <= 768) {
      if (state.selectedIds.length > 0) {
        // Element selected: show properties, hide rail panel
        propertiesPanel.classList.add('active');
        document.querySelector('.rail-panel')?.classList.remove('active');
        // Un-highlight rail buttons
        document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
      } else {
        // Nothing selected: hide properties
        propertiesPanel.classList.remove('active');
      }
    }

    const skipHistory = ['history', 'load', 'init', 'zoom', 'select', 'drag-move', 'resize-move', 'rotate-move'];
    if (!skipHistory.includes(reason)) history.push();
    if (reason !== 'load') storage.saveSoon();
  };

  // Load from storage or first template
  const restored = storage.load();
  if (restored) {
    state.load(restored);
    toast('Restored last session');
  } else {
    applyTemplate(state, data.templates.templates[0]);
  }
  history.push();
  state.trigger('load');
  canvas.fitToScreen();

  // Toolbar wiring
  document.getElementById('btn-undo').addEventListener('click', () => history.undo());
  document.getElementById('btn-redo').addEventListener('click', () => history.redo());
  
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm('Start a new blank project?')) {
      state.reset(1080, 1080);
      state.trigger('reset');
    }
  });

  document.getElementById('btn-save-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.serialize(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'poster-project.json'; a.click();
    URL.revokeObjectURL(url);
    toast('Project JSON saved');
  });

  document.getElementById('btn-open').addEventListener('click', () => document.getElementById('file-open').click());
  document.getElementById('file-open').addEventListener('change', async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      state.load(parsed);
      state.trigger('load');
      history.push();
      toast('Project loaded');
    } catch { 
      toast('Invalid project file'); 
    }
    e.target.value = '';
  });

  document.getElementById('btn-theme').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const newTheme = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('poster.theme', newTheme);
  });

  // Canvas size selector with cancellation fix
  const sizeSelect = document.getElementById('canvas-size');
  previousSizeValue = sizeSelect.value; // Initialize tracking variable

  sizeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      const promptW = prompt('Width in px?', state.canvas.width);
      const promptH = prompt('Height in px?', state.canvas.height);
      
      // Handle user cancellation gracefully
      if (promptW === null || promptH === null) {
        sizeSelect.value = previousSizeValue; // Revert to previous value
        return; 
      }

      const w = parseInt(promptW || '0', 10);
      const h = parseInt(promptH || '0', 10);
      
      if (w > 0 && h > 0) { 
        state.canvas.width = w; 
        state.canvas.height = h; 
        state.trigger('canvas'); 
        canvas.fitToScreen(); 
        previousSizeValue = 'custom';
      } else {
        toast('Invalid dimensions entered.');
        sizeSelect.value = previousSizeValue;
      }
    } else {
      const size = data.defaults.canvasSizes[val];
      if (size) { 
        state.canvas.width = size.width; 
        state.canvas.height = size.height; 
        state.trigger('canvas'); 
        canvas.fitToScreen(); 
        previousSizeValue = val;
      }
    }
  });

  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click', () => canvas.zoomBy(1.2));
  document.getElementById('btn-zoom-out').addEventListener('click', () => canvas.zoomBy(1 / 1.2));
  document.getElementById('btn-zoom-fit').addEventListener('click', () => canvas.fitToScreen());

  // Export dropdown with tick-delay and error handling
  const exportBtn = document.getElementById('btn-export');
  const dropdown = document.getElementById('export-dropdown');
  exportBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    dropdown.classList.toggle('show'); 
  });
  
  document.addEventListener('click', () => dropdown.classList.remove('show'));
  dropdown.addEventListener('click', (e) => e.stopPropagation());
  
  dropdown.querySelectorAll('button[data-format]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.dataset.format;
      const scaleInput = document.getElementById('export-scale');
      const scale = parseFloat(scaleInput ? scaleInput.value : 2);
      dropdown.classList.remove('show');
      
      // Clear selection so bounding boxes aren't exported
      selection.clear();
      
      // Wait for the next animation frame so the DOM actually visually clears the overlay
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      try {
        await exportProject(canvasEl, state, format, scale);
        toast('Export successful');
      } catch (err) {
        console.error('Export error:', err);
        toast('Export failed: ' + err.message);
      }
    });
  });

  // ==========================================
  //  MOBILE HAMBURGER MENU WIRING
  // ==========================================
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const desktopActions = document.getElementById('desktop-actions');
  
  if (mobileMenuBtn && desktopActions) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent immediate closing
      desktopActions.classList.toggle('show');
    });

    // Close the hamburger menu if the user clicks anywhere else
    document.addEventListener('click', () => {
      desktopActions.classList.remove('show');
    });

    // Prevent clicks inside the menu from closing it
    desktopActions.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Auto-close menu when a button inside it is clicked (New, Open, Save)
    desktopActions.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        desktopActions.classList.remove('show');
      });
    });
  }
  // ==========================================

  // Click on canvas empty area to deselect
  document.getElementById('canvas-wrap').addEventListener('mousedown', (e) => {
    if (
      e.target === canvasEl || 
      e.target === overlayEl || 
      e.target === document.getElementById('canvas-wrap')
    ) {
      selection.clear();
      
      // ✅ FIX 1 (Continued): Hide all bottom sheets on mobile when clicking empty canvas
      if (window.innerWidth <= 768) {
        document.querySelector('.properties')?.classList.remove('active');
        document.querySelector('.rail-panel')?.classList.remove('active');
        document.querySelectorAll('.rail-btn').forEach(b => b.classList.remove('active'));
      }
    }
  });

  render(state, canvasEl);
  state.trigger('init');
}

function render(state, canvasEl) {
  // Apply canvas dimensions and background
  canvasEl.style.width = state.canvas.width + 'px';
  canvasEl.style.height = state.canvas.height + 'px';
  canvasEl.style.background = state.canvas.background || '#ffffff';
  document.getElementById('status-canvas-size').textContent = `${state.canvas.width} × ${state.canvas.height} px`;

  // Diff-render elements
  const existing = new Map();
  canvasEl.querySelectorAll('.el').forEach(node => existing.set(node.dataset.id, node));

  state.elements.forEach((el, index) => {
    let node = existing.get(el.id);
    if (!node) {
      node = renderElement(el);
      canvasEl.appendChild(node);
    } else {
      renderElement(el, node);
      existing.delete(el.id);
    }
    node.style.zIndex = index + 1;
  });
  existing.forEach(node => node.remove());
}

function syncCanvasSizeDropdown(state, sizesObj) {
  const select = document.getElementById('canvas-size');
  const w = state.canvas.width;
  const h = state.canvas.height;
  
  let matchedKey = 'custom';
  for (const [key, size] of Object.entries(sizesObj)) {
    if (size.width === w && size.height === h) {
      matchedKey = key;
      break;
    }
  }
  
  if (select.value !== matchedKey) {
    select.value = matchedKey;
    // VERY IMPORTANT: update the variable that tracks the last valid dropdown state
    previousSizeValue = matchedKey; // ✅ Now this perfectly updates the global variable
  }
}

main().catch(err => { 
  console.error(err); 
  alert('Failed to start: ' + err.message); 
});
