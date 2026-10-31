import { WizardTransmutationRow } from '@type/school-year.type';
import { describe, expect, it } from 'vitest';

import { DEFAULT_TRANSMUTATION_ROWS, validateTransmutationRows } from '../wizard.constants';

describe('validateTransmutationRows', () => {
    it('should validate successfully for default transmutation rows', () => {
        const result = validateTransmutationRows(DEFAULT_TRANSMUTATION_ROWS);
        expect(result.isValid)
            .toBe(true);
        expect(result.error)
            .toBeUndefined();
    });

    it('should fail if rows is empty', () => {
        const result = validateTransmutationRows([]);
        expect(result.isValid)
            .toBe(false);
        expect(result.error)
            .toContain('Please define at least one transmutation row');
    });

    it('should fail if a succeeding row min percentage is greater than preceding row min percentage', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: '1.25', min_percentage: 96, max_percentage: 98, is_passing: true
            }
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(false);
        expect(result.fieldPath)
            .toBe('transmutation_rows.1.min_percentage');
        expect(result.error)
            .toContain('Min % (96%) cannot be greater than or equal to preceding Row #1 (1.00) Min % (95%)');
    });

    it('should fail if a succeeding row min percentage is equal to preceding row min percentage', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: '1.25', min_percentage: 95, max_percentage: 98, is_passing: true
            }
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(false);
        expect(result.fieldPath)
            .toBe('transmutation_rows.1.min_percentage');
        expect(result.error)
            .toContain('Min % (95%) cannot be greater than or equal to preceding Row #1 (1.00) Min % (95%)');
    });

    it('should fail if a succeeding row max percentage is equal to preceding row min percentage', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: '1.25', min_percentage: 90, max_percentage: 95, is_passing: true
            }
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(false);
        expect(result.fieldPath)
            .toBe('transmutation_rows.1.max_percentage');
        expect(result.error)
            .toContain('Max % (95%) cannot be greater than or equal to preceding Row #1 (1.00) Min % (95%)');
    });

    it('should fail if a succeeding row max percentage is greater than preceding row min percentage', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: '1.25', min_percentage: 90, max_percentage: 96, is_passing: true
            }
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(false);
        expect(result.fieldPath)
            .toBe('transmutation_rows.1.max_percentage');
        expect(result.error)
            .toContain('Max % (96%) cannot be greater than or equal to preceding Row #1 (1.00) Min % (95%)');
    });

    it('should succeed when succeeding row max and min are strictly less than preceding row min', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: '1.25', min_percentage: 90, max_percentage: 94, is_passing: true
            }
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(true);
        expect(result.error)
            .toBeUndefined();
    });

    it('should skip special conditional rows (e.g. INC, DRP) and compare against nearest preceding score row', () => {
        const rows: WizardTransmutationRow[] = [
            {
                label: '1.00', min_percentage: 95, max_percentage: 100, is_passing: true
            },
            {
                label: 'INC', min_percentage: null, max_percentage: null, is_passing: false, is_conditional: true, special_code: 'INC'
            },
            {
                label: '1.25', min_percentage: 90, max_percentage: 95, is_passing: true
            } // Invalid against 1.00 min 95
        ];

        const result = validateTransmutationRows(rows);
        expect(result.isValid)
            .toBe(false);
        expect(result.fieldPath)
            .toBe('transmutation_rows.2.max_percentage');
        expect(result.error)
            .toContain('Row #3 (1.25) Max % (95%) cannot be greater than or equal to preceding Row #1 (1.00) Min % (95%)');
    });
});