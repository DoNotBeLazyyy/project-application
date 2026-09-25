import { CSSObject } from '@mui/material/styles';

export const INPUT_HEIGHT_SMALL = '2.25rem';
export const INPUT_HEIGHT_TOUCH = '2.75rem';
export const INPUT_HEIGHT_LARGE = '3rem';
export const INPUT_PADDING_LARGE = 'var(--mui-tokens-spacing-4) var(--mui-tokens-spacing-5)';

const SURFACE_DEFAULT = 'var(--mui-tokens-color-neutral-100)';
const SURFACE_FOCUSED = 'var(--mui-tokens-color-brand-100)';
export const SURFACE_DISABLED = 'var(--mui-tokens-color-neutral-200)';
const SURFACE_ERROR = 'var(--mui-tokens-color-red-100)';
export const TEXT_DISABLED = 'var(--mui-tokens-color-neutral-400)';
const BORDER_TRANSPARENT = 'var(--mui-tokens-stroke-0) solid transparent';
export const BORDER_NEUTRAL = 'var(--mui-tokens-stroke-0) solid var(--mui-tokens-color-neutral-300)';
const BORDER_FOCUSED = 'var(--mui-tokens-stroke-0) solid var(--mui-tokens-color-brand-900)';
const BORDER_ERROR = 'var(--mui-tokens-stroke-0) solid var(--mui-tokens-color-red-500)';

const DISABLED_OR_READONLY_SELECTOR = `
    &.Mui-disabled,
    &.Mui-disabled:hover,
    &.MuiInputBase-readOnly,
    &.MuiInputBase-readOnly:hover,
    &[readonly],
    &[readonly]:hover,
    &:has(input[readonly]),
    &:has(textarea[readonly]),
    &.common_input_readonly,
    &.common_input_readonly:hover
`;

function DISABLED_OR_READONLY_NOTCH_SELECTOR(outline: string) {
    return `
    &.Mui-disabled ${outline},
    &.MuiInputBase-readOnly ${outline},
    &[readonly] ${outline},
    &:has(input[readonly]) ${outline},
    &:has(textarea[readonly]) ${outline},
    &.common_input_readonly ${outline}
`;
}

export function buildInputStateStyles(outlineClassName?: string): CSSObject {
    if (!outlineClassName) {
        return {
            backgroundColor: SURFACE_DEFAULT,
            border: BORDER_TRANSPARENT,
            '&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not(:has(input[readonly])):not(:has(textarea[readonly])):not(.common_input_readonly)': {
                backgroundColor: SURFACE_FOCUSED,
                border: BORDER_FOCUSED
            },
            [DISABLED_OR_READONLY_SELECTOR]: {
                backgroundColor: SURFACE_DISABLED,
                border: BORDER_TRANSPARENT,
                color: TEXT_DISABLED,
                WebkitTextFillColor: TEXT_DISABLED
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
        '&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not(:has(input[readonly])):not(:has(textarea[readonly])):not(.common_input_readonly)': {
            backgroundColor: SURFACE_FOCUSED
        },
        [DISABLED_OR_READONLY_SELECTOR]: {
            backgroundColor: SURFACE_DISABLED,
            color: TEXT_DISABLED,
            WebkitTextFillColor: TEXT_DISABLED
        },
        '&.Mui-error, &.Mui-error.Mui-focused': {
            backgroundColor: SURFACE_ERROR
        },
        [`& ${outline}`]: {
            top: 0
        },
        [`& ${outline} legend`]: {
            display: 'none'
        },
        [`& ${outline}, &:hover ${outline}`]: {
            border: BORDER_TRANSPARENT
        },
        [DISABLED_OR_READONLY_NOTCH_SELECTOR(outline)]: {
            border: `${BORDER_TRANSPARENT} !important`
        },
        [`&.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not(:has(input[readonly])):not(:has(textarea[readonly])):not(.common_input_readonly) ${outline}, &.Mui-focused:not(.Mui-disabled):not(.MuiInputBase-readOnly):not(:has(input[readonly])):not(:has(textarea[readonly])):not(.common_input_readonly):hover ${outline}`]: {
            border: BORDER_FOCUSED
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