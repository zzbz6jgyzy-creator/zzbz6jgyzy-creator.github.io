(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SpaceXStudio = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const internal = value => typeof value === 'string' && /^\/(?!\/)/.test(value);
  const safeURL = value => internal(value) || /^https:\/\//.test(value || '');
  function bounds(event) {
    const precision = event.precision;
    if (precision === 'datetime') {
      const start = Date.parse(event.start);
      const suppliedEnd = Date.parse(event.windowEnd || event.end);
      return Number.isFinite(start) ? {start, end: Number.isFinite(suppliedEnd) && suppliedEnd > start ? suppliedEnd : start} : null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) return null;
    const [y,m,day] = event.date.split('-').map(Number);
    if (precision === 'day') return {start: Date.UTC(y,m-1,day), end: Date.UTC(y,m-1,day+1)};
    if (precision === 'month') return {start: Date.UTC(y,m-1,1), end: Date.UTC(y,m,1)};
    if (precision === 'quarter') {const q = Math.floor((m-1)/3)*3; return {start:Date.UTC(y,q,1),end:Date.UTC(y,q+3,1)};}
    if (precision === 'year') return {start: Date.UTC(y,0,1), end: Date.UTC(y+1,0,1)};
    return null;
  }
  function family(event) {
    const text = event.title + ' ' + (event.vehicle || '');
    if (/starship|super heavy/i.test(text)) return 'starship';
    if (/dragon|crew|axiom|crs[ -]/i.test(text)) return 'dragon';
    return /falcon heavy/i.test(text) ? 'heavy' : 'falcon9';
  }
  function upcoming(events, now, filter='all') {
    return events.filter(event => !/^(done|ended|cancelled|canceled|failed|success|launched)$/i.test(event.status || ''))
      .filter(event => {const b=bounds(event); return !b || b.end > now;})
      .filter(event => filter==='all' || family(event)===filter)
      .sort((a,b) => (bounds(a)?.start ?? Infinity)-(bounds(b)?.start ?? Infinity) || a.title.localeCompare(b.title));
  }
  function date(event, zone='UTC') {
    const b=bounds(event);
    if (!b) return 'Date pending';
    if (event.precision==='year') return String(new Date(b.start).getUTCFullYear())+' target';
    if (event.precision==='quarter') return 'Q'+(Math.floor(new Date(b.start).getUTCMonth()/3)+1)+' '+new Date(b.start).getUTCFullYear();
    const options={day:'numeric',month:'short',year:'numeric',timeZone:'UTC'};
    if (event.precision==='month') delete options.day;
    if (event.precision==='datetime') Object.assign(options,{hour:'2-digit',minute:'2-digit',timeZoneName:'short',timeZone:zone});
    try {return new Intl.DateTimeFormat('en-GB',options).format(new Date(b.start));}
    catch {return date(event,'UTC');}
  }
  function countdown(event, now) {
    const b=bounds(event);
    if (event.precision!=='datetime' || !b) return 'Planning target · time not confirmed';
    if (b.start<=now) return 'Scheduled window reached · check the source';
    const minutes=Math.floor((b.start-now)/60000), days=Math.floor(minutes/1440), hours=Math.floor(minutes%1440/60), mins=minutes%60;
    return 'Target opens in '+(days?days+'d ':'')+hours+'h '+mins+'m';
  }
  function topic(article) {
    const t=article.title+' '+article.tag;
    if (/starship|raptor|super heavy|artemis|moon/i.test(t)) return 'starship';
    if (/starlink|starshield/i.test(t)) return 'starlink';
    if (/dragon|crew|\biss\b|crs-/i.test(t)) return 'dragon';
    return 'company';
  }
  function clean(raw,d) {
    const known=new Set(d.tools.map(t=>t.id));
    return {pins:[...new Set(Array.isArray(raw?.pins)?raw.pins:[])].filter(x=>known.has(x)).slice(0,5),
      saved:[...new Set(Array.isArray(raw?.saved)?raw.saved:[])].filter(x=>d.events.some(e=>e.id===x)).slice(0,30)};
  }
  function validate(d) {
    if (d?.schema!==1 || !/^\d{4}-\d{2}-\d{2}$/.test(d.reviewed) || d.programs?.length!==5 || !Number.isFinite(Date.parse(d.scheduleAsOf))) throw Error('Invalid SpaceX editorial data');
    const ids=new Set(d.sources.map(s=>s.id));
    if (ids.size!==d.sources.length || d.sources.some(s=>!/^https:\/\//.test(s.url))) throw Error('Invalid sources');
    for (const rows of [d.programs,d.steps,d.tools,d.events]) if (new Set(rows.map(x=>x.id)).size!==rows.length) throw Error('Duplicate records');
    if (d.programs.some(p=>!ids.has(p.source)||!internal(p.href)) || d.steps.some(s=>!ids.has(s.source)) || d.tools.some(t=>!internal(t.href))) throw Error('Invalid editorial references');
    if (d.articles.some(a=>!internal(a.url)||!internal(a.image)) || d.events.some(e=>e.href&&!safeURL(e.href))) throw Error('Unsafe destination');
    return d;
  }
  return {esc,safeURL,internal,bounds,family,upcoming,date,countdown,topic,clean,validate};
});
