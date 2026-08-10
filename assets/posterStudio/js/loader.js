// loader.js — loads JSON data files
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
export async function loadAll() {
  const [templates, shapes, colors, fonts, defaults] = await Promise.all([
    fetchJSON('/assets/posterStudio/data/templates.json'),
    fetchJSON('/assets/posterStudio/data/shapes.json'),
    fetchJSON('/assets/posterStudio/data/colors.json'),
    fetchJSON('/assets/posterStudio/data/fonts.json'),
    fetchJSON('/assets/posterStudio/data/defaults.json'),
  ]);
  return { templates, shapes, colors, fonts, defaults };
}
