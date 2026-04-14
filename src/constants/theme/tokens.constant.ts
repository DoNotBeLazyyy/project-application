import { SPACING_SCALE } from '@constants/theme/spacing.constant';
import { SharedTokenProps } from '@type/common/theme.type';

export const TOKENS: SharedTokenProps = {
    color: {
        brand: {
            50: '#F2F7FE',
            100: '#E0EDFD',
            200: '#A9CEF7',
            300: '#81B5F3',
            400: '#6BA6F4',
            500: '#5196F6',
            600: '#387BE0',
            700: '#225DB4',
            800: '#123F8A',
            900: '#022179',
            950: '#011554'
        },
        common: {
            black: '#09090B',
            white: '#FFFFFF'
        },
        graveyard: {
            light: '#8A38F533',
            main: '#8A38F5'
        },
        green: {
            100: '#E5FBEE',
            200: '#CEF6DF',
            300: '#A3EDC3',
            400: '#79E3A6',
            500: '#2DCC70',
            600: '#24A85B',
            700: '#1B8547',
            800: '#136334',
            900: '#0C4221'
        },
        neutral: {
            50: '#FAFAFA',
            100: '#F4F4F5',
            200: '#E4E4E7',
            300: '#D4D4D8',
            400: '#A1A1AA',
            500: '#71717A',
            600: '#52525B',
            700: '#3F3F46',
            800: '#27272A',
            900: '#18181B'
        },
        red: {
            100: '#FFF0F0',
            200: '#FFDDDD',
            300: '#FCA5A5',
            400: '#F87171',
            500: '#EB5757',
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#7F1D1D'
        },
        secondary: {
            light: '#DFEDFE',
            main: '#5196F6'
        },
        state: {
            error: '#EB5757',
            errorLight: '#FFDDDD',
            success: '#2DCC70',
            successLight: '#CEF6DF',
            warning: '#FBA732',
            warningLight: '#FFE5C0'
        },
        yellow: {
            100: '#FFF2E0',
            200: '#FFE5C0',
            300: '#FFD090',
            400: '#FFBC60',
            500: '#FBA732',
            600: '#E08C22',
            700: '#C27014',
            800: '#A3550B',
            900: '#803E05'
        }
    },
    fontFamily: {
        body: '"Noto Sans", sans-serif',
        headings: '"Plus Jakarta Sans", sans-serif'
    },
    fontSize: {
        h1: '3.5rem',
        h2: '3rem',
        h3: '2.5rem',
        h4: '2rem',
        h5: '1.5rem',
        h6: '1.25rem',
        lg: '1.25rem',
        md: '1.125rem',
        nm: '1rem',
        sm: '0.875rem',
        xs: '0.75rem'
    },
    fontWeight: {
        bold: '700',
        normal: '400'
    },
    lineHeight: {
        h1: '4rem',
        h2: '3.5rem',
        h3: '2.75rem',
        h4: '2.25rem',
        h5: '1.75rem',
        h6: '1.5rem',
        lg: '1.75rem',
        md: '1.5rem',
        nm: '1.25rem',
        sm: '1.25rem',
        xs: '0.875rem'
    },
    radius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        full: '999px'
    },
    spacing: SPACING_SCALE,
    stroke: {
        0: '1px',
        1: '2px',
        3: '4px',
        4: '6px'
    }
}; // Global design tokens SSoT