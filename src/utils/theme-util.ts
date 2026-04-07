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
        sectionLabel: 'text-white/40',
        itemText: 'text-white',
        itemHover: 'hover:bg-[#022179]',
        itemIcon: 'text-white',
        itemActive: 'bg-[#3B5BDB] text-white',
        groupText: 'text-white font-bold',
        groupIcon: 'text-white',
        expandIcon: 'text-[#387BE0]',
        subItemText: 'text-white',
        subItemHover: 'hover:bg-[#022179]',
        subItemActive: 'bg-[#3B5BDB] text-white',
        subItemBorder: ''
    },
    light: {
        sectionLabel: 'text-gray-400',
        itemText: 'text-gray-700',
        itemHover: 'hover:bg-gray-100',
        itemIcon: 'text-gray-500',
        itemActive: 'bg-[#EEF2FF] text-[#3B5BDB]',
        groupText: 'text-gray-900 font-bold',
        groupIcon: 'text-gray-700',
        expandIcon: 'text-[#011554]',
        subItemText: 'text-gray-600',
        subItemHover: 'hover:bg-gray-50',
        subItemActive: 'text-gray-600',
        subItemBorder: 'show'
    }
};

const SIDEBAR_HOVER_BG = {
    dark: TOKENS.color?.brand?.[900],
    light: 'rgba(0,0,0,0.04)'
} as const;
/**
 * Creates a MUI theme with custom styles for the sidebar list based on the specified variant (dark or light).
 *
 * @param variant - The visual variant for the sidebar list, either 'dark' or 'light'. Defaults to 'dark'.
 * @returns
 */
export function createSideBarListTheme(variant: 'dark' | 'light' = 'dark') {
    return createTheme(theme, {
        components: {
            MuiAccordion: {
                defaultProps: {
                    disableGutters: true
                },
                styleOverrides: {
                    root: {
                        backgroundColor: 'transparent',
                        backgroundImage: 'none',
                        boxShadow: 'none',
                        margin: 0,
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 }
                    }
                }
            },
            MuiAccordionSummary: {
                styleOverrides: {
                    root: {
                        minHeight: 'unset',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        '&:hover': {
                            backgroundColor: SIDEBAR_HOVER_BG[variant]
                        },
                        '&.Mui-expanded': { minHeight: 'unset' },
                        '& .MuiAccordionSummary-content': {
                            margin: 0,
                            alignItems: 'center',
                            gap: '10px',
                            '&.Mui-expanded': { margin: 0 }
                        },
                        '& .MuiAccordionSummary-expandIconWrapper': {
                            transition: 'transform 200ms'
                        }
                    }
                }
            },
            MuiAccordionDetails: {
                styleOverrides: {
                    root: {
                        padding: '4px 0 0 0'
                    }
                }
            }
        }
    });
}