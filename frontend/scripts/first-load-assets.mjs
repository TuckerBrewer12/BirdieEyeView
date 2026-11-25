const TAG = /<(script|link)\b[^>]*>/gi;
const ATTR = /([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function attributes(tag) {
  const attrs = {};
  for (const [, name, , double, single, bare] of tag.matchAll(ATTR)) {
    attrs[name.toLowerCase()] = double ?? single ?? bare;
  }
  return attrs;
}

function local(url, outDir) {
  if (!url || /^([a-z]+:)?\/\//i.test(url) || url.startsWith("data:")) return null;
  return `${outDir}/${url.replace(/^\.?\//, "")}`;
}

export function firstLoadAssets(html, outDir = "dist") {
  const js = [];
  const css = [];
  for (const [tag, element] of html.matchAll(TAG)) {
    const attrs = attributes(tag);
    if (element.toLowerCase() === "script") {
      if (attrs.type === "module") js.push(local(attrs.src, outDir));
    } else if (attrs.rel === "modulepreload") {
      js.push(local(attrs.href, outDir));
    } else if (attrs.rel === "stylesheet") {
      css.push(local(attrs.href, outDir));
    }
  }
  const present = (paths) => [...new Set(paths.filter(Boolean))];
  return { js: present(js), css: present(css) };
}
