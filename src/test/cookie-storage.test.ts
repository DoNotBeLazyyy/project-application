import {
    cookieStorage,
    getCookie,
    removeCookie,
    setCookie
} from '@utils/cookie.util';
import {
    afterEach, beforeEach, describe, expect, it
} from 'vitest';

describe('Cookie Storage & Session Persistence Utility', () => {
    beforeEach(() => {
        cookieStorage.clear();
    });

    afterEach(() => {
        cookieStorage.clear();
    });

    describe('Basic Cookie Operations', () => {
        it('should write and read a simple cookie value', () => {
            setCookie('test_key', 'test_value');
            expect(getCookie('test_key'))
                .toBe('test_value');
        });

        it('should return null for non-existent cookie', () => {
            expect(getCookie('non_existent'))
                .toBeNull();
        });

        it('should remove an existing cookie', () => {
            setCookie('to_delete', 'value_to_delete');
            expect(getCookie('to_delete'))
                .toBe('value_to_delete');

            removeCookie('to_delete');
            expect(getCookie('to_delete'))
                .toBeNull();
        });

        it('should properly encode and decode special characters', () => {
            const specialValue = '{"email":"test+user@au.edu.ph","name":"Dr. Juan Dela Cruz, Ph.D.","active":true}';
            setCookie('special_data', specialValue);
            expect(getCookie('special_data'))
                .toBe(specialValue);
        });
    });

    describe('Web Storage Interface Compliance (CookieStorage)', () => {
        it('should set and get items via getItem and setItem', () => {
            cookieStorage.setItem('auth_token', 'jwt.header.payload.sig');
            expect(cookieStorage.getItem('auth_token'))
                .toBe('jwt.header.payload.sig');
        });

        it('should remove items via removeItem', () => {
            cookieStorage.setItem('role', 'faculty');
            expect(cookieStorage.getItem('role'))
                .toBe('faculty');

            cookieStorage.removeItem('role');
            expect(cookieStorage.getItem('role'))
                .toBeNull();
        });

        it('should compute length and access keys by index', () => {
            expect(cookieStorage.length)
                .toBe(0);

            cookieStorage.setItem('key1', 'val1');
            cookieStorage.setItem('key2', 'val2');

            expect(cookieStorage.length)
                .toBe(2);
            const firstKey = cookieStorage.key(0);
            const secondKey = cookieStorage.key(1);
            expect(['key1', 'key2'])
                .toContain(firstKey);
            expect(['key1', 'key2'])
                .toContain(secondKey);
            expect(cookieStorage.key(99))
                .toBeNull();
        });

        it('should clear all items via clear()', () => {
            cookieStorage.setItem('a', '1');
            cookieStorage.setItem('b', '2');
            cookieStorage.setItem('c', '3');
            expect(cookieStorage.length)
                .toBe(3);

            cookieStorage.clear();
            expect(cookieStorage.length)
                .toBe(0);
            expect(cookieStorage.getItem('a'))
                .toBeNull();
            expect(cookieStorage.getItem('b'))
                .toBeNull();
            expect(cookieStorage.getItem('c'))
                .toBeNull();
        });
    });

    describe('Chunking Mechanism for Large Session Payloads', () => {
        it('should chunk and transparently reconstruct payloads exceeding 3KB', () => {
            // Generate a 7500-character payload (resembling a large JWT token session with user metadata)
            const largeData = 'A'.repeat(7500);
            cookieStorage.setItem('large_session', largeData);

            const retrieved = cookieStorage.getItem('large_session');
            expect(retrieved)
                .toBe(largeData);
            expect(retrieved?.length)
                .toBe(7500);
        });

        it('should clean up old chunk cookies when overwritten with a small value', () => {
            const largeData = 'B'.repeat(6500);
            cookieStorage.setItem('dynamic_key', largeData);
            expect(cookieStorage.getItem('dynamic_key')?.length)
                .toBe(6500);

            // Overwrite with small value
            cookieStorage.setItem('dynamic_key', 'short_val');
            expect(cookieStorage.getItem('dynamic_key'))
                .toBe('short_val');

            // Verify chunk manifest and sub-chunks are deleted
            expect(getCookie('dynamic_key___chunks'))
                .toBeNull();
            expect(getCookie('dynamic_key___chunk_0'))
                .toBeNull();
        });

        it('should clean up all sub-chunks when removeItem is called on chunked key', () => {
            const largeData = 'C'.repeat(7000);
            cookieStorage.setItem('chunked_to_remove', largeData);
            expect(cookieStorage.getItem('chunked_to_remove'))
                .toBe(largeData);

            cookieStorage.removeItem('chunked_to_remove');
            expect(cookieStorage.getItem('chunked_to_remove'))
                .toBeNull();
            expect(getCookie('chunked_to_remove___chunks'))
                .toBeNull();
            expect(getCookie('chunked_to_remove___chunk_0'))
                .toBeNull();
        });

        it('should report logical key count accurately even when keys are chunked', () => {
            const largeData = 'D'.repeat(8000);
            cookieStorage.setItem('session_payload', largeData);
            cookieStorage.setItem('active_role', 'dean');

            // Even though session_payload is split into 3 chunks + 1 manifest, logical length is 2
            expect(cookieStorage.length)
                .toBe(2);
        });
    });

    describe('Zustand State Persist Compatibility', () => {
        it('should persist and hydrate serialized Zustand app state', () => {
            const mockZustandState = JSON.stringify({
                state: {
                    session: {
                        access_token: 'mock-access-token',
                        refresh_token: 'mock-refresh-token',
                        user: {
                            id: '550e8400-e29b-41d4-a716-446655440000',
                            email: 'faculty@arellano.edu.ph'
                        }
                    },
                    activeRole: 'faculty'
                },
                version: 0
            });

            cookieStorage.setItem('au-jas-app', mockZustandState);

            const rawStored = cookieStorage.getItem('au-jas-app');
            expect(rawStored).not.toBeNull();

            const parsed = JSON.parse(rawStored as string);
            expect(parsed.state.activeRole)
                .toBe('faculty');
            expect(parsed.state.session.user.email)
                .toBe('faculty@arellano.edu.ph');
        });
    });
});