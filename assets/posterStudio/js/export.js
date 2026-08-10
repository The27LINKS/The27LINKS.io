// export.js — PNG/JPEG/WebP/SVG/PDF export via html2canvas + jsPDF (lazy loaded)
import { toast } from 'https://the27links.in/assets/posterStudio/js/util.js';

let _libsLoaded = false;
async function loadLib(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
async function ensureLibs() {
  if (_libsLoaded) return;
  await loadLib('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
  await loadLib('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
  _libsLoaded = true;
}

export async function exportProject(canvasEl, state, format, scale = 2) {
  toast('Rendering export…');
  const filename = 'PosterStudio_' + Date.now();

  if (format === 'svg') return exportSVG(state, filename);

  try {
    await ensureLibs();
  } catch (libErr) {
    console.error('Failed to load export libraries:', libErr);
    toast('Export failed: Could not load libraries.');
    return;
  }

  // Save current transform, set to 1x for accurate rendering
  const origTransform = canvasEl.style.transform;
  const origWrap = canvasEl.parentElement;
  canvasEl.style.transform = 'scale(1)';
  origWrap.style.width = state.canvas.width + 'px';
  origWrap.style.height = state.canvas.height + 'px';

  const opts = {
    scale,
    backgroundColor: format === 'png' ? null : (state.canvas.background || '#ffffff'),
    useCORS: true,
    allowTaint: true, // Fallback to prevent external image CORS crashes
    logging: false,
    width: state.canvas.width,
    height: state.canvas.height,
  };

  try {
    const rendered = await window.html2canvas(canvasEl, opts);
    canvasEl.style.transform = origTransform;
    state.trigger('zoom');

    if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const orient = state.canvas.width >= state.canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation: orient, unit: 'px', format: [state.canvas.width, state.canvas.height] });
      pdf.addImage(rendered.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, state.canvas.width, state.canvas.height);
      pdf.save(filename + '.pdf');
      toast('PDF downloaded');
      return;
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const quality = format === 'png' ? undefined : 0.95;
    
    rendered.toBlob((blob) => {
      if (!blob) {
        toast('Export failed: Canvas is empty.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; 
      a.download = `${filename}.${format}`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(format.toUpperCase() + ' downloaded');
    }, mime, quality);

  } catch (err) {
    console.error('Export rendering error:', err);
    canvasEl.style.transform = origTransform;
    state.trigger('zoom');
    toast('Export failed. Check console for details.');
  }
}

function exportSVG(state, filename) {
  const w = state.canvas.width, h = state.canvas.height;
  let body = `<rect width="${w}" height="${h}" fill="${state.canvas.background || '#ffffff'}"/>`;
  state.elements.forEach(el => {
    if (el.hidden) return;
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
    const t = `transform="rotate(${el.rotation || 0} ${cx} ${cy}) translate(${el.x} ${el.y})" opacity="${el.opacity ?? 1}"`;
    if (el.type === 'text') {
      const size = el.fontSize || 40;
      const anchor = el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start';
      const ax = el.textAlign === 'center' ? el.width / 2 : el.textAlign === 'right' ? el.width : 0;
      const lines = (el.content || '').split('\n');
      const lh = (el.lineHeight || 1.2) * size;
      const tspans = lines.map((ln, i) => `<tspan x="${ax}" dy="${i === 0 ? size * 0.85 : lh}">${escapeXml(ln)}</tspan>`).join('');
      body += `<g ${t}><text font-family="${el.fontFamily || 'sans-serif'}" font-size="${size}" font-weight="${el.fontWeight || 400}" fill="${el.color || '#000'}" text-anchor="${anchor}">${tspans}</text></g>`;
    } else if (el.type === 'shape') {
      body += `<g ${t}><svg width="${el.width}" height="${el.height}" viewBox="0 0 100 100" preserveAspectRatio="none">${shapeSVG(el)}</svg></g>`;
    } else if (el.type === 'image' && el.src) {
      body += `<g ${t}><image href="${el.src}" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid slice"/></g>`;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.svg'; 
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('SVG downloaded');
}

function escapeXml(s) { return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }

function shapeSVG(el) {
  const fill = el.fill || '#ff6b4a', stroke = el.stroke || 'transparent', sw = el.strokeWidth || 0;
  const r = el.radius || 0;
  switch (el.shape) {
    case 'circle': case 'ellipse':
      return `<ellipse cx="50" cy="50" rx="50" ry="50" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'triangle':
      return `<polygon points="50,0 100,100 0,100" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    case 'diamond':
      return `<polygon points="50,0 100,50 50,100 0,50" fill="${fill}"/>`;
    case 'star':
      return `<polygon points="50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38" fill="${fill}"/>`;
    case 'heart':
      return `<path d="M50,90 C10,64 10,20 32,20 C42,20 48,28 50,34 C52,28 58,20 68,20 C90,20 90,64 50,90 Z" fill="${fill}"/>`;
    default:
      return `<rect x="0" y="0" width="100" height="100" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
}
