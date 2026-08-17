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
                        'relative h-screen shrink-0 transition-[width] duration-300',
                        isOpen
                            ? SIDEBAR_WIDTH_EXPANDED
                            : SIDEBAR_WIDTH_COLLAPSED
                    )
                }
            >
                <div
                    className={
                        classMerge(
                            'absolute inset-y-0 left-0 z-40 flex h-screen flex-col overflow-hidden transition-[width] duration-300',
                            isExpanded
                                ? SIDEBAR_WIDTH_EXPANDED
                                : SIDEBAR_WIDTH_COLLAPSED,
                            isExpanded && !isOpen && 'shadow-2xl',
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
                                'flex-1 overflow-x-hidden overflow-y-auto pb-(--mui-tokens-spacing-4) [&::-webkit-scrollbar-thumb]:rounded-(--mui-tokens-radius-sm) [&::-webkit-scrollbar]:w-(--mui-tokens-spacing-2)',
                                isExpanded
                                    ? 'px-(--mui-tokens-spacing-4)'
                                    : 'px-(--mui-tokens-spacing-2)',
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
                            className={
                                classMerge(
                                    'pb-(--mui-tokens-spacing-4) shrink-0',
                                    isExpanded
                                        ? 'px-(--mui-tokens-spacing-4)'
                                        : 'px-(--mui-tokens-spacing-2)'
                                )
                            }
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
                                    startIcon={<UserCircleIcon size={20} />}
                                    sx={{
                                        width: '100%',
                                        minWidth: 0,
                                        justifyContent: isExpanded
                                            ? 'flex-start'
                                            : 'center',
                                        gap: isExpanded
                                            ? 'var(--mui-tokens-spacing-3)'
                                            : 0,
                                        borderRadius: 'var(--mui-tokens-radius-md)',
                                        border: '2px solid var(--mui-tokens-color-neutral-300)',
                                        backgroundColor: 'transparent',
                                        paddingInline: isExpanded
                                            ? 'var(--mui-tokens-spacing-4)'
                                            : 0,
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
                                            marginInline: isExpanded
                                                ? undefined
                                                : 0,
                                            color: variant === 'dark'
                                                ? 'var(--mui-tokens-color-neutral-300)'
                                                : 'var(--mui-tokens-color-neutral-400)'
                                        }
                                    }}
                                    {...footerProps}
                                >
                                    {isExpanded && footerProps.label}
                                </CommonButton>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>
        </SideBarContext.Provider>
    );
}