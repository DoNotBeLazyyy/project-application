import { PartialRecordString, StringNum } from '@type/common.type';
import { SharedTabMenuProps } from '@type/tab-menu.type';
import { CSSProperties } from 'react';

// Font family key
export type FontFamilyKey = 'body' | 'headings';

// Standardized color weight scale
type ColorWeight = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

// Reusable record for color weights
type ColorWeightRecord = PartialRecordString<ColorWeight>;

// Standardized spacing and layout scale
type ScaleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

// Reusable record for spacing units
type ScaleIndexRecord = PartialRecordString<ScaleIndex>;

// Standardized stroke/border width scale
type StrokeWeight = 0 | 1 | 3 | 4;

// Reusable record for stroke weights
type StrokeWeightRecord = PartialRecordString<StrokeWeight>;

// Standardized radius keys
type RadiusKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

// Reusable record for radius tokens
type RadiusRecord = PartialRecordString<RadiusKey>;

interface ColorCommonProps {
    // Primary black color
    black?: string;

    // Primary white color
    white?: string;
}

interface ColorStateProps {
    // Primary error color
    error?: string;

    // Light error variant
    errorLight?: string;

    // Primary success color
    success?: string;

    // Light success variant
    successLight?: string;

    // Primary warning color
    warning?: string;

    // Light warning variant
    warningLight?: string;
}

interface ColorVariantProps {
    // Light variant
    light?: string;

    // Main variant
    main?: string;
}

interface ColorTokenProps {
    // Primary brand scale
    brand?: ColorWeightRecord;

    // Base black and white
    common?: ColorCommonProps;

    // UI graveyard/disabled colors
    graveyard?: ColorVariantProps;

    // Neutral gray scale
    neutral?: ColorWeightRecord;

    // Secondary brand colors
    secondary?: ColorVariantProps;

    // Semantic state colors
    state?: ColorStateProps;
}

interface FontFamilyTokenProps {
    // Body text font family
    body?: string;

    // Heading text font family
    headings?: string;
}

interface FontWeightTokenProps {
    // Bold font weight
    bold?: string;

    // Normal font weight
    normal?: string;
}

interface TypographyHierarchy {
    // Heading 1
    h1?: string;

    // Heading 2
    h2?: string;

    // Heading 3
    h3?: string;

    // Heading 4
    h4?: string;

    // Heading 5
    h5?: string;

    // Heading 6
    h6?: string;

    // Large size
    lg?: string;

    // Medium size
    md?: string;

    // Normal size
    nm?: string;

    // Small size
    sm?: string;

    // Extra small size
    xs?: string;
}

interface TypographySizeProps {
    // Text 12/14
    bodyExtraSmall: CSSProperties;

    // Text 12/14 Bold
    bodyExtraSmallBold: CSSProperties;

    // Text 12/14 Caps
    bodyExtraSmallCaps: CSSProperties;

    // Text 20/28
    bodyLarge: CSSProperties;

    // Text 20/28 Bold
    bodyLargeBold: CSSProperties;

    // Text 18/24
    bodyMedium: CSSProperties;

    // Text 18/24 Bold
    bodyMediumBold: CSSProperties;

    // Text 16/20
    bodyNormal: CSSProperties;

    // Text 16/20 Bold
    bodyNormalBold: CSSProperties;

    // Text 14/20
    bodySmall: CSSProperties;

    // Text 14/20 Bold
    bodySmallBold: CSSProperties;
}

export interface SharedTokenProps {
    // Color design tokens
    color?: ColorTokenProps;

    // Font family tokens
    fontFamily?: FontFamilyTokenProps;

    // Font size tokens
    fontSize?: TypographyHierarchy;

    // Font weight tokens
    fontWeight?: FontWeightTokenProps;

    // Line height tokens
    lineHeight?: TypographyHierarchy;

    // Border radius scale
    radius?: RadiusRecord;

    // Layout spacing scale
    spacing?: ScaleIndexRecord;

    // Border width scale
    stroke?: StrokeWeightRecord;
}

interface SharedSizeProps {
    // Extra small size
    xsmall: true;

    // Large size
    large: true;

    // Extra large size
    xlarge: true;
}

declare module '@mui/material/styles' {
    interface Shape {
        // 2x extra large corner radius
        'corner-radius-2xl': StringNum;

        // Fully rounded/pill corner radius
        'corner-radius-full': StringNum;

        // Large corner radius
        'corner-radius-lg': StringNum;

        // Medium corner radius
        'corner-radius-md': StringNum;

        // No corner radius (0px)
        'corner-radius-none': StringNum;

        // Small corner radius
        'corner-radius-sm': StringNum;

        // Extra large corner radius
        'corner-radius-xl': StringNum;

        // Border width size 0
        'stroke-0': StringNum;

        // Border width size 1
        'stroke-1': StringNum;

        // Border width size 3
        'stroke-3': StringNum;

        // Border width size 4
        'stroke-4': StringNum;
    }

    interface Theme {
        // Custom design tokens
        tokens?: SharedTokenProps;
    }

    interface ThemeOptions {
        // Custom design tokens
        tokens?: SharedTokenProps;
    }

    interface Typography extends TypographySizeProps {}

    interface TypographyVariants extends TypographySizeProps {}

    interface TypographyVariantsOptions extends Partial<TypographySizeProps> {}
}

declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        // Extra small variant
        bodyExtraSmall: true;

        // Extra small bold variant
        bodyExtraSmallBold: true;

        // Extra small caps variant
        bodyExtraSmallCaps: true;

        // Large variant
        bodyLarge: true;

        // Large bold variant
        bodyLargeBold: true;

        // Medium variant
        bodyMedium: true;

        // Medium bold variant
        bodyMediumBold: true;

        // Normal variant
        bodyNormal: true;

        // Normal bold variant
        bodyNormalBold: true;

        // Small variant
        bodySmall: true;

        // Small bold variant
        bodySmallBold: true;
    }
}

declare module '@mui/material/TextField' {
    interface TextFieldPropsSizeOverrides extends SharedSizeProps {}
}

declare module '@mui/material/InputBase' {
    interface InputBasePropsSizeOverrides extends SharedSizeProps {}
}

declare module '@mui/material/OutlinedInput' {
    interface OutlinedInputPropsSizeOverrides extends SharedSizeProps {}
}

declare module '@mui/material/FilledInput' {
    interface FilledInputPropsSizeOverrides extends SharedSizeProps {}
}

declare module '@mui/material/Tabs' {
    interface TabsOwnProps extends SharedTabMenuProps {}
}

declare module '@mui/material/Tab' {
    interface TabOwnProps extends SharedTabMenuProps {}
}