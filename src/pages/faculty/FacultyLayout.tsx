import RoleShell from '@components/layout/RoleShell';
import { CalendarIcon, ChalkboardTeacherIcon, MegaphoneIcon, SquaresFourIcon } from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function FacultyLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
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

    return (
        <RoleShell
            fallbackRoleLabel="Faculty"
            navSections={navSections}
            profilePath="/faculty/profile"
        />
    );
}