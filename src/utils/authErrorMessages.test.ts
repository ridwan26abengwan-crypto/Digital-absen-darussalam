import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { translateFirebaseAuthError } from './authErrorMessages.ts';

describe('translateFirebaseAuthError', () => {
  it('flags provider enable guidance on operation-not-allowed and configuration-not-found', () => {
    for (const code of [
      'auth/operation-not-allowed',
      'auth/configuration-not-found',
      'auth/admin-restricted-operation',
    ]) {
      const res = translateFirebaseAuthError(code);
      assert.equal(res.needsProviderEnable, true);
      assert.equal(res.guidance, 'provider');
      assert.match(res.message, /Email\/Password/);
    }
  });

  it('flags domain guidance with hostname on auth/unauthorized-domain', () => {
    const res = translateFirebaseAuthError('auth/unauthorized-domain', 'example.run.app');
    assert.equal(res.guidance, 'domain');
    assert.match(res.message, /example\.run\.app/);
  });

  it('provides google bootstrap hint on email-already-in-use and permission-denied', () => {
    const emailUsed = translateFirebaseAuthError('auth/email-already-in-use');
    assert.equal(emailUsed.guidance, 'google-bootstrap');
    assert.match(emailUsed.message, /Masuk dengan Akun Google/);

    const permDenied = translateFirebaseAuthError('permission-denied');
    assert.equal(permDenied.guidance, 'google-bootstrap');
    assert.match(permDenied.message, /permission-denied/);
  });

  it('includes raw error code in fallback message instead of hiding it', () => {
    const res = translateFirebaseAuthError('auth/internal-error');
    assert.equal(res.guidance, null);
    assert.match(res.message, /auth\/internal-error/);
  });
});
