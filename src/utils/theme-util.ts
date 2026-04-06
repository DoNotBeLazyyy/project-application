import { COMPONENTS } from '@constants/theme/components.constant';
import { PALETTE } from '@constants/theme/palette.constant';
import { SHAPE } from '@constants/theme/shape.constant';
import { getSpacings } from '@constants/theme/spacing.constant';
import { TOKENS } from '@constants/theme/tokens.constant';
import { TYPOGRAPHY } from '@constants/theme/typography.constant';
import { createTheme } from '@mui/material/styles';
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