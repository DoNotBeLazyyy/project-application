import { TabMenuVariant } from '@components/tab/CommonTabMenu';
import { TOKENS } from '@constants/theme/tokens.constant';
import { SxProps, Theme } from '@mui/material/styles';

/**
 * Creates sx style objects for Tabs and Tab based on variant, color, and orientation.
 *
 * @param color - The color used for the active tab.
 * @param variant - The visual variant of the tab menu (filled, outlined, pill, or soft).
 * @param isVertical - Whether the tab orientation is vertical.
 * @returns An object with `tabs` and `tab` sx styles.
 */
export function createTabTheme(
    color: string,
    variant: TabMenuVariant,
    isVertical: boolean
): { tabs: SxProps<Theme>; tab: SxProps<Theme> } {
    const isOutlined = variant === 'outlined'; // Used to determine if the outlined styles should be applied
    const isPill = variant === 'pill'; // Used to determine if the pill styles should be applied
    const textColor = TOKENS.color?.neutral?.[400]; // Default text color for non-selected tabs
    const containerRadius = isPill
        ? '999px'
        : '10px'; // Container border radius based on variant

    const tabVariantStyles = {
        filled: {
            borderRadius: '8px',
            selectedColor: TOKENS.color?.common?.white,
            selectedBg: color,
            boxShadow: 'none',
            iconColor: TOKENS.color?.common?.white,
            hoverBg: color
        },
        outlined: {
            borderRadius: 0,
            selectedColor: TOKENS.color?.neutral?.[700],
            selectedBg: 'transparent',
            boxShadow: 'none',
            iconColor: color,
            hoverBg: 'transparent'
        },
        pill: {
            borderRadius: '999px',
            selectedColor: TOKENS.color?.common?.white,
            selectedBg: color,
            boxShadow: 'none',
            iconColor: TOKENS.color?.common?.white,
            hoverBg: color
        },
        soft: {
            borderRadius: '8px',
            selectedColor: TOKENS.color?.neutral?.[700],
            selectedBg: TOKENS.color?.neutral?.[100],
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
            iconColor: color,
            hoverBg: TOKENS.color?.common?.white
        }
    }; // Styles specific to each variant

    const tabStyle = tabVariantStyles[variant];

    const tabs: SxProps<Theme> = {
        minHeight: 'unset',
        ...(!isOutlined && { width: 'fit-content' }),
        ...(isOutlined
            ? {
                ...(isVertical && { borderRight: '2px solid #E5E7EB' })
            }
            : {
                backgroundColor: '#F3F4F6',
                borderRadius: containerRadius,
                padding: '4px',
                ...(isVertical && { gap: '4px' })
            }
        ),
        '& .MuiTabs-indicator': isOutlined
            ? {
                backgroundColor: color,
                ...(isVertical
                    ? { width: '2px' }
                    : { height: '2px' })
            }
            : { display: 'none' }
    };

    const tab: SxProps<Theme> = {
        textTransform: 'none',
        minHeight: 'unset',
        minWidth: 'unset',
        padding: '7px 10px',
        fontSize: '13px',
        fontWeight: 700,
        transition: 'all 0.2s ease',
        borderRadius: tabStyle.borderRadius,
        color: textColor,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        gap: '0.375rem',
        '& .MuiTab-iconWrapper': {
            color: textColor,
            marginRight: 0
        },
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
        },
        '&.Mui-selected': {
            color: tabStyle.selectedColor,
            backgroundColor: tabStyle.selectedBg,
            boxShadow: tabStyle.boxShadow,
            '& .MuiTab-iconWrapper': {
                color: tabStyle.iconColor
            },
            '&:hover': {
                backgroundColor: tabStyle.hoverBg
            }
        }
    };

    return { tabs, tab };
}