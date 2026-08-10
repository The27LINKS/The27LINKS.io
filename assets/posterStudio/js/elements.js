// elements.js — renders element DOM from state
export function renderElement(el, existing) {
  const node = existing || document.createElement('div');
  node.className = 'el el-' + el.type + (el.locked ? ' locked' : '') + (el.hidden ? ' hidden' : '');
  node.dataset.id = el.id;
  node.style.left = el.x + 'px';
  node.style.top = el.y + 'px';
  node.style.width = el.width + 'px';
  node.style.height = el.height + 'px';
  node.style.transform = `rotate(${el.rotation || 0}deg)`;
  node.style.opacity = (el.opacity ?? 1);

  if (el.type === 'text') renderText(node, el);
  else if (el.type === 'shape') renderShape(node, el);
  else if (el.type === 'image') renderImage(node, el);
  return node;
}

function renderText(node, el) {
  let inner = node.querySelector('.el-text');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'el-text';
    node.innerHTML = ''; node.appendChild(inner);
  }
  // Only update text if not currently being edited
  if (inner.getAttribute('contenteditable') !== 'true') {
    inner.textContent = el.content || '';
  }
  inner.style.fontFamily = `"${el.fontFamily || 'Instrument Sans'}", sans-serif`;
  inner.style.fontSize = (el.fontSize || 40) + 'px';
  inner.style.fontWeight = el.fontWeight || 400;
  inner.style.fontStyle = el.fontStyle || 'normal';
  inner.style.textDecoration = el.textDecoration || 'none';
  inner.style.textTransform = el.textTransform || 'none';
  inner.style.color = el.color || '#000';
  inner.style.textAlign = el.textAlign || 'left';
  inner.style.letterSpacing = (el.letterSpacing || 0) + 'px';
  inner.style.lineHeight = el.lineHeight || 1.2;
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.display = 'flex';
  inner.style.flexDirection = 'column';
  inner.style.justifyContent = el.verticalAlign === 'middle' ? 'center' : el.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
  if (el.textShadow) inner.style.textShadow = el.textShadow;
  else inner.style.textShadow = 'none';
  if (el.textStroke) {
    inner.style.webkitTextStroke = el.textStroke;
  } else {
    inner.style.webkitTextStroke = '0';
  }
}

function renderShape(node, el) {
  const shape = el.shape || 'rectangle';
  const fill = el.fill || '#ff6b4a';
  const stroke = el.stroke || 'transparent';
  const sw = el.strokeWidth || 0;
  const r = el.radius || 0;
  const filter = el.shadow ? `filter="url(#s-${el.id})"` : '';
  let inner = '';
  const defs = el.shadow
    ? `<defs><filter id="s-${el.id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="${el.shadowBlur || 8}"/><feOffset dx="${el.shadowX || 0}" dy="${el.shadowY || 6}" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    : '';
  const dash = el.dashed ? `stroke-dasharray="${sw * 3},${sw * 2}"` : '';

  switch (shape) {
    case 'rectangle':
      inner = `<rect x="0" y="0" width="100%" height="100%" rx="${r}" ry="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter}/>`; break;
    case 'circle': case 'ellipse':
      inner = `<ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter}/>`; break;
    case 'triangle':
      inner = `<polygon points="50,0 100,100 0,100" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'diamond':
      inner = `<polygon points="50,0 100,50 50,100 0,50" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'hexagon':
      inner = `<polygon points="25,0 75,0 100,50 75,100 25,100 0,50" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'star':
      inner = `<polygon points="50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'heart':
      inner = `<path d="M50,90 C10,64 10,20 32,20 C42,20 48,28 50,34 C52,28 58,20 68,20 C90,20 90,64 50,90 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'arrow':
      inner = `<path d="M0,40 L60,40 L60,20 L100,50 L60,80 L60,60 L0,60 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    case 'line':
      inner = `<line x1="0" y1="50" x2="100" y2="50" stroke="${fill}" stroke-width="${sw || 6}" ${dash} ${filter} vector-effect="non-scaling-stroke"/>`; break;
    default:
      inner = `<rect x="0" y="0" width="100%" height="100%" rx="${r}" fill="${fill}"/>`;
  }
  node.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${defs}${inner}</svg>`;
}

function renderImage(node, el) {
  let img = node.querySelector('img');
  if (!img) {
    img = document.createElement('img');
    node.innerHTML = ''; node.appendChild(img);
  }
  img.src = el.src || '';
  img.crossOrigin = 'anonymous';
  img.style.filter = [
    el.brightness != null ? `brightness(${el.brightness}%)` : '',
    el.contrast != null ? `contrast(${el.contrast}%)` : '',
    el.saturation != null ? `saturate(${el.saturation}%)` : '',
    el.blur ? `blur(${el.blur}px)` : ''
  ].filter(Boolean).join(' ') || 'none';
  img.style.transform = `${el.flipH ? 'scaleX(-1)' : ''} ${el.flipV ? 'scaleY(-1)' : ''}`.trim() || 'none';
  node.style.borderRadius = (el.radius || 0) + 'px';
  node.style.boxShadow = el.shadow ? `0 ${el.shadowY || 8}px ${el.shadowBlur || 16}px rgba(0,0,0,0.35)` : 'none';
  node.style.border = el.borderWidth ? `${el.borderWidth}px solid ${el.borderColor || '#000'}` : 'none';
}
