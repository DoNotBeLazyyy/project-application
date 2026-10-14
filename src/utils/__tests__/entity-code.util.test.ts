import { describe, expect, it } from 'vitest';
import {
    ensureUniqueCode,
    generateAcademicThresholdCode,
    generateSpecialGradeCode
} from '@utils/entity-code.util';

describe('entity-code.util', () => {
    describe('generateAcademicThresholdCode', () => {
        it('generates snake_case code from threshold label', () => {
            expect(generateAcademicThresholdCode('Summa Cum Laude'))
                .toBe('summa_cum_laude');
            expect(generateAcademicThresholdCode('Magna Cum Laude'))
                .toBe('magna_cum_laude');
            expect(generateAcademicThresholdCode('Cum Laude'))
                .toBe('cum_laude');
            expect(generateAcademicThresholdCode('Full Academic Scholarship'))
                .toBe('full_academic_scholarship');
            expect(generateAcademicThresholdCode('Good Standing'))
                .toBe('good_standing');
            expect(generateAcademicThresholdCode('Dean\'s Lister'))
                .toBe('deans_lister');
        });

        it('handles empty or whitespace-only labels gracefully', () => {
            expect(generateAcademicThresholdCode(''))
                .toBe('');
            expect(generateAcademicThresholdCode('   '))
                .toBe('');
            expect(generateAcademicThresholdCode('!@#$%'))
                .toBe('threshold');
        });

        it('ensures uniqueness when existing codes match', () => {
            const existing = ['summa_cum_laude', 'summa_cum_laude_2'];
            expect(generateAcademicThresholdCode('Summa Cum Laude', existing))
                .toBe('summa_cum_laude_3');
        });
    });

    describe('ensureUniqueCode', () => {
        it('returns candidate as-is if no collisions', () => {
            expect(ensureUniqueCode('BSCS', ['BSIT', 'BSCE']))
                .toBe('BSCS');
            expect(ensureUniqueCode('honor_roll', ['dean_list']))
                .toBe('honor_roll');
        });

        it('appends incrementing suffix for acronyms and codes with hyphen', () => {
            expect(ensureUniqueCode('BSCS', ['BSCS']))
                .toBe('BSCS-2');
            expect(ensureUniqueCode('BSCS', ['BSCS', 'BSCS-2']))
                .toBe('BSCS-3');
        });

        it('appends incrementing underscore suffix for snake_case codes', () => {
            expect(ensureUniqueCode('summa_cum_laude', ['summa_cum_laude']))
                .toBe('summa_cum_laude_2');
            expect(ensureUniqueCode('summa_cum_laude', ['summa_cum_laude', 'summa_cum_laude_2']))
                .toBe('summa_cum_laude_3');
        });
    });

    describe('generateSpecialGradeCode', () => {
        it('generates standard acronyms for well-known labels', () => {
            expect(generateSpecialGradeCode('Incomplete'))
                .toBe('INC');
            expect(generateSpecialGradeCode('Dropped'))
                .toBe('DRP');
            expect(generateSpecialGradeCode('Officially Dropped'))
                .toBe('OD');
            expect(generateSpecialGradeCode('Failure Due to Absences'))
                .toBe('FDA');
            expect(generateSpecialGradeCode('Withdrawal'))
                .toBe('W');
        });
    });
});