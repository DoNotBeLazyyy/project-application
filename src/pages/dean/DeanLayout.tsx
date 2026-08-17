import CommonButton from '@components/button/CommonButton';
import CommonNavbar from '@components/navbar/CommonNavbar';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import SideBarExpandedOnly from '@components/sidebar/SideBarExpandedOnly';
import { ROLE_HOME, resolvePanelLabel } from '@constants/role.constant';
import {
    CalendarIcon, ChalkboardTeacherIcon, ListIcon, MegaphoneIcon, SignOutIcon, SquaresFourIcon
} from '@phosphor-icons/react';
import { logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { ChangeEventInputTextarea } from '@type/common.type';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function DeanLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isSidebarLocked, setIsSidebarLocked] = useState(false);
    const userProfile = useAppStore((s) => s.userProfile);
    const activeRole = useAppStore((s) => s.activeRole);
    const availableRoles = useAppStore((s) => s.availableRoles);
    const roleOptions: CommonSelectOption[] = availableRoles.map((r) => ({
        label: r.label,
        value: r.code
    }));
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean',
                    label: 'Dashboard',
                    onClick: () => navigate('/dean')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/program-level-management',
                    label: 'Program Level',
                    onClick: () => navigate('/dean/program-level-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/course-type-management',
                    label: 'Course Type',
                    onClick: () => navigate('/dean/course-type-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/department-management',
                    label: 'Department',
                    onClick: () => navigate('/dean/department-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/program-management',
                    label: 'Program',
                    onClick: () => navigate('/dean/program-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/course-management',
                    label: 'Course',
                    onClick: () => navigate('/dean/course-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/curriculum-map-management',
                    label: 'Curriculum Map',
                    onClick: () => navigate('/dean/curriculum-map-management')
                },
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean/section-management',
                    label: 'Section',
                    onClick: () => navigate('/dean/section-management')
                },
                {
                    icon: <ChalkboardTeacherIcon size={18} />,
                    isActive: pathname.startsWith('/dean/faculty-load'),
                    label: 'Faculty Load',
                    onClick: () => navigate('/dean/faculty-load')
                },
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/dean/announcement-management'),
                    label: 'Announcements',
                    onClick: () => navigate('/dean/announcement-management')
                },
                {
                    icon: <CalendarIcon size={18} />,
                    isActive: pathname.startsWith('/dean/event-management'),
                    label: 'Events',
                    onClick: () => navigate('/dean/event-management')
                }
            ]
        }
    ], [pathname, navigate]);

    function handleToggleSidebar() {
        setIsSidebarLocked((prev) => !prev);
    }

    function handleRoleChange(event: ChangeEventInputTextarea) {
        const role = event.target.value as UserRole;
        useAppStore.getState()
            .setActiveRole(role);
        navigate(ROLE_HOME[role], { replace: true });
    }

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    const displayName = userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : 'Dean';

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'My Profile',
                    onClick: () => navigate('/dean/profile')
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, 'Dean'),
                    title: 'AU-JAS LMS'
                }}
                isOpen={isSidebarLocked}
                variant="dark"
                onToggleLock={handleToggleSidebar}
            >
                <SideBarExpandedOnly>
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
                </SideBarExpandedOnly>
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