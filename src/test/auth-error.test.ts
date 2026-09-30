import { describe, expect, it } from 'vitest';
import { clearAuthUrlError, parseAuthUrlError } from '../utils/auth-error.util';

describe('auth-error.util', () => {
    it('returns null when there is no error in URL', () => {
        window.location.hash = '';
        window.location.search = '';
        expect(parseAuthUrlError()).toBeNull();
    });

    it('parses otp_expired error and provides user-friendly message', () => {
        window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=';
        const res = parseAuthUrlError();
        expect(res).not.toBeNull();
        expect(res?.errorCode).toBe('otp_expired');
        expect(res?.userMessage).toContain('expired or has already been used');
    });

    it('clears hash error cleanly', () => {
        window.location.hash = '#error=access_denied';
        clearAuthUrlError();
        expect(window.location.hash).toBe('');
    });
});
