import RoleShell from '@components/layout/RoleShell';
import {
    CalendarBlankIcon, ChalkboardTeacherIcon, HouseIcon, MegaphoneIcon, StarIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function FacultyLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const isAnnouncementPath = pathname.startsWith('/faculty/announcement-management') || pathname.startsWith('/faculty/event-management');

    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/faculty',
                    label: 'Dashboard',
                    onClick: () => navigate('/faculty')
                },
                {
                    icon: <CalendarBlankIcon size={18} />,
                    isActive: pathname === '/faculty/calendar',
                    label: 'Calendar',
                    onClick: () => navigate('/faculty/calendar')
                }
            ]
        },
        {
            sectionLabel: 'INSTRUCTION',
            items: [
                {
                    icon: <ChalkboardTeacherIcon size={18} />,
                    isActive: pathname === '/faculty/sections',
                    label: 'My Sections',
                    onClick: () => navigate('/faculty/sections')
                },
                {
                    icon: <StarIcon size={18} />,
                    isActive: pathname.startsWith('/faculty/evaluations'),
                    label: 'Student Evaluations',
                    onClick: () => navigate('/faculty/evaluations')
                }
            ]
        },
        {
            sectionLabel: 'CAMPUS COMMUNICATION',
            items: [
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: isAnnouncementPath,
                    label: 'Announcements & Events',
                    onClick: () => navigate('/faculty/announcement-management')
                }
            ]
        }
    ], [pathname, navigate, isAnnouncementPath]);

    return (
        <RoleShell
            fallbackRoleLabel="Faculty"
            navSections={navSections}
            profilePath="/faculty/profile"
        />
    );
}