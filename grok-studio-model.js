(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SDGrokModel = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const text = (value, max = 1200) => typeof value === 'string' ? value.slice(0, max).trim() : '';
  const money = value => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 && value > 0 ? 4 : 2
  }).format(value);
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))
    : 'Date not recorded';
  const safeURL = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
    } catch { return ''; }
  };
  const internal = value => typeof value === 'string' && /^\/[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(value) && !value.includes('..') ? value : '';
  function unique(rows, key) {
    if (!Array.isArray(rows) || !rows.length) throw Error('Missing ' + key);
    const ids = rows.map(x => x.id);
    if (ids.some(id => !/^[a-z0-9][a-z0-9.-]*$/.test(id || '')) || new Set(ids).size !== ids.length) throw Error('Invalid IDs: ' + key);
    return new Set(ids);
  }
  function validate(d) {
    if (d?.schema_version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(d.checked || '')) throw Error('Invalid Grok snapshot');
    const sources = unique(d.sources, 'sources'), products = unique(d.products, 'products');
    const models = unique(d.models, 'models'), levels = unique(d.levels, 'levels');
    const lessons = unique(d.lessons, 'lessons'), templates = unique(d.templates, 'templates');
    unique(d.plans, 'plans'); unique(d.releases, 'releases'); unique(d.media, 'media');
    const sourceOK = id => sources.has(id);
    if (d.sources.some(s => !s.title || !safeURL(s.url) || !/^(docs\.)?x\.ai$/.test(new URL(s.url).hostname))) throw Error('Invalid official source');
    for (const p of d.products) {
      if (!p.name || !p.headline || !p.description || !p.boundary || !p.use?.length || !sourceOK(p.source) || !sourceOK(p.extra_source) || !lessons.has(p.lesson) || !templates.has(p.template)) throw Error('Invalid product');
    }
    for (const l of d.lessons) {
      if (!levels.has(l.level) || !products.has(l.product) || !l.title || !l.prompt || !l.check || l.steps?.length !== 3 || !l.sources?.length || l.sources.some(s => !sourceOK(s))) throw Error('Invalid lesson');
    }
    for (const t of d.templates) if (!products.has(t.product) || !t.goal || !t.context || !t.constraints || !t.format) throw Error('Invalid prompt template');
    for (const m of d.models) {
      if (!sourceOK(m.source) || !m.name || !Number.isInteger(m.context) || m.context <= 0 || m.threshold >= m.context || ['input','cached','output','long_input','long_cached','long_output','threshold'].some(k => !Number.isFinite(m[k]) || m[k] < 0)) throw Error('Invalid model rates');
    }
    for (const p of d.plans) if (![p.monthly, p.annual].every(n => Number.isFinite(n) && n >= 0) || typeof p.bot !== 'boolean') throw Error('Invalid subscription');
    for (const r of d.releases) if (!sourceOK(r.source) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date || '') || r.date > d.checked) throw Error('Invalid release');
    for (const m of d.media) if (!internal(m.poster) || !internal(m.src) || !m.src.endsWith('.mp4') || !sourceOK(m.source)) throw Error('Invalid local media');
    return d;
  }
  function preferences(raw, d) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const known = (value, list, fallback) => list.some(x => x.id === value) ? value : fallback;
    const ids = (list, valid) => [...new Set(Array.isArray(list) ? list.filter(x => typeof x === 'string' && valid.some(v => v.id === x)) : [])];
    return {
      completed: ids(raw.completed, d.lessons), saved: ids(raw.saved, d.templates),
      product: known(raw.product, d.products, 'research'),
      level: raw.level === 'all' ? 'all' : known(raw.level, d.levels, 'all'),
      lesson: known(raw.lesson, d.lessons, '')
    };
  }
  function progress(prefs, d) {
    const ids = preferences(prefs, d).completed;
    return { done: ids.length, total: d.lessons.length, percent: Math.round(ids.length / d.lessons.length * 100),
      next: d.lessons.find(l => !ids.includes(l.id))?.id || d.lessons[0].id };
  }
  function prompt(template, values = {}) {
    const goal = text(values.goal ?? template.goal, 700);
    const context = text(values.context ?? template.context, 1400);
    const constraints = text(values.constraints ?? template.constraints, 900);
    const format = text(values.format ?? template.format, 500);
    return ['Outcome: ' + (goal || '[Describe the result you want]'),
      'Context: ' + (context || '[Add the relevant material or background]'),
      'Constraints: ' + (constraints || '[Add scope and practical boundaries]'),
      'Return: ' + (format || '[Choose a useful output format]'),
      'Ask about missing information that would materially change the result. Label assumptions and identify anything you could not verify.'].join('\n\n');
  }
  function estimate(d, input) {
    const m = d.models.find(m => m.id === input.model);
    if (!m) return { error: 'Choose a listed model.' };
    const valid = v => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') && Number.isSafeInteger(Number(v)) && Number(v) >= 0;
    if (!valid(input.input) || !valid(input.output) || !valid(input.requests)) return { error: 'Enter whole, non-negative token counts and a request count.' };
    const a = Number(input.input), b = Number(input.output), n = Number(input.requests);
    if (n < 1 || n > 1000000) return { error: 'Use between 1 and 1,000,000 requests.' };
    if (a + b > m.context) return { error: 'Input plus output exceeds this model’s listed context window.' };
    if (!['global', 'us'].includes(input.region)) return { error: 'Choose a listed endpoint.' };
    const long = a >= m.threshold, factor = input.region === 'us' ? 1.1 : 1;
    const inputRate = long ? m.long_input : m.input, outputRate = long ? m.long_output : m.output;
    const inputCost = a * inputRate / 1000000 * factor, outputCost = b * outputRate / 1000000 * factor;
    return { model: m.id, long, inputRate, outputRate, factor, inputCost, outputCost,
      perRequest: inputCost + outputCost, total: (inputCost + outputCost) * n, requests: n };
  }
  function stories(raw) {
    const seen = new Set();
    return (Array.isArray(raw?.articles) ? raw.articles : [])
      .filter(a => a.topic === 'xai' && internal(a.url) && a.url.endsWith('.html') && typeof a.title === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a.date || ''))
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(a => !seen.has(a.url) && seen.add(a.url)).slice(0, 6)
      .map(a => ({ ...a, image: internal(a.image) || '/assets/og-v2.jpg', summary: text(a.summary, 500), imageAlt: text(a.imageAlt, 300) || a.title }));
  }
  function share(id, d) {
    const known = [...d.lessons, ...d.templates].some(x => x.id === id);
    return 'https://superchargeddaily.com/grok.html' + (known ? '#'+(d.lessons.some(x => x.id === id) ? 'lesson-' : 'prompt-')+id : '#tutorial');
  }
  return { esc, text, date, money, safeURL, internal, validate, preferences, progress, prompt, estimate, stories, share };
});
