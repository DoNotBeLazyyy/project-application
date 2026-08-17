import CommonButton from '@components/button/CommonButton';
import CommonHeaderSideBar from '@components/sidebar/CommonHeaderSideBar';
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@constants/sidebar.constant';
import { SideBarContext } from '@contexts/SideBarContext';
import useBreakpoint from '@hooks/useBreakpoint';
import Drawer from '@mui/material/Drawer';
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

    isMobileOpen?: boolean;

    isOpen?: boolean;

    variant?: SideBarVariant;

    onMobileClose?: VoidFunction;

    onToggleLock?: VoidFunction;
}

/**
 * CommonSideBar
 *
 * A reusable sidebar with three presentations driven by viewport and pointer type:
 * below the `md` breakpoint it renders as a temporary overlay Drawer controlled by
 * `isMobileOpen` / `onMobileClose`; at `md` and above with a fine pointer it is an
 * icon-only rail that expands on hover; at `md` and above without hover (touch
 * tablets) the rail expands by tapping the logo mark instead. It can always be
 * pinned open via `isOpen` / `onToggleLock`.
 *
 * @example
 * <CommonSideBar
 *   isMobileOpen={isDrawerOpen}
 *   isOpen={isSidebarLocked}
 *   variant="dark"
 *   headerProps={{ title: "AU-JAS LMS", subtitle: "Super User Access" }}
 *   footerProps={{ label: "My Profile", onClick: () => navigate('/profile') }}
 *   onMobileClose={handleCloseDrawer}
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
    isMobileOpen = false,
    isOpen = false,
    style,
    variant = 'dark',
    onMobileClose,
    onToggleLock,
    ...props
}: CommonSideBarProps) {
    const { hasHover, isMobile } = useBreakpoint();
    const [isHovered, setIsHovered] = useState(false);
    const isExpanded = isMobile || isOpen || (hasHover && isHovered);

    const sidebarBg = {
        dark: 'var(--mui-tokens-color-brand-950)',
        light: 'var(--mui-tokens-color-common-white)'
    } as const;
    const backgroundColor = color ?? sidebarBg[variant];

    const contextValue = useMemo(() => ({ isExpanded }), [isExpanded]);

    function handleMouseEnter() {
        setIsHovered(true);
    }

    function handleMouseLeave() {
        setIsHovered(false);
    }

    const panel = (
        <div
            className={
                classMerge(
                    'flex flex-col overflow-hidden',
                    isMobile
                        ? 'h-full w-full'
                        : 'absolute inset-y-0 left-0 z-40 h-full transition-[width,min-width] duration-300 ease-in-out',
                    !isMobile && (isExpanded
                        ? SIDEBAR_WIDTH_EXPANDED
                        : SIDEBAR_WIDTH_COLLAPSED),
                    className
                )
            }
            style={{
                backgroundColor,
                ...style
            }}
            onMouseEnter={
                hasHover && !isMobile
                    ? handleMouseEnter
                    : undefined
            }
            onMouseLeave={
                hasHover && !isMobile
                    ? handleMouseLeave
                    : undefined
            }
            {...props}
        >
            {headerProps && <CommonHeaderSideBar
                {...headerProps}
                isExpanded={isExpanded}
                isLocked={isOpen}
                variant={variant}
                onLogoClick={
                    !isMobile && !hasHover && onToggleLock
                        ? onToggleLock
                        : undefined
                }
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
    );

    if (isMobile) {
        return (
            <SideBarContext.Provider value={contextValue}>
                <Drawer
                    anchor="left"
                    open={isMobileOpen}
                    slotProps={{
                        paper: {
                            className: classMerge('border-0', SIDEBAR_WIDTH_EXPANDED),
                            style: { backgroundColor }
                        }
                    }}
                    variant="temporary"
                    onClose={onMobileClose}
                >
                    {panel}
                </Drawer>
            </SideBarContext.Provider>
        );
    }

    return (
        <SideBarContext.Provider value={contextValue}>
            <div
                className={
                    classMerge(
                        'relative h-full shrink-0 transition-[width,min-width] duration-300 ease-in-out',
                        isExpanded
                            ? SIDEBAR_WIDTH_EXPANDED
                            : SIDEBAR_WIDTH_COLLAPSED
                    )
                }
            >
                {panel}
            </div>
        </SideBarContext.Provider>
    );
}