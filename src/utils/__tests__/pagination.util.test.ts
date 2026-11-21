import { clampPage } from '@utils/pagination.util';
import { describe, expect, it } from 'vitest';

describe('pagination.util', () => {
    describe('clampPage', () => {
        it('rounds a fractional page to a whole page', () => {
            expect(clampPage(1.5, 5))
                .toBe(2);
            expect(clampPage(2.4, 5))
                .toBe(2);
        });

        it('keeps the page between 1 and the last page', () => {
            expect(clampPage(0, 5))
                .toBe(1);
            expect(clampPage(-3, 5))
                .toBe(1);
            expect(clampPage(9, 5))
                .toBe(5);
            expect(clampPage(4.6, 4))
                .toBe(4);
        });

        it('falls back to page 1 for a non-number or an empty list', () => {
            expect(clampPage(Number.NaN, 5))
                .toBe(1);
            expect(clampPage(3, 0))
                .toBe(1);
        });
    });
});