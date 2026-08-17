import CommonNavbar from '@components/navbar/CommonNavbar';
import UserAccountMenu from '@components/navbar/UserAccountMenu';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { resolvePanelLabel } from '@constants/role.constant';
import {
    ArrowsClockwiseIcon, CalendarIcon, MegaphoneIcon, SealCheckIcon, SquaresFourIcon, StudentIcon, UserPlusIcon
} from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function RegistrarLayout() {
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
                    isActive: pathname === '/registrar',
                    label: 'Dashboard',
                    onClick: () => navigate('/registrar')
                },
                {
                    icon: <StudentIcon size={18} />,
                    isActive: pathname === '/registrar/student-management',
                    label: 'Student',
                    onClick: () => navigate('/registrar/student-management')
                },
                {
                    icon: <UserPlusIcon size={18} />,
                    isActive: pathname === '/registrar/enrollment-management',
                    label: 'Enrollment',
                    onClick: () => navigate('/registrar/enrollment-management')
                },
                {
                    icon: <ArrowsClockwiseIcon size={18} />,
                    isActive: pathname === '/registrar/batch-progression',
                    label: 'Batch Progression',
                    onClick: () => navigate('/registrar/batch-progression')
                },
                {
                    icon: <SealCheckIcon size={18} />,
                    isActive: pathname === '/registrar/grade-release',
                    label: 'Grade Release',
                    onClick: () => navigate('/registrar/grade-release')
                },
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/registrar/announcement-management'),
                    label: 'Announcements',
                    onClick: () => navigate('/registrar/announcement-management')
                },
                {
                    icon: <CalendarIcon size={18} />,
                    isActive: pathname.startsWith('/registrar/event-management'),
                    label: 'Events',
                    onClick: () => navigate('/registrar/event-management')
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
                    onClick: () => navigate('/registrar/profile')
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, 'Registrar'),
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