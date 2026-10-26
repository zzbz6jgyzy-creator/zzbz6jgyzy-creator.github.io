(function () {
  'use strict';
  const root = document.querySelector('.gx-studio'), M = window.SDGrokModel, V = window.SDGrokView;
  if (!root || !M || !V) return;
  const $ = id => document.getElementById(id), KEY = 'sd-grok-studio-v1';
  let d, prefs, storage = true, recipe;
  try { d = M.validate(JSON.parse($('gx-data').textContent)); } catch { return; }
  try { prefs = M.preferences(JSON.parse(localStorage.getItem(KEY) || '{}'), d); }
  catch { prefs = M.preferences({}, d); storage = false; }
  recipe = d.templates[0];
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(M.preferences(prefs, d))); storage = true; }
    catch { storage = false; }
    $('gx-storage-note').textContent = storage
      ? 'Your progress and saved template choices stay in this browser.'
      : 'Browser storage is unavailable. Your progress and saved choices will last for this page visit.';
  }
  function setProduct(id, scroll = false) {
    if (!d.products.some(p => p.id === id)) return;
    prefs.product = id;
    root.querySelectorAll('[data-gx-tab]').forEach(button => {
      const selected = button.dataset.gxTab === id;
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
    });
    root.querySelectorAll('[data-gx-panel]').forEach(panel => {
      panel.hidden = panel.dataset.gxPanel !== id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'gx-tab-' + panel.dataset.gxPanel);
    });
    persist();
    if (scroll) $('capabilities').scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function setLevel(id) {
    if (id !== 'all' && !d.levels.some(l => l.id === id)) return;
    prefs.level = id;
    root.querySelectorAll('[data-gx-level]').forEach(b => b.setAttribute('aria-pressed', b.dataset.gxLevel === id));
    root.querySelectorAll('[data-gx-level-group]').forEach(group => { group.hidden = id !== 'all' && group.dataset.gxLevelGroup !== id; });
    persist();
  }
  function updateProgress() {
    const p = M.progress(prefs, d);
    $('gx-progress-label').textContent = p.done + ' of ' + p.total + ' lessons complete';
    $('gx-progress').setAttribute('aria-valuenow', p.done);
    $('gx-progress').querySelector('i').style.width = p.percent + '%';
    const next = prefs.lesson && !prefs.completed.includes(prefs.lesson) ? prefs.lesson : p.next;
    $('gx-continue').href = '#lesson-' + next;
    $('gx-continue').dataset.gxLesson = next;
    for (const button of root.querySelectorAll('[data-gx-complete]')) {
      const done = prefs.completed.includes(button.dataset.gxComplete);
      button.setAttribute('aria-pressed', done);
      button.querySelector('span').textContent = done ? 'Completed / undo' : 'Mark as complete';
      $('lesson-' + button.dataset.gxComplete).classList.toggle('gx-is-complete', done);
    }
    persist();
  }
  function openLesson(id, scroll = true) {
    const l = d.lessons.find(l => l.id === id);
    if (!l) return;
    prefs.lesson = id;
    if (prefs.level !== 'all' && prefs.level !== l.level) setLevel(l.level);
    const detail = $('lesson-' + id);
    detail.open = true;
    updateProgress();
    if (scroll) detail.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function outputPrompt() {
    $('gx-prompt-output').value = M.prompt(recipe, {
      goal: $('gx-goal').value, context: $('gx-context').value,
      constraints: $('gx-constraints').value, format: $('gx-format').value
    });
    $('gx-prompt-status').textContent = '';
  }
  function updateSaved() {
    const saved = prefs.saved.includes(recipe.id);
    $('gx-save-template').setAttribute('aria-pressed', saved);
    $('gx-save-template').querySelector('span').textContent = saved ? 'Example saved' : 'Save example';
    $('gx-saved-examples').innerHTML = prefs.saved.length
      ? prefs.saved.map(id => {
        const t = d.templates.find(t => t.id === id);
        return '<button type="button" data-gx-template="' + id + '">' + V.star + M.esc(t.name) + '</button>';
      }).join('')
      : '<p>No saved examples yet.</p>';
    persist();
  }
  function selectTemplate(id, scroll = false) {
    const t = d.templates.find(t => t.id === id);
    if (!t) return;
    recipe = t;
    for (const key of ['goal', 'context', 'constraints', 'format']) $('gx-' + key).value = t[key];
    $('gx-recipe-title').textContent = t.name;
    $('gx-prompt-product').textContent = d.products.find(p => p.id === t.product).name;
    root.querySelectorAll('[data-gx-recipe]').forEach(b => b.setAttribute('aria-pressed', b.dataset.gxRecipe === id));
    const link = $('gx-open-product');
    link.href = t.product === 'bot' ? 'https://x.ai/bot' : t.product === 'build' ? 'https://docs.x.ai/build/overview' : t.product === 'api' ? 'https://docs.x.ai/overview' : 'https://grok.com/';
    link.innerHTML = (t.product === 'bot' ? 'Open Grok Bot' : t.product === 'build' ? 'Open Build guide' : t.product === 'api' ? 'Open API guide' : 'Open Grok') + V.arrow;
    outputPrompt(); updateSaved();
    if (scroll) $('prompt-studio').scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  function compare() {
    const first = d.models.find(m => m.id === $('gx-model-a').value), second = d.models.find(m => m.id === $('gx-model-b').value);
    $('gx-model-results').innerHTML = [first, second].map(m => V.model(m, d)).join('');
  }
  function calculate() {
    const result = M.estimate(d, {
      model: $('gx-cost-model').value, region: $('gx-cost-region').value,
      input: $('gx-input').value, output: $('gx-output').value, requests: $('gx-requests').value
    });
    $('gx-estimate-result').innerHTML = V.estimateResult(result);
  }
  async function copy(value, target, field) {
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      target.textContent = 'Copied. Ready to use.';
    } catch {
      target.textContent = field ? 'Select and copy the prompt below using your device’s copy command.' : 'Copy this text: ' + value;
      if (field) { field.focus(); field.select(); }
    }
  }
  function pushHash(hash) { if (location.hash !== hash) history.pushState(null, '', location.pathname + location.search + hash); }
  function route() {
    const hash = location.hash.slice(1);
    const l = d.lessons.find(l => hash === 'lesson-' + l.id);
    const t = d.templates.find(t => hash === 'prompt-' + t.id);
    const p = d.products.find(p => hash === 'capability-' + p.id);
    if (l) openLesson(l.id);
    else if (t) selectTemplate(t.id, true);
    else if (p) setProduct(p.id, true);
    else if (d.levels.some(l => l.id === hash)) { setLevel(hash); $(hash).scrollIntoView({ block: 'start', behavior: 'auto' }); }
    else if (hash === 'marketplace') { $('marketplace').open = true; $('marketplace').scrollIntoView({ block: 'start' }); }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button,a');
    if (!button) return;
    const a = button.dataset;
    if (a.gxTab) { setProduct(a.gxTab); return; }
    if (a.gxSelect) { event.preventDefault(); pushHash('#capability-' + a.gxSelect); setProduct(a.gxSelect, true); return; }
    if (a.gxLevel) { setLevel(a.gxLevel); return; }
    if (a.gxLesson) { event.preventDefault(); pushHash('#lesson-' + a.gxLesson); openLesson(a.gxLesson); return; }
    if (a.gxComplete) {
      prefs.completed = prefs.completed.includes(a.gxComplete) ? prefs.completed.filter(id => id !== a.gxComplete) : [...prefs.completed, a.gxComplete];
      updateProgress(); return;
    }
    if (button.id === 'gx-reset-progress') { prefs.completed = []; prefs.lesson = ''; updateProgress(); return; }
    if (a.gxTemplate || a.gxRecipe) { event.preventDefault(); selectTemplate(a.gxTemplate || a.gxRecipe, Boolean(a.gxTemplate)); return; }
    if (button.id === 'gx-save-template') {
      prefs.saved = prefs.saved.includes(recipe.id) ? prefs.saved.filter(id => id !== recipe.id) : [...prefs.saved, recipe.id];
      updateSaved(); return;
    }
    if (button.id === 'gx-copy-prompt') { copy($('gx-prompt-output').value, $('gx-prompt-status'), $('gx-prompt-output')); return; }
    if (a.gxCopyLesson) {
      const l = d.lessons.find(l => l.id === a.gxCopyLesson);
      copy(l.prompt, root.querySelector('[data-gx-lesson-status="' + l.id + '"]')); return;
    }
    if (a.gxCopyLink) { copy(M.share(a.gxCopyLink, d), root.querySelector('[data-gx-lesson-status="' + a.gxCopyLink + '"]')); return; }
    if (a.gxBilling) {
      root.querySelectorAll('[data-gx-billing]').forEach(b => b.setAttribute('aria-pressed', b === button));
      $('gx-plan-results').innerHTML = d.plans.map(p => V.plan(p, a.gxBilling)).join('');
    }
  });
  root.addEventListener('toggle', event => {
    const id = event.target.dataset?.gxLessonCard;
    if (id && event.target.open) { prefs.lesson = id; updateProgress(); }
  }, true);
  for (const id of ['gx-goal','gx-context','gx-constraints','gx-format']) $(id).addEventListener('input', outputPrompt);
  for (const id of ['gx-model-a','gx-model-b']) $(id).addEventListener('change', compare);
  for (const id of ['gx-cost-model','gx-cost-region','gx-input','gx-output','gx-requests']) $(id).addEventListener('input', calculate);
  const tabs = [...root.querySelectorAll('[data-gx-tab]')];
  for (const tab of tabs) tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setProduct(tabs[index].dataset.gxTab); tabs[index].focus();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  root.dataset.enhanced = 'true';
  setProduct(prefs.product); setLevel(prefs.level); updateProgress(); selectTemplate(recipe.id); compare(); calculate(); route();
})();
