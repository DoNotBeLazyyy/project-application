import { describe, expect, it } from 'vitest';
import { formatHumanReadableDbError, parseServiceError } from '@utils/error.util';

describe('error.util', () => {
    describe('formatHumanReadableDbError', () => {
        it('transforms PostgreSQL unique constraint violation 23505 for department name into clear user message', () => {
            const rawError = {
                code: '23505',
                details: 'Key (name)=(College of Computer Studies) already exists.',
                hint: null,
                message: 'duplicate key value violates unique constraint "uidx_departments_name"'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('A department named "College of Computer Studies" already exists. Please choose a different name.');
        });

        it('transforms department code unique constraint violation into user-friendly message', () => {
            const rawError = {
                code: '23505',
                details: 'Key (code)=(CCS) already exists.',
                hint: null,
                message: 'duplicate key value violates unique constraint "uidx_departments_code"'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('A department with code "CCS" already exists. Please choose a different code.');
        });

        it('transforms email unique constraint violation into user-friendly message', () => {
            const rawError = {
                code: '23505',
                details: 'Key (email)=(dean@example.com) already exists.',
                hint: null,
                message: 'duplicate key value violates unique constraint "uidx_users_email"'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('The email address "dean@example.com" is already registered. Please use a different email.');
        });

        it('transforms foreign key violation 23503 into user-friendly message', () => {
            const rawError = {
                code: '23503',
                message: 'update or delete on table "departments" violates foreign key constraint "fk_programs_department"'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('This record cannot be modified or deleted because it is linked to other data in the system.');
        });

        it('transforms not null violation 23502 into user-friendly message', () => {
            const rawError = {
                code: '23502',
                message: 'null value in column "name" violates not-null constraint'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('Name is required. Please fill in all required fields.');
        });

        it('transforms permission error 42501 into user-friendly message', () => {
            const rawError = {
                code: '42501',
                message: 'permission denied for table departments'
            };

            const result = formatHumanReadableDbError(rawError);
            expect(result).toBe('You do not have permission to perform this action.');
        });
    });

    describe('parseServiceError', () => {
        it('returns human-readable message for the exact department bulk error 23505', () => {
            const rawError = {
                code: '23505',
                details: 'Key (name)=(College of Computer Studies) already exists.',
                hint: null,
                message: 'duplicate key value violates unique constraint "uidx_departments_name"'
            };

            const parsed = parseServiceError(rawError);
            expect(parsed.code).toBe('23505');
            expect(parsed.message).toBe('A department named "College of Computer Studies" already exists. Please choose a different name.');
        });

        it('handles standard Error objects correctly', () => {
            const error = new Error('Network connection failed');
            const parsed = parseServiceError(error);
            expect(parsed.message).toBe('Network connection failed');
            expect(parsed.code).toBeNull();
        });

        it('handles unknown objects gracefully', () => {
            const parsed = parseServiceError(null);
            expect(parsed.message).toBe('An unexpected error occurred');
        });
    });
});
