// Run with: node scripts/test-newsletter-retry.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../newsletter.js', import.meta.url), 'utf8');
function signup({ legacyFlag = null, path = '/', topic = 'website', place = 'band', honey = '', email = 'Reader@Example.com' } = {}) {
  const callbacks = {};
  const input = { setAttribute() {}, focus() {} };
  const status = { textContent: '', classList: { toggle() {} } };
  const form = {
    dataset: {}, hidden: false,
    querySelector: (selector) => selector === "input[name='website']" ? { value: honey } : input,
    closest: (selector) => selector.startsWith('[data-') ? { getAttribute: () => selector === '[data-band-topic]' ? topic : place } : (selector === '.sd-pop' && place === 'pop' || selector === '.sd-band' && place === 'band') ? {} : null,
    addEventListener: (event, callback) => { callbacks[event] = callback; }
  };
  const root = { querySelector: (selector) => selector === '[data-newsletter-form]' ? form : selector === '[data-newsletter-status]' ? status : null };
  const storage = new Map(legacyFlag ? [['sd-nl-sub', legacyFlag]] : []);
  const location = { pathname: path, href: '' };
  vm.runInNewContext(source, {
    window: {}, location,
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { querySelectorAll: () => [root], querySelector: () => null },
    FormData: class { get() { return email; } },
    URL, encodeURIComponent
  });
  return { form, status, storage, location, submit: () => callbacks.submit({ preventDefault() {} }) };
}

for (const legacyFlag of [null, '1']) {
  test(`an abandoned signup remains retryable (legacy flag ${legacyFlag})`, () => {
    const page = signup({ legacyFlag });
    assert.equal(page.form.hidden, false);
    assert.equal(page.status.textContent, '');
    page.submit();
    const destination = new URL(page.location.href);
    assert.equal(destination.origin, 'https://alexs-newsletter-84b17e.beehiiv.com');
    assert.equal(destination.searchParams.get('email'), 'reader@example.com');
    assert.equal(page.storage.get('sd-nl-sub') ?? null, legacyFlag);
    // A reload/return still binds a usable form with the same persisted storage.
    const returned = signup({ legacyFlag: page.storage.get('sd-nl-sub') });
    assert.equal(returned.form.hidden, false);
    returned.submit();
    assert.ok(returned.location.href);
  });
}

test('newsletter topic and placement attribution survive the retry fix', () => {
  for (const [path, topic, place, expectedTopic, expectedMedium] of [
    ['/', 'website', 'band', 'website', 'site-band'],
    ['/roadster.html', 'roadster', 'article', 'roadster', 'site-article'],
    ['/my-tesla.html', 'not-allowlisted', 'tracker', 'tesla-software', 'site-tracker'],
    ['/starship.html', 'not-allowlisted', 'band', 'spacex', 'site-band']
  ]) {
    const page = signup({ path, topic, place }); page.submit();
    const params = new URL(page.location.href).searchParams;
    assert.equal(params.get('utm_source'), 'website');
    assert.equal(params.get('utm_campaign'), path);
    assert.equal(params.get('utm_content'), expectedTopic);
    assert.equal(params.get('utm_medium'), expectedMedium);
  }
});

test('honeypot submissions do not redirect or persist subscriber state', () => {
  const page = signup({ honey: 'https://spam.example' }); page.submit();
  assert.equal(page.location.href, '');
  assert.equal(page.storage.size, 0);
});

test('empty email remains a validation error', () => {
  const page = signup({ email: '' }); page.submit();
  assert.equal(page.location.href, '');
  assert.equal(page.status.textContent, 'Add an email address.');
  assert.equal(page.storage.size, 0);
});
