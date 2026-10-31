import { stripLeadingZeros } from '@utils/input.util';
import { describe, expect, it } from 'vitest';

describe('stripLeadingZeros', () => {
    it('returns empty string for null or undefined', () => {
        expect(stripLeadingZeros(null))
            .toBe('');
        expect(stripLeadingZeros(undefined))
            .toBe('');
        expect(stripLeadingZeros(''))
            .toBe('');
    });

    it('keeps single 0 unchanged', () => {
        expect(stripLeadingZeros('0'))
            .toBe('0');
        expect(stripLeadingZeros(0))
            .toBe('0');
    });

    it('removes leading 0 when followed by another digit', () => {
        expect(stripLeadingZeros('03'))
            .toBe('3');
        expect(stripLeadingZeros('00'))
            .toBe('0');
        expect(stripLeadingZeros('000'))
            .toBe('0');
        expect(stripLeadingZeros('007'))
            .toBe('7');
        expect(stripLeadingZeros('0123'))
            .toBe('123');
    });

    it('handles negative numbers correctly', () => {
        expect(stripLeadingZeros('-0'))
            .toBe('-0');
        expect(stripLeadingZeros('-00'))
            .toBe('-0');
        expect(stripLeadingZeros('-03'))
            .toBe('-3');
        expect(stripLeadingZeros('-007'))
            .toBe('-7');
        expect(stripLeadingZeros('-'))
            .toBe('-');
    });

    it('preserves valid decimals starting with 0', () => {
        expect(stripLeadingZeros('0.5'))
            .toBe('0.5');
        expect(stripLeadingZeros('0.'))
            .toBe('0.');
        expect(stripLeadingZeros('00.5'))
            .toBe('0.5');
        expect(stripLeadingZeros('03.5'))
            .toBe('3.5');
        expect(stripLeadingZeros('-0.5'))
            .toBe('-0.5');
        expect(stripLeadingZeros('-03.5'))
            .toBe('-3.5');
        expect(stripLeadingZeros('0.05'))
            .toBe('0.05');
        expect(stripLeadingZeros('10.00'))
            .toBe('10.00');
    });

    it('preserves non-leading zeros in numbers', () => {
        expect(stripLeadingZeros('10'))
            .toBe('10');
        expect(stripLeadingZeros('100'))
            .toBe('100');
        expect(stripLeadingZeros('105.02'))
            .toBe('105.02');
    });
});