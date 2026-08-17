import CommonButton from '@components/button/CommonButton';
import CommonHeaderSideBar from '@components/sidebar/CommonHeaderSideBar';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@constants/sidebar.constant';
import { SideBarContext } from '@contexts/SideBarContext';
import Tooltip from '@mui/material/Tooltip';
import { UserCircleIcon } from '@phosphor-icons/react';
import { HTMLAttributesDivElement } from '@type/common.type';
import { SideBarFooterProps, SideBarVariant } from '@type/sidebar.types';
import { classMerge } from '@utils/css.util';
import { ReactNode, useMemo, useState } from 'react';

interface SideBarHeaderProps {
    logo?: ReactNode;

    subtitle?: string;

    title?: string;
}

interface CommonSideBarProps extends HTMLAttributesDivElement {
    footerProps?: SideBarFooterProps;

    headerProps?: SideBarHeaderProps;

    isOpen?: boolean;

    variant?: SideBarVariant;

    onToggleLock?: VoidFunction;
}

/**
 * CommonSideBar
 *
 * A reusable sidebar that always stays visible. It renders as an icon-only rail
 * by default, expands on hover, and can be pinned open with the lock button in
 * the header (or any external control wired to `isOpen` / `onToggleLock`).
 *
 * @example
 * <CommonSideBar
 *   isOpen={isSidebarLocked}
 *   variant="dark"
 *   headerProps={{ title: "AU-JAS LMS", subtitle: "Super User Access" }}
 *   footerProps={{ label: "My Profile", onClick: () => navigate('/profile') }}
 *   onToggleLock={handleToggleSidebar}
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
    isOpen = false,
    style,
    variant = 'dark',
    onToggleLock,
    ...props
}: CommonSideBarProps) {
    const [isHovered, setIsHovered] = useState(false);
    const isExpanded = isOpen || isHovered;

    const sidebarBg = {
        dark: 'var(--mui-tokens-color-brand-950)',
        light: 'var(--mui-tokens-color-common-white)'
    } as const;

    const contextValue = useMemo(() => ({ isExpanded }), [isExpanded]);

    return (
        <SideBarContext.Provider value={contextValue}>
            <div
                className={
                    classMerge(
                        'relative h-screen shrink-0 transition-[width,min-width] duration-300 ease-in-out',
                        isExpanded
                            ? SIDEBAR_WIDTH_EXPANDED
                            : SIDEBAR_WIDTH_COLLAPSED
                    )
                }
            >
                <div
                    className={
                        classMerge(
                            'absolute inset-y-0 left-0 z-40 flex h-screen flex-col overflow-hidden transition-[width,min-width] duration-300 ease-in-out',
                            isExpanded
                                ? SIDEBAR_WIDTH_EXPANDED
                                : SIDEBAR_WIDTH_COLLAPSED,
                            className
                        )
                    }
                    style={{
                        backgroundColor: color ?? sidebarBg[variant],
                        ...style
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    {...props}
                >
                    {headerProps && <CommonHeaderSideBar
                        {...headerProps}
                        isExpanded={isExpanded}
                        isLocked={isOpen}
                        variant={variant}
                        onToggleLock={onToggleLock}
                    />}
                    <div
                        className={
                            classMerge(
                                'flex-1 overflow-x-hidden overflow-y-auto px-(--mui-tokens-spacing-4) pb-(--mui-tokens-spacing-4) [&::-webkit-scrollbar-thumb]:rounded-(--mui-tokens-radius-sm) [&::-webkit-scrollbar]:w-(--mui-tokens-spacing-2)',
                                variant === 'dark'
                                    ? '[&::-webkit-scrollbar-thumb]:bg-white/20'
                                    : '[&::-webkit-scrollbar-thumb]:bg-gray-300'
                            )
                        }
                    >
                        {children}
                    </div>
                    {footerProps && (
                        <div
                            className="shrink-0 px-(--mui-tokens-spacing-4) pb-(--mui-tokens-spacing-4)"
                        >
                            <Tooltip
                                placement="right"
                                title={
                                    isExpanded
                                        ? ''
                                        : footerProps.label ?? ''
                                }
                            >
                                <CommonButton
                                    startIcon={<UserCircleIcon size={24} />}
                                    sx={{
                                        width: '100%',
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        justifyContent: 'flex-start',
                                        gap: '10px',
                                        borderRadius: 'var(--mui-tokens-radius-md)',
                                        border: '2px solid var(--mui-tokens-color-neutral-300)',
                                        backgroundColor: 'transparent',
                                        paddingInline: 'calc(var(--mui-tokens-spacing-4) - 2px)',
                                        paddingBlock: '0.375rem',
                                        fontSize: 'var(--mui-tokens-fontSize-sm)',
                                        fontWeight: 'var(--mui-tokens-fontWeight-normal)',
                                        whiteSpace: 'nowrap',
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
                                            marginInline: 0,
                                            flexShrink: 0,
                                            color: variant === 'dark'
                                                ? 'var(--mui-tokens-color-neutral-300)'
                                                : 'var(--mui-tokens-color-neutral-400)'
                                        }
                                    }}
                                    {...footerProps}
                                >
                                    <span
                                        className={
                                            classMerge(
                                                'shrink-0 whitespace-nowrap transition-opacity duration-200 ease-in-out',
                                                isExpanded
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            )
                                        }
                                    >
                                        {footerProps.label}
                                    </span>
                                </CommonButton>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </SideBarContext.Provider>
    );
}