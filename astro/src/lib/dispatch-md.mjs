// The Dispatch Markdown dialect (docs/writing-articles.md) for Astro. A line-for-line port of render_body(), inline(),
// table() and directive() in scripts/render-article.py: for the same text it must return the same HTML, which
// astro/scripts/check-md-parity.mjs proves on every syntax the dialect has. Change both together.
import fs from 'node:fs';
import path from 'node:path';

export class ArticleError extends Error {}

// Python's html.escape(s, quote=True / False)
export function esc(s, quote = true) {
  let t = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (quote) t = t.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  return t;
}

export function splitFront(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) throw new ArticleError('missing front matter (--- block)');
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (line.trim() && !line.startsWith('#')) {
      const i = line.indexOf(':');
      const k = i < 0 ? line : line.slice(0, i), v = i < 0 ? '' : line.slice(i + 1);
      meta[k.trim()] = v.trim().replace(/^"+|"+$/g, '');
    }
  }
  return [meta, text.slice(m[0].length)];
}

const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|#[^)\s]*)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g;
export function inline(s) {
  const out = [];
  let pos = 0;
  for (const m of s.matchAll(TOKEN)) {
    out.push(esc(s.slice(pos, m.index), false));
    if (m[1] !== undefined) {
      const ext = m[2].startsWith('http');
      const rel = ext && !m[2].includes('superchargeddaily.com') ? ' rel="noopener"' : '';
      out.push(`<a href="${esc(m[2])}"${rel}>${inline(m[1])}</a>`);
    } else if (m[3] !== undefined) out.push(`<strong>${inline(m[3])}</strong>`);
    else if (m[4] !== undefined) out.push(`<em>${inline(m[4])}</em>`);
    else out.push(`<code>${esc(m[5], false)}</code>`);
    pos = m.index + m[0].length;
  }
  out.push(esc(s.slice(pos), false));
  return out.join('');
}

function keyed(block) {
  const d = {};
  let last = null;
  for (const line of block) {
    const m = line.match(/^([a-z]+):\s*(.*)$/);
    if (m) { last = m[1]; d[last] = m[2]; }
    else if (last && line.startsWith('  ')) d[last] += ' ' + line.trim();
  }
  return d;
}

function need(d, name, ...keys) {
  for (const k of keys) if (!d[k]) throw new ArticleError(`::${name} needs '${k}:'`);
}

function mediaPath(p, name, root) {
  if (!p.startsWith('/assets/')) throw new ArticleError(`::${name}: file paths start with /assets/ (${p})`);
  if (!fs.existsSync(path.join(root, p.replace(/^\/+/, '')))) throw new ArticleError(`::${name}: ${p} does not exist; upload it to assets/dispatch/ first`);
  return p;
}

const pyStrip = (s) => s.replace(/^[\s]+|[\s]+$/g, '');
function table(rows, label) {
  const cells = rows.map((r) => pyStrip(r).replace(/^\|+|\|+$/g, '').split('|').map((c) => pyStrip(c)));
  const head = cells[0], body = cells.slice(2);
  const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
  const trs = body.map((r) => '      <tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('\n');
  return `<div class="sd-table-wrap" tabindex="0" role="region" aria-label="${esc(label)}"><table class="sd-table">\n` +
    `    <thead><tr>${th}</tr></thead>\n    <tbody>\n${trs}\n    </tbody>\n  </table></div>`;
}

function directive(name, d, uses, root) {
  if (name === 'pull') { need(d, name, 'text'); return `<p class="pull">${inline(d.text)}</p>`; }
  if (name === 'note') { need(d, name, 'text'); return `<p class="sd-note">${inline(d.text)}</p>`; }
  if (name === 'sources') {
    need(d, name, 'text');
    if (!d.text.includes('](')) throw new ArticleError('::sources must link every source');
    return `<p class="sources"><strong>Sources:</strong> ${inline(d.text)}</p>`;
  }
  if (name === 'image') {
    need(d, name, 'src', 'alt', 'caption');
    const src = mediaPath(d.src, name, root);
    return `<figure>\n  <img src="${esc(src)}" alt="${esc(d.alt)}" width="${esc(d.width || '1280')}" height="${esc(d.height || '720')}" ` +
      `loading="lazy" style="width:100%;height:auto" />\n  <figcaption>${inline(d.caption)}</figcaption>\n</figure>`;
  }
  if (name === 'video') {
    need(d, name, 'src', 'poster', 'caption');
    const src = mediaPath(d.src, name, root), poster = mediaPath(d.poster, name, root);
    return `<figure class="figure-video">\n  <video controls playsinline preload="metadata" poster="${esc(poster)}">\n` +
      `    <source src="${esc(src)}" type="video/mp4" />\n    Your browser does not support the video tag.\n  </video>\n` +
      `  <figcaption>${inline(d.caption)}</figcaption>\n</figure>`;
  }
  if (name === 'x') {
    need(d, name, 'url', 'author', 'text', 'caption');
    if (!/^https:\/\/x\.com\/\w+\/status\/\d+$/.test(d.url)) throw new ArticleError(`::x url must look like https://x.com/<user>/status/<id> (${d.url})`);
    uses.add('x');
    return `<figure class="figure-embed">\n  <blockquote class="twitter-tweet" data-media-max-width="720" data-dnt="true" data-theme="dark">\n` +
      `    <p lang="en" dir="ltr">${esc(d.text, false)}</p>\n` +
      `    — ${esc(d.author, false)} <a href="${esc(d.url)}">View the post on X</a>\n  </blockquote>\n` +
      `  <figcaption>${inline(d.caption)}</figcaption>\n</figure>`;
  }
  throw new ArticleError(`unknown directive ::${name}`);
}

/** Body Markdown -> list of HTML blocks, exactly like render_body() in scripts/render-article.py. */
export function renderBody(md, uses = new Set(), root = process.cwd()) {
  const lines = md.replace(/^\n+|\n+$/g, '').split(/\r\n|\r|\n/);
  const out = [];
  let i = 0, heading = 'Table';
  const LIST = /^(-|\d+\.)\s/;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('<!--') || /\bDRAFT\b/.test(line)) throw new ArticleError(`line ${i + 1}: remove DRAFT markers and HTML comments`);
    if (/^<[a-zA-Z]/.test(line)) throw new ArticleError(`line ${i + 1}: raw HTML is not allowed; use the directives in docs/writing-articles.md`);
    if (line.startsWith('::') && !/^::(x|video|image|note|sources|pull)\b/.test(line))
      throw new ArticleError(`line ${i + 1}: unknown directive ${line.split(/\s/)[0]}; use ::x, ::video, ::image, ::note, ::sources or ::pull`);
    const m = line.match(/^::(x|video|image|note|sources|pull)\b\s*(.*)$/);
    if (m) {
      const [, name, rest] = m;
      const block = [];
      i++;
      while (i < lines.length && lines[i].trim()) block.push(lines[i++]);
      const d = ['pull', 'note', 'sources'].includes(name) && rest ? { text: rest } : keyed(block);
      out.push(directive(name, d, uses, root));
      continue;
    }
    if (line.startsWith('## ')) { heading = line.slice(3).trim(); out.push(`<h2>${inline(heading)}</h2>`); i++; }
    else if (line.startsWith('### ')) { out.push(`<h3>${inline(line.slice(4).trim())}</h3>`); i++; }
    else if (line.startsWith('#')) throw new ArticleError(`line ${i + 1}: the title comes from front matter; use ## for sections`);
    else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      if (rows.length < 3 || !/^\|?\s*:?-{2,}/.test(rows[1])) throw new ArticleError('a table needs a header row, a |---| row and at least one body row');
      out.push(table(rows, heading));
    } else if (line.startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('>')) q.push(lines[i++].replace(/^[> ]+/, '').replace(/\s+$/, ''));
      out.push('<blockquote>\n  <p>' + inline(q.join(' ')) + '</p>\n</blockquote>');
    } else if (LIST.test(line)) {
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      const items = [];
      while (i < lines.length && LIST.test(lines[i])) items.push(lines[i++].replace(/^(-|\d+\.)\s+/, ''));
      out.push(`<${tag}>` + items.map((t) => `<li>${inline(t)}</li>`).join('') + `</${tag}>`);
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#|\||>|::|(-|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim());
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
  }
  return out;
}
