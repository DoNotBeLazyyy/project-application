import { TypographyVariantsOptions } from '@mui/material';
import { createTypographyVariant } from '@utils/theme-util'; // Utils dependency

/**
 * Creates a standard bold heading variant.
 *
 * @param level - The heading level (e.g., 'h1', 'h2').
 * @returns
 */
function getHeading(level: string) {
    return createTypographyVariant(level, 700, 'headings');
}

/**
 * Creates a standard bold body variant.
 *
 * @param size - The body size token (e.g., 'lg', 'md').
 * @returns
 */
function getBodyBold(size: string) {
    return createTypographyVariant(size, 700);
}

export const TYPOGRAPHY: TypographyVariantsOptions = {
    fontFamily: 'var(--mui-tokens-fontFamily-body)',
    h1: getHeading('h1'),
    h2: getHeading('h2'),
    h3: getHeading('h3'),
    h4: getHeading('h4'),
    h5: getHeading('h5'),
    h6: getHeading('h6'),
    bodyLarge: createTypographyVariant('lg'),
    bodyLargeBold: getBodyBold('lg'),
    bodyMedium: createTypographyVariant('md'),
    bodyMediumBold: getBodyBold('md'),
    bodyNormal: createTypographyVariant('nm'),
    bodyNormalBold: getBodyBold('nm'),
    bodySmall: createTypographyVariant('sm'),
    bodySmallBold: getBodyBold('sm'),
    bodyExtraSmall: createTypographyVariant('xs'),
    bodyExtraSmallBold: getBodyBold('xs')
}; // Typography configuration