import CommonNavbar from '@components/navbar/CommonNavbar';
import UserAccountMenu from '@components/navbar/UserAccountMenu';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { resolvePanelLabel } from '@constants/role.constant';
import {
    CalendarDotsIcon, CalendarIcon, ChartBarIcon, ClipboardTextIcon, ClockCounterClockwiseIcon, ClockIcon, GearIcon, GraduationCapIcon, MegaphoneIcon, ShieldCheckIcon, SquaresFourIcon, StackIcon, UsersIcon
} from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isSidebarLocked, setIsSidebarLocked] = useState(false);

    const activeRole = useAppStore((s) => s.activeRole);

    const navSections = useMemo((): SideBarSection[] => (
        [
            {
                sectionLabel: 'GENERAL',
                items: [
                    {
                        icon: <SquaresFourIcon size={18} />,
                        isActive: pathname === '/admin',
                        label: 'Dashboard',
                        onClick: () => navigate('/admin')
                    },
                    {
                        icon: <UsersIcon size={18} />,
                        isActive: pathname.startsWith('/admin/users'),
                        label: 'Users',
                        onClick: () => navigate('/admin/users')
                    }
                ]
            },
            {
                sectionLabel: 'ACADEMICS',
                items: [
                    {
                        icon: <CalendarDotsIcon size={18} />,
                        isActive: pathname.startsWith('/admin/school-years'),
                        label: 'Academic Years',
                        onClick: () => navigate('/admin/school-years')
                    },
                    {
                        icon: <ClockIcon size={18} />,
                        isActive: pathname.startsWith('/admin/terms'),
                        label: 'Terms',
                        onClick: () => navigate('/admin/terms')
                    },
                    {
                        icon: <StackIcon size={18} />,
                        isActive: pathname.startsWith('/admin/term-types'),
                        label: 'Term Types',
                        onClick: () => navigate('/admin/term-types')
                    }
                ]
            },
            {
                sectionLabel: 'CONFIGURATION',
                items: [
                    {
                        icon: <ChartBarIcon size={18} />,
                        isActive: pathname === '/admin/grade-configurations',
                        label: 'Grading',
                        onClick: () => navigate('/admin/grade-configurations')
                    },
                    {
                        icon: <ClipboardTextIcon size={18} />,
                        isActive: pathname.startsWith('/admin/evaluations'),
                        label: 'Evaluations',
                        onClick: () => navigate('/admin/evaluations')
                    },
                    {
                        icon: <ShieldCheckIcon size={18} />,
                        isActive: pathname.startsWith('/admin/roles'),
                        label: 'Permissions',
                        onClick: () => navigate('/admin/roles')
                    },
                    {
                        icon: <GraduationCapIcon size={18} />,
                        isActive: pathname === '/admin/academic-thresholds',
                        label: 'Academic Thresholds',
                        onClick: () => navigate('/admin/academic-thresholds')
                    },
                    {
                        icon: <MegaphoneIcon size={18} />,
                        isActive: pathname.startsWith('/admin/announcement-management'),
                        label: 'Announcements',
                        onClick: () => navigate('/admin/announcement-management')
                    },
                    {
                        icon: <CalendarIcon size={18} />,
                        isActive: pathname.startsWith('/admin/event-management'),
                        label: 'Events',
                        onClick: () => navigate('/admin/event-management')
                    },
                    {
                        icon: <ClockCounterClockwiseIcon size={18} />,
                        isActive: pathname.startsWith('/admin/audit-logs'),
                        label: 'Audit Log',
                        onClick: () => navigate('/admin/audit-logs')
                    },
                    {
                        icon: <GearIcon size={18} />,
                        isActive: pathname === '/admin/system-settings',
                        label: 'Settings',
                        onClick: () => navigate('/admin/system-settings')
                    }
                ]
            }
        ]
    ), [pathname, navigate]);

    function handleToggleSidebar() {
        setIsSidebarLocked((prev) => !prev);
    }

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'My Profile',
                    onClick: () => navigate('/admin/profile')
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, 'Admin'),
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