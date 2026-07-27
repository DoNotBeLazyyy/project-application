import CommonButton from '@components/button/CommonButton';
import CommonHeaderSideBar from '@components/sidebar/CommonHeaderSideBar';
import { IconButtonProps } from '@mui/material/IconButton';
import { UserCircleIcon } from '@phosphor-icons/react';
import { HTMLAttributesDivElement } from '@type/common.type';
import { SideBarFooterProps, SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

interface SideBarHeaderProps {
    // Props spread onto the arrow IconButton
    buttonProps?: IconButtonProps;

    // Whether to show the dropdown arrow icon
    hasArrow?: boolean;

    // Whether the arrow is in expanded (down) state
    isExpanded?: boolean;

    // Logo element displayed in the header
    logo?: ReactNode;

    // Subtitle text displayed below the title
    subtitle?: string;

    // Title text displayed in the header
    title?: string;
}

interface CommonSideBarProps extends HTMLAttributesDivElement {
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
    const sidebarBg = {
        dark: 'var(--mui-tokens-color-brand-950)',
        light: 'var(--mui-tokens-color-common-white)'
    } as const; // Define default background colors for dark and light variants of the sidebar.

    return (
        <div
            className={
                classMerge(
                    'flex h-screen flex-col overflow-hidden transition-[width,min-width] duration-300',
                    isOpen
                        ? 'w-62.5 min-w-62.5'
                        : 'w-0 min-w-0',
                    className
                )
            }
            style={{
                backgroundColor: color ?? sidebarBg[variant],
                ...style
            }}
            {...props}
        >
            {headerProps && <CommonHeaderSideBar
                {...headerProps}
                variant={variant}
            />}
            <div
                className={
                    classMerge(
                        'flex-1 overflow-y-auto px-(--mui-tokens-spacing-4) pb-(--mui-tokens-spacing-4) [&::-webkit-scrollbar-thumb]:rounded-(--mui-tokens-radius-sm) [&::-webkit-scrollbar]:w-(--mui-tokens-spacing-2)',
                        variant === 'dark'
                            ? '[&::-webkit-scrollbar-thumb]:bg-white/20'
                            : '[&::-webkit-scrollbar-thumb]:bg-gray-300'
                    )
                }
            >
                {children}
            </div>
            {footerProps && (
                <div className="pb-(--mui-tokens-spacing-4) px-(--mui-tokens-spacing-4) shrink-0">
                    <CommonButton
                        startIcon={<UserCircleIcon size={20} />}
                        sx={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            gap: 'var(--mui-tokens-spacing-3)',
                            borderRadius: 'var(--mui-tokens-radius-md)',
                            border: '2px solid var(--mui-tokens-color-neutral-300)',
                            backgroundColor: 'transparent',
                            paddingInline: 'var(--mui-tokens-spacing-4)',
                            paddingBlock: '0.375rem',
                            fontSize: 'var(--mui-tokens-fontSize-sm)',
                            fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                            color: variant === 'dark'
                                ? 'var(--mui-tokens-color-common-white)'
                                : 'var(--mui-tokens-color-neutral-600)',
                            '&:hover': {
                                backgroundColor: variant === 'dark'
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'rgba(161,161,170,0.1)',
                                border: '2px solid var(--mui-tokens-color-neutral-300)'
                            },
                            '& .MuiButton-startIcon': {
                                color: variant === 'dark'
                                    ? 'var(--mui-tokens-color-neutral-300)'
                                    : 'var(--mui-tokens-color-neutral-400)'
                            }
                        }}
                        {...footerProps}
                    >
                        {footerProps.label}
                    </CommonButton>
                </div>
            )}
        </div>
    );
}