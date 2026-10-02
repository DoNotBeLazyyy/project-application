import { CSSObject } from '@mui/material/styles';

export const INPUT_HEIGHT_SMALL = '2.25rem';
export const INPUT_HEIGHT_MEDIUM = '2.75rem';
export const INPUT_HEIGHT_TOUCH = '2.75rem';
export const INPUT_HEIGHT_LARGE = '3rem';
export const INPUT_PADDING_SMALL = 'var(--mui-tokens-spacing-3)';
export const INPUT_PADDING_MEDIUM = 'var(--mui-tokens-spacing-3) var(--mui-tokens-spacing-4)';
export const INPUT_PADDING_LARGE = 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)';

const SURFACE_DEFAULT = 'var(--mui-tokens-color-common-white, #ffffff)';
const SURFACE_HOVER = 'var(--mui-tokens-color-brand-50, #F2F7FE)';
const SURFACE_FOCUSED = 'var(--mui-tokens-color-common-white, #ffffff)';
export const SURFACE_DISABLED = 'var(--mui-tokens-color-neutral-50, #FAFAFA)';
const SURFACE_ERROR = 'var(--mui-tokens-color-red-100, #FFF0F0)';
export const TEXT_DISABLED = 'var(--mui-tokens-color-neutral-600)';
export const BORDER_BLUE = 'var(--mui-tokens-stroke-0, 1px) solid var(--mui-tokens-color-brand-400, #6BA6F4)';
export const BORDER_BLUE_HOVER = 'var(--mui-tokens-stroke-0, 1px) solid var(--mui-tokens-color-brand-600, #387BE0)';
export const BORDER_FOCUSED = 'var(--mui-tokens-stroke-0, 1px) solid var(--mui-tokens-color-brand-700, #225DB4)';
export const BORDER_ERROR = 'var(--mui-tokens-stroke-0, 1px) solid var(--mui-tokens-color-red-500, #EB5757)';

export function buildInputStateStyles(outlineClassName?: string): CSSObject {
    if (!outlineClassName) {
        return {
            backgroundColor: SURFACE_DEFAULT,
            border: BORDER_BLUE,
            boxSizing: 'border-box',
            transition: 'background-color 0.15s ease-in-out, border-color 0.15s ease-in-out',
            '&:hover:not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly])': {
                backgroundColor: SURFACE_HOVER,
                border: BORDER_BLUE_HOVER
            },
            '&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly])': {
                backgroundColor: SURFACE_FOCUSED,
                border: BORDER_FOCUSED
            },
            '&.Mui-disabled': {
                backgroundColor: SURFACE_DISABLED,
                border: BORDER_BLUE,
                color: TEXT_DISABLED,
                WebkitTextFillColor: TEXT_DISABLED
            },
            '&.MuiInputBase-readOnly, &[readonly]': {
                backgroundColor: SURFACE_DISABLED,
                border: BORDER_BLUE,
                color: 'var(--mui-tokens-color-neutral-800)',
                WebkitTextFillColor: 'var(--mui-tokens-color-neutral-800)'
            },
            '&.Mui-error, &.Mui-error:hover, &.Mui-error.Mui-focused': {
                backgroundColor: SURFACE_ERROR,
                border: BORDER_ERROR
            }
        };
    }

    const outline = `.${outlineClassName}`;

    return {
        backgroundColor: SURFACE_DEFAULT,
        boxSizing: 'border-box',
        transition: 'background-color 0.15s ease-in-out',
        '&:hover:not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly])': {
            backgroundColor: SURFACE_HOVER,
            [`& ${outline}`]: {
                border: BORDER_BLUE_HOVER
            }
        },
        '&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly])': {
            backgroundColor: SURFACE_FOCUSED
        },
        [`&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not([readonly]) ${outline}`]: {
            border: BORDER_FOCUSED
        },
        '&.Mui-disabled': {
            backgroundColor: SURFACE_DISABLED,
            color: TEXT_DISABLED,
            WebkitTextFillColor: TEXT_DISABLED
        },
        [`&.Mui-disabled ${outline}`]: {
            border: BORDER_BLUE
        },
        '&.MuiInputBase-readOnly, &[readonly]': {
            backgroundColor: SURFACE_DISABLED,
            color: 'var(--mui-tokens-color-neutral-800)',
            WebkitTextFillColor: 'var(--mui-tokens-color-neutral-800)'
        },
        [`&.MuiInputBase-readOnly ${outline}, &[readonly] ${outline}`]: {
            border: BORDER_BLUE
        },
        '&.Mui-error, &.Mui-error.Mui-focused': {
            backgroundColor: SURFACE_ERROR
        },
        [`& ${outline}`]: {
            top: 0,
            border: BORDER_BLUE,
            transition: 'border-color 0.15s ease-in-out'
        },
        [`& ${outline} legend`]: {
            display: 'none'
        },
        [`
            &.Mui-error ${outline},
            &.Mui-error:hover ${outline},
            &.Mui-error.Mui-focused ${outline}
        `]: {
            border: BORDER_ERROR
        }
    };
}