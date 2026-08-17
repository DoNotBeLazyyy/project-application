import CommonNavbar from '@components/navbar/CommonNavbar';
import UserAccountMenu from '@components/navbar/UserAccountMenu';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { resolvePanelLabel } from '@constants/role.constant';
import { CalendarIcon, ChalkboardTeacherIcon, MegaphoneIcon, SquaresFourIcon } from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function FacultyLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isSidebarLocked, setIsSidebarLocked] = useState(false);
    const activeRole = useAppStore((s) => s.activeRole);
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/faculty',
                    label: 'Dashboard',
                    onClick: () => navigate('/faculty')
                },
                {
                    icon: <ChalkboardTeacherIcon size={18} />,
                    isActive: pathname === '/faculty/sections',
                    label: 'Sections',
                    onClick: () => navigate('/faculty/sections')
                },
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/faculty/announcement-management'),
                    label: 'Announcements',
                    onClick: () => navigate('/faculty/announcement-management')
                },
                {
                    icon: <CalendarIcon size={18} />,
                    isActive: pathname.startsWith('/faculty/event-management'),
                    label: 'Events',
                    onClick: () => navigate('/faculty/event-management')
                }
            ]
        }
    ], [pathname, navigate]);

    function handleToggleSidebar() {
        setIsSidebarLocked((prev) => !prev);
    }

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'My Profile',
                    onClick: () => navigate('/faculty/profile')
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, 'Faculty'),
                    title: 'AU-JAS LMS'
                }}
                isOpen={isSidebarLocked}
                variant="dark"
                onToggleLock={handleToggleSidebar}
            >
                <CommonSideBarList
                    sections={navSections}
                    variant="dark"
                />
            </CommonSideBar>
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                <CommonNavbar
                    rightContent={
                        <div className="flex gap-3 items-center">
                            <NotificationBell />
                            <UserAccountMenu />
                        </div>
                    }
                />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}