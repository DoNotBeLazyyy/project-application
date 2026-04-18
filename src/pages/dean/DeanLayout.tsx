import CommonButton from '@components/button/CommonButton';
import CommonNavbar from '@components/navbar/CommonNavbar';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { ListIcon, SignOutIcon, SquaresFourIcon } from '@phosphor-icons/react';
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

export default function DeanLayout() {
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
                }
            ]
        }
    ], [pathname, navigate]);

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
        : 'Dean';

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'Settings',
                    onClick: () => navigate('/dean/settings')
                }}
                headerProps={{
                    subtitle: 'Dean Panel',
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