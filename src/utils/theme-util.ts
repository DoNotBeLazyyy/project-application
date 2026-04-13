import { COMPONENTS } from '@constants/theme/components.constant';
import { PALETTE } from '@constants/theme/palette.constant';
import { SHAPE } from '@constants/theme/shape.constant';
import { getSpacings } from '@constants/theme/spacing.constant';
import { TOKENS } from '@constants/theme/tokens.constant';
import { TYPOGRAPHY } from '@constants/theme/typography.constant';
import { createTheme } from '@mui/material/styles';
import { ThemeSx } from '@type/common.type';
import { FontFamilyKey } from '@type/common/theme.type';

export const theme = createTheme({
    cssVariables: { nativeColor: true },
    components: COMPONENTS,
    palette: PALETTE,
    shape: SHAPE,
    spacing: getSpacings,
    typography: TYPOGRAPHY,
    tokens: TOKENS
}); // The primary Material UI theme configuration

/**
 * Generates a MUI-compatible typography variant object based on design tokens.
 *
 * @param key - The design token suffix used for size and line-height (e.g., 'h1', 'lg', 'sm').
 * @param fontWeight - The font weight value (defaults to 400).
 * @param font - The font family category (defaults to 'body').
 * @returns
 */
export function createTypographyVariant(
    key: string,
    fontWeight = 400,
    font: FontFamilyKey = 'body'
) {
    return {
        fontFamily: `var(--mui-tokens-fontFamily-${font})`,
        fontSize: `var(--mui-tokens-fontSize-${key})`,
        fontWeight,
        lineHeight: `var(--mui-tokens-lineHeight-${key})`
    };
}

/**
 * Normalizes the MUI sx prop into an array for safe spreading in sx arrays.
 *
 * @param sx - The sx prop value to normalize.
 * @returns
 */
export function normalizeSx(sx?: ThemeSx) {
    return Array.isArray(sx)
        ? sx
        : [sx];
}

// Exporting the variant styles for use in components
// NOTE: Tailwind classes MUST use hardcoded values, not interpolated template literals,
// because Tailwind's JIT scanner reads source code as text and cannot evaluate JS expressions.
export const VARIANT_STYLES = {
    dark: {
        sectionLabel: 'text-white',
        itemText: '!text-white',
        itemHover: 'hover:bg-[#022179]',
        itemIcon: 'text-white',
        itemActive: 'bg-[#022179] !text-white',
        groupText: 'text-white',
        groupIcon: 'text-white',
        expandIcon: 'text-[#387BE0]',
        subItemText: '!text-white',
        subItemHover: 'hover:bg-[#022179]',
        subItemActive: 'bg-[#022179] !text-white',
        subItemBorder: '',
        subItemBorderActive: '',
        subItemBorderInactive: ''
    },
    light: {
        sectionLabel: 'text-[#52525B]',
        itemText: '!text-[#52525B]',
        itemHover: 'hover:bg-gray-100',
        itemIcon: 'text-gray-500',
        itemActive: 'bg-[#EEF2FF] !text-[#3B5BDB]',
        groupText: 'text-gray-900',
        groupIcon: 'text-gray-700',
        expandIcon: 'text-[#011554]',
        subItemText: '!text-gray-600',
        subItemHover: 'hover:bg-gray-50',
        subItemActive: '!text-gray-600',
        subItemBorder: 'show',
        subItemBorderActive: '#022179',
        subItemBorderInactive: '#D1D5DB'
    }
};

/**
 * Custom prop forwarding function to prevent 'sidebarVariant' from being passed to DOM elements in styled components.
 *
 * @param prop - The prop name to check for forwarding in styled components.
 * @returns
 */
export function shouldForwardSidebarVariant(prop: PropertyKey) {
    return prop !== 'sidebarVariant';
}

// Shared styled configuration to filter sidebar variant props
export const STYLED_OPTIONS = { shouldForwardProp: shouldForwardSidebarVariant };