import RoleShell from '@components/layout/RoleShell';
import {
    BookmarkSimpleIcon,
    CalendarDotsIcon, CalendarIcon, ChartBarIcon, ClipboardTextIcon, ClockCounterClockwiseIcon, ClockIcon, GearIcon, GraduationCapIcon, HouseIcon, MegaphoneIcon, PercentIcon, ShieldCheckIcon, StackIcon, UsersIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

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
                    },
                    {
                        icon: <GraduationCapIcon size={18} />,
                        isActive: pathname === '/admin/academic-thresholds',
                        label: 'Academic Thresholds',
                        onClick: () => navigate('/admin/academic-thresholds')
                    }
                ]
            },
            {
                sectionLabel: 'GRADING RULES',
                items: [
                    {
                        icon: <PercentIcon size={18} />,
                        isActive: pathname === '/admin/transmutation' || pathname === '/admin/grade-configurations',
                        label: 'Transmutation',
                        onClick: () => navigate('/admin/transmutation')
                    },
                    {
                        icon: <ChartBarIcon size={18} />,
                        isActive: pathname === '/admin/grading-periods',
                        label: 'Grading Periods',
                        onClick: () => navigate('/admin/grading-periods')
                    },
                    {
                        icon: <BookmarkSimpleIcon size={18} />,
                        isActive: pathname === '/admin/special-grades',
                        label: 'Special Grades',
                        onClick: () => navigate('/admin/special-grades')
                    }
                ]
            },
            {
                sectionLabel: 'CAMPUS & COMMUNITY',
                items: [
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
                        icon: <ShieldCheckIcon size={18} />,
                        isActive: pathname.startsWith('/admin/roles'),
                        label: 'Permissions',
                        onClick: () => navigate('/admin/roles')
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

    return (
        <RoleShell
            fallbackRoleLabel="Admin"
            navSections={navSections}
            profilePath="/admin/profile"
        />
    );
}