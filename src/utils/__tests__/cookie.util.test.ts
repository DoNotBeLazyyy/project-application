import { getCookie, removeCookie, setCookie, splitByEncodedLength } from '@utils/cookie.util';
import { afterEach, describe, expect, it } from 'vitest';

// A session-like JSON value under 3000 characters whose encoded form is well over 4 KB:
// quotes and braces triple in size once encoded
const SESSION_VALUE = JSON.stringify({
    access_token: 'x'.repeat(1200),
    user: { name: 'Juan dela Cruz', note: '{"a":1}'.repeat(150) + ' 🎓 ñ' }
});

describe('cookie.util', () => {
    afterEach(() => {
        removeCookie('test_session');
    });

    describe('splitByEncodedLength', () => {
        it('keeps every encoded chunk within the limit and rejoins to the original', () => {
            const chunks = splitByEncodedLength(SESSION_VALUE, 3000);

            expect(SESSION_VALUE.length)
                .toBeLessThan(3000);
            expect(chunks.length)
                .toBeGreaterThan(1);
            chunks.forEach((chunk) => {
                expect(encodeURIComponent(chunk).length)
                    .toBeLessThanOrEqual(3000);
            });
            expect(chunks.join(''))
                .toBe(SESSION_VALUE);
        });

        it('never cuts an emoji in half', () => {
            const chunks = splitByEncodedLength('🎓'.repeat(10), 13);

            chunks.forEach((chunk) => {
                expect(() => encodeURIComponent(chunk)).not.toThrow();
            });
            expect(chunks.join(''))
                .toBe('🎓'.repeat(10));
        });
    });

    it('stores a value whose encoded form is long across chunks and reads it back', () => {
        setCookie('test_session', SESSION_VALUE);

        expect(getCookie('test_session'))
            .toBe(SESSION_VALUE);
    });

    it('stores a short value as one cookie', () => {
        setCookie('test_session', 'short');

        expect(getCookie('test_session'))
            .toBe('short');
    });
});