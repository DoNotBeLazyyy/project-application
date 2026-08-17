import CommonNavbar from '@components/navbar/CommonNavbar';
import UserAccountMenu from '@components/navbar/UserAccountMenu';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { resolvePanelLabel } from '@constants/role.constant';
import useBreakpoint from '@hooks/useBreakpoint';
import IconButton from '@mui/material/IconButton';
import { ListIcon } from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { SideBarSection } from '@type/sidebar.types';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

interface RoleShellProps {
    fallbackRoleLabel: UserRole;

    navSections: SideBarSection[];

    profilePath: string;
}

/**
 * RoleShell
 *
 * The shared application shell for every authenticated role: sidebar, navbar and
 * the scrollable content region. Below the `md` breakpoint the sidebar collapses
 * into an overlay drawer toggled by a hamburger in the navbar, and the drawer
 * closes automatically on navigation.
 *
 * @example
 * <RoleShell
 *     fallbackRoleLabel="Admin"
 *     navSections={navSections}
 *     profilePath="/admin/profile"
 * />
 */
export default function RoleShell({
    fallbackRoleLabel,
    navSections,
    profilePath
}: RoleShellProps) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { isMobile } = useBreakpoint();
    const [isSidebarLocked, setIsSidebarLocked] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const activeRole = useAppStore((s) => s.activeRole);

    useEffect(function() {
        setIsDrawerOpen(false);
    }, [pathname]);

    function handleToggleSidebar() {
        setIsSidebarLocked((prev) => !prev);
    }

    function handleOpenDrawer() {
        setIsDrawerOpen(true);
    }

    function handleCloseDrawer() {
        setIsDrawerOpen(false);
    }

    function handleNavigateToProfile() {
        navigate(profilePath);
    }

    return (
        <div className="flex h-full overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'My Profile',
                    onClick: handleNavigateToProfile
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, fallbackRoleLabel),
                    title: 'AU-JAS LMS'
                }}
                isMobileOpen={isDrawerOpen}
                isOpen={isSidebarLocked}
                variant="dark"
                onMobileClose={handleCloseDrawer}
                onToggleLock={handleToggleSidebar}
            >
                <CommonSideBarList
                    sections={navSections}
                    variant="dark"
                />
            </CommonSideBar>

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                <CommonNavbar
                    leftContent={
                        isMobile
                            ? (
                                <IconButton
                                    aria-label="Open navigation menu"
                                    className="text-(--mui-tokens-color-common-white)!"
                                    onClick={handleOpenDrawer}
                                >
                                    <ListIcon size={24} />
                                </IconButton>
                            )
                            : undefined
                    }
                    rightContent={
                        <div className="flex gap-3 items-center">
                            <NotificationBell />
                            <UserAccountMenu />
                        </div>
                    }
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}