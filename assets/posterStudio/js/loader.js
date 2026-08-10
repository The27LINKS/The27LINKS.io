// loader.js — loads JSON data files
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
export async function loadAll() {
  const [templates, shapes, colors, fonts, defaults] = await Promise.all([
    fetchJSON('data/templates.json'),
    fetchJSON('data/shapes.json'),
    fetchJSON('data/colors.json'),
    fetchJSON('data/fonts.json'),
    fetchJSON('data/defaults.json'),
  ]);
  return { templates, shapes, colors, fonts, defaults };
}
