const assert = require('node:assert/strict');
const test = require('node:test');
const { isThemePreference, resolveThemeScheme } = require('./theme-preference.ts');

test('resolves explicit preferences without the system scheme', () => {
  assert.equal(resolveThemeScheme('light', 'dark'), 'light');
  assert.equal(resolveThemeScheme('dark', 'light'), 'dark');
});

test('resolves system preference and falls back to light', () => {
  assert.equal(resolveThemeScheme('system', 'dark'), 'dark');
  assert.equal(resolveThemeScheme('system', null), 'light');
});

test('accepts only supported stored preferences', () => {
  assert.equal(isThemePreference('system'), true);
  assert.equal(isThemePreference('sepia'), false);
  assert.equal(isThemePreference(null), false);
});
