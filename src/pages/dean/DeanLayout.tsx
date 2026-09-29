import RoleShell from '@components/layout/RoleShell';
import {
    BookOpenTextIcon, CalendarIcon, CertificateIcon, ChalkboardTeacherIcon, HouseIcon, MegaphoneIcon, StepsIcon, TagIcon, TreeStructureIcon, UsersThreeIcon, WarningIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function DeanLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/dean',
                    label: 'Dashboard',
                    onClick: () => navigate('/dean')
                }
            ]
        },
        {
            sectionLabel: 'ACADEMIC ORGANIZATION',
            items: [
                {
                    icon: <CertificateIcon size={18} />,
                    isActive: pathname === '/dean/program-management',
                    label: 'Programs',
                    onClick: () => navigate('/dean/program-management')
                },
                {
                    icon: <StepsIcon size={18} />,
                    isActive: pathname === '/dean/program-level-management',
                    label: 'Program Levels',
                    onClick: () => navigate('/dean/program-level-management')
                },
                {
                    icon: <TagIcon size={18} />,
                    isActive: pathname === '/dean/course-type-management',
                    label: 'Course Types',
                    onClick: () => navigate('/dean/course-type-management')
                }
            ]
        },
        {
            sectionLabel: 'CURRICULUM & COURSES',
            items: [
                {
                    icon: <BookOpenTextIcon size={18} />,
                    isActive: pathname === '/dean/course-management',
                    label: 'Courses',
                    onClick: () => navigate('/dean/course-management')
                },
                {
                    icon: <TreeStructureIcon size={18} />,
                    isActive: pathname === '/dean/curriculum-map-management',
                    label: 'Curriculum Maps',
                    onClick: () => navigate('/dean/curriculum-map-management')
                }
            ]
        },
        {
            sectionLabel: 'INSTRUCTION & FACULTY',
            items: [
                {
                    icon: <UsersThreeIcon size={18} />,
                    isActive: pathname === '/dean/section-management',
                    label: 'Sections',
                    onClick: () => navigate('/dean/section-management')
                },
                {
                    icon: <ChalkboardTeacherIcon size={18} />,
                    isActive: pathname.startsWith('/dean/faculty-load'),
                    label: 'Faculty Loading',
                    onClick: () => navigate('/dean/faculty-load')
                },
                {
                    icon: <WarningIcon size={18} />,
                    isActive: pathname.startsWith('/dean/schedule-conflicts'),
                    label: 'Schedule Conflicts',
                    onClick: () => navigate('/dean/schedule-conflicts')
                }
            ]
        },
        {
            sectionLabel: 'CAMPUS COMMUNICATION',
            items: [
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

    return (
        <RoleShell
            fallbackRoleLabel="Dean"
            navSections={navSections}
            profilePath="/dean/profile"
        />
    );
}