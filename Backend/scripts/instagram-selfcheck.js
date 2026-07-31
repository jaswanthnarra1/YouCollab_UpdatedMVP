/**
 * Assert-based self-check for the Instagram integration's non-trivial logic:
 * token-at-rest encryption and the stateless signed OAuth CSRF state. No
 * framework, no fixtures, no network/DB access — run with:
 *   node Backend/scripts/instagram-selfcheck.js
 * Exits non-zero on any failure, so it's CI-friendly without adopting Jest.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('assert');
const { encryptSecret, decryptSecret, signOAuthState, verifyOAuthState } = require('../src/utils/crypto');

let passed = 0;
const check = (label, fn) => {
  fn();
  passed += 1;
  console.log(`  ok — ${label}`);
};

console.log('Instagram integration self-check\n');

console.log('encryption:');
check('round-trips a plaintext token', () => {
  const plaintext = 'IGQVJYb64_fake_long_lived_token_1234567890';
  const encrypted = encryptSecret(plaintext);
  assert.notStrictEqual(encrypted, plaintext, 'stored value must not equal the plaintext');
  assert.strictEqual(decryptSecret(encrypted), plaintext);
});

check('produces a different ciphertext each time (random IV)', () => {
  const a = encryptSecret('same-input');
  const b = encryptSecret('same-input');
  assert.notStrictEqual(a, b);
});

check('rejects a tampered ciphertext', () => {
  const encrypted = encryptSecret('another-token');
  const [iv, tag, ct] = encrypted.split(':');
  const tampered = [iv, tag, ct.slice(0, -2) + (ct.slice(-2) === '00' ? '11' : '00')].join(':');
  assert.throws(() => decryptSecret(tampered), /Failed to decrypt/);
});

check('rejects a malformed stored value', () => {
  assert.throws(() => decryptSecret('not-the-expected-format'), /encrypted format/);
});

console.log('\nOAuth state (CSRF):');
check('accepts a state signed for the same user', () => {
  const state = signOAuthState('user-123', 'test-secret');
  assert.strictEqual(verifyOAuthState(state, 'user-123', 'test-secret'), true);
});

check('rejects a state presented by a different user', () => {
  const state = signOAuthState('user-123', 'test-secret');
  assert.strictEqual(verifyOAuthState(state, 'user-456', 'test-secret'), false);
});

check('rejects a state signed with a different secret', () => {
  const state = signOAuthState('user-123', 'secret-a');
  assert.strictEqual(verifyOAuthState(state, 'user-123', 'secret-b'), false);
});

check('rejects a tampered state payload', () => {
  const state = signOAuthState('user-123', 'test-secret');
  const decoded = Buffer.from(state, 'base64url').toString('utf8');
  const [uid, expiresAt, sig] = decoded.split('.');
  const tampered = Buffer.from(`${uid}-evil.${expiresAt}.${sig}`).toString('base64url');
  assert.strictEqual(verifyOAuthState(tampered, 'user-123-evil', 'test-secret'), false);
});

check('rejects garbage input without throwing', () => {
  assert.strictEqual(verifyOAuthState('not-base64-state', 'user-123', 'test-secret'), false);
});

console.log(`\n${passed} checks passed.`);
