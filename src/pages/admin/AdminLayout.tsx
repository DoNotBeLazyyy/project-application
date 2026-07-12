import CommonButton from '@components/button/CommonButton';
import CommonNavbar from '@components/navbar/CommonNavbar';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import {
    CalendarIcon, ChartBarIcon, ClipboardTextIcon, ClockIcon, GearIcon, GraduationCapIcon, ListChecksIcon, ListIcon, MegaphoneIcon, ShieldCheckIcon, SignOutIcon, SquaresFourIcon, UsersIcon
} from '@phosphor-icons/react';
import { logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { ChangeEventInputTextarea } from '@type/common.type';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const ROLE_DASHBOARD: Record<UserRole, string> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

export default function AdminLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const userProfile = useAppStore((s) => s.userProfile);
    const activeRole = useAppStore((s) => s.activeRole);
    const availableRoles = useAppStore((s) => s.availableRoles);

    const roleOptions: CommonSelectOption[] = availableRoles.map((r) => ({
        label: r.label,
        value: r.code
    }));

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
                        icon: <CalendarIcon size={18} />,
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
                        icon: <ListChecksIcon size={18} />,
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
        setIsSidebarOpen((prev) => !prev);
    }

    function handleRoleChange(event: ChangeEventInputTextarea) {
        const role = event.target.value as UserRole;
        useAppStore.getState()
            .setActiveRole(role);
        navigate(ROLE_DASHBOARD[role]);
    }

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    const displayName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'Admin';

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'Settings',
                    onClick: () => navigate('/admin/settings')
                }}
                headerProps={{
                    subtitle: 'Admin Panel',
                    title: 'AU-JAS LMS'
                }}
                isOpen={isSidebarOpen}
                variant="dark"
            >
                {availableRoles.length > 1 && (
                    <div className="flex flex-col gap-1 mb-4">
                        <span className="text-white/60 text-xs">
                            Switch Role
                        </span>
                        <CommonSelect
                            fullWidth
                            options={roleOptions}
                            size="small"
                            value={activeRole ?? ''}
                            variant="outlined"
                            onChange={handleRoleChange}
                        />
                    </div>
                )}
                <CommonSideBarList
                    sections={navSections}
                    variant="dark"
                />
            </CommonSideBar>

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                <CommonNavbar
                    leftContent={
                        <CommonButton
                            size="small"
                            startIcon={<ListIcon size={20} />}
                            sx={{ color: 'var(--mui-tokens-color-common-white)', minWidth: 0 }}
                            variant="text"
                            onClick={handleToggleSidebar}
                        />
                    }
                    rightContent={
                        <div className="flex gap-3 items-center">
                            <NotificationBell />
                            <span className="text-sm text-white/80">
                                {displayName}
                            </span>
                            <CommonButton
                                size="small"
                                startIcon={<SignOutIcon size={18} />}
                                sx={{ color: 'var(--mui-tokens-color-common-white)' }}
                                variant="text"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </CommonButton>
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