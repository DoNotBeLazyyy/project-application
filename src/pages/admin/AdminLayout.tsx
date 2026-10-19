import RoleShell from '@components/layout/RoleShell';
import {
    BuildingsIcon, CalendarDotsIcon, CalendarIcon, ClipboardTextIcon, ClockCounterClockwiseIcon, GearIcon, HouseIcon, MegaphoneIcon, UserCheckIcon, UsersIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isAnnouncementPath = pathname.startsWith('/admin/announcement-management') || pathname.startsWith('/admin/event-management');

    const navSections = useMemo((): SideBarSection[] => (
        [
            {
                sectionLabel: 'OVERVIEW',
                items: [
                    {
                        icon: <HouseIcon size={18} />,
                        isActive: pathname === '/admin',
                        label: 'Dashboard',
                        onClick: () => navigate('/admin')
                    },
                    {
                        icon: <UsersIcon size={18} />,
                        isActive: pathname.startsWith('/admin/users'),
                        label: 'Users',
                        onClick: () => navigate('/admin/users')
                    },
                    {
                        icon: <UserCheckIcon size={18} />,
                        isActive: pathname.startsWith('/admin/profile-verifications'),
                        label: 'Profile Approvals',
                        onClick: () => navigate('/admin/profile-verifications')
                    }
                ]
            },
            {
                sectionLabel: 'ACADEMIC STRUCTURE',
                items: [
                    {
                        icon: <CalendarDotsIcon size={18} />,
                        isActive: pathname.startsWith('/admin/school-years'),
                        label: 'Academic Years',
                        onClick: () => navigate('/admin/school-years')
                    },
                    {
                        icon: <BuildingsIcon size={18} />,
                        isActive: pathname.startsWith('/admin/departments'),
                        label: 'Departments',
                        onClick: () => navigate('/admin/departments')
                    }
                ]
            },
            {
                sectionLabel: 'CAMPUS & COMMUNITY',
                items: [
                    {
                        icon: <CalendarIcon size={18} />,
                        isActive: pathname === '/admin/calendar',
                        label: 'Calendar',
                        onClick: () => navigate('/admin/calendar')
                    },
                    {
                        icon: <MegaphoneIcon size={18} />,
                        isActive: isAnnouncementPath,
                        label: 'Announcements & Events',
                        onClick: () => navigate('/admin/announcement-management')
                    },
                    {
                        icon: <ClipboardTextIcon size={18} />,
                        isActive: pathname.startsWith('/admin/evaluations'),
                        label: 'Evaluations',
                        onClick: () => navigate('/admin/evaluations')
                    }
                ]
            },
            {
                sectionLabel: 'SYSTEM & SECURITY',
                items: [
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
    ), [pathname, navigate, isAnnouncementPath]);

    return (
        <RoleShell
            fallbackRoleLabel="Admin"
            navSections={navSections}
            profilePath="/admin/profile"
        />
    );
}