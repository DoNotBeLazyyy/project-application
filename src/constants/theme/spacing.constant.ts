import { RecordNumberString } from '@type/common.type';

export const SPACING_SCALE: RecordNumberString = {
    0: '0',
    1: '0.125rem',
    2: '0.25rem',
    3: '0.5rem',
    4: '0.75rem',
    5: '1rem',
    6: '1.25rem',
    7: '1.5rem',
    8: '2rem',
    9: '2.5rem',
    10: '3rem',
    11: '3.5rem',
    12: '4.5rem',
    13: '6rem',
    14: '7.5rem'
}; // Base UI spacing tokens

/**
 * Material UI spacing calculator function.
 *
 * @param factor - The spacing multiplier step requested by MUI.
 * @returns
 */
export function getSpacings(factor: number) {
    return SPACING_SCALE[factor] || `${factor * 0.25}rem`;
}