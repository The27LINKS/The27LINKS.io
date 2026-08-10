// loader.js — loads JSON data files
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}
export async function loadAll() {
  const [templates, shapes, colors, fonts, defaults] = await Promise.all([
    fetchJSON('https://the27links.in/assets/posterStudio/data/templates.json'),
    fetchJSON('https://the27links.in/assets/posterStudio/data/shapes.json'),
    fetchJSON('https://the27links.in/assets/posterStudio/data/colors.json'),
    fetchJSON('https://the27links.in/assets/posterStudio/data/fonts.json'),
    fetchJSON('https://the27links.in/assets/posterStudio/data/defaults.json'),
  ]);
  return { templates, shapes, colors, fonts, defaults };
}
