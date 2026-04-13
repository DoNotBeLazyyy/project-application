import CommonHeaderSideBar, { CommonHeaderSideBarProps } from '@components/sidebar/CommonHeaderSideBar';
import { TOKENS } from '@constants/theme/tokens.constant';
import Button, { ButtonProps } from '@mui/material/Button';
import { GearSixIcon } from '@phosphor-icons/react';
import { DivProps } from '@type/common.type';
import { SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';

interface SideBarFooterProps extends ButtonProps {
    // Footer button label
    label?: string;
}

type SideBarHeaderProps = Pick<CommonHeaderSideBarProps, 'buttonProps' | 'hasArrow' | 'isExpanded' | 'logo' | 'subtitle' | 'title'>;

interface CommonSideBarProps extends DivProps {
    // Footer button configuration
    footerProps?: SideBarFooterProps;

    // Header configuration
    headerProps?: SideBarHeaderProps;

    // Whether the sidebar is open
    isOpen?: boolean;

    // Visual variant
    variant?: SideBarVariant;
}

/**
 * CommonSideBar
 *
 * A reusable sidebar component with configurable color, width, header,
 * and an optional footer button pinned at the bottom.
 *
 * @example
 * <CommonSideBar
 *   color="#011554"
 *   variant="dark"
 *   headerProps={{
 *     logo: <img src={logo} alt="logo" />,
 *     title: "EGEMCO HRIS",
 *     subtitle: "Super User Access"
 *   }}
 *   footerProps={{
 *     label: "Settings",
 *     onClick: () => navigate('/settings')
 *   }}
 * >
 *   {navigation content here}
 * </CommonSideBar>
 */

export default function CommonSideBar({
    children,
    className,
    color,
    footerProps,
    headerProps,
    isOpen = true,
    style,
    variant = 'dark',
    ...props
}: CommonSideBarProps) {
    const SIDEBAR_BG = {
        dark: TOKENS.color?.brand?.[950],
        light: TOKENS.color?.common?.white
    } as const; // Define default background colors for dark and light variants of the sidebar.
    const footerVariantStyles = {
        dark: {
            color: TOKENS.color?.common?.white,
            hoverBg: 'rgba(255,255,255,0.1)',
            iconColor: TOKENS.color?.neutral?.[300]
        },
        light: {
            color: TOKENS.color?.neutral?.[600],
            hoverBg: 'rgba(161,161,170,0.1)',
            iconColor: TOKENS.color?.neutral?.[400]
        }
    }; // Define styles for the footer button based on the sidebar variant.
    const footerStyle = footerVariantStyles[variant]; // Get the appropriate styles for the footer button based on the sidebar variant.
    const darkVariant = variant === 'dark';
    const sidebarStyle = { backgroundColor: color ?? SIDEBAR_BG[variant] };

    return (
        <div
            className={
                classMerge(
                    'flex h-screen flex-col overflow-hidden transition-[width,min-width] duration-300',
                    isOpen
                        ? 'w-[15.625rem] min-w-[15.625rem]'
                        : 'w-0 min-w-0',
                    className
                )
            }
            style={{
                ...sidebarStyle,
                ...style
            }}
            {...props}
        >
            {headerProps && (
                <CommonHeaderSideBar
                    {...headerProps}
                    variant={variant}
                />
            )}
            <div
                className={
                    classMerge(
                        'flex-1 overflow-y-auto px-[var(--mui-tokens-spacing-4)] pb-[var(--mui-tokens-spacing-4)] [&::-webkit-scrollbar-thumb]:rounded-[var(--mui-tokens-radius-sm)] [&::-webkit-scrollbar]:w-[var(--mui-tokens-spacing-2)]',
                        darkVariant
                            ? '[&::-webkit-scrollbar-thumb]:bg-white/20'
                            : '[&::-webkit-scrollbar-thumb]:bg-gray-300'
                    )}
            >
                {children}
            </div>
            {footerProps && (
                <div className="shrink-0 px-[var(--mui-tokens-spacing-4)] pb-[var(--mui-tokens-spacing-4)]">
                    <Button
                        disableRipple
                        startIcon={<GearSixIcon size={20} />}
                        {...footerProps}
                        sx={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            gap: 1,
                            borderRadius: 'var(--mui-tokens-radius-sm)',
                            border: `2px solid ${TOKENS.color?.neutral?.[300]}`,
                            backgroundColor: 'transparent',
                            px: 4,
                            py: 1.5,
                            fontSize: 'var(--mui-tokens-fontSize-sm)',
                            textTransform: 'none',
                            color: footerStyle.color,
                            '&:hover': {
                                backgroundColor: footerStyle.hoverBg,
                                border: `2px solid ${TOKENS.color?.neutral?.[300]}`
                            },
                            '& .MuiButton-startIcon': {
                                color: footerStyle.iconColor,
                                marginRight: 0
                            }
                        }}
                    >
                        {footerProps.label}
                    </Button>
                </div>
            )}
        </div>
    );
}