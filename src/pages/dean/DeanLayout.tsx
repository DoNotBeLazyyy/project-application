import RoleShell from '@components/layout/RoleShell';
import {
    BookOpenTextIcon, CalendarIcon, CertificateIcon, ChalkboardTeacherIcon, HouseIcon, MegaphoneIcon, StepsIcon, TagIcon, UsersThreeIcon
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
            sectionLabel: 'ACADEMIC LOGISTICS',
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
                }
            ]
        },
        {
            sectionLabel: 'CURRICULUM & CATALOG',
            items: [
                {
                    icon: <CertificateIcon size={18} />,
                    isActive: pathname.startsWith('/dean/program-management'),
                    label: 'Programs',
                    onClick: () => navigate('/dean/program-management')
                },
                {
                    icon: <BookOpenTextIcon size={18} />,
                    isActive: pathname === '/dean/course-management',
                    label: 'Courses',
                    onClick: () => navigate('/dean/course-management')
                }
            ]
        },
        {
            sectionLabel: 'ACADEMIC LOOKUPS',
            items: [
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
            sectionLabel: 'CAMPUS COMMUNICATION',
            items: [
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/dean/announcement-management') || pathname.startsWith('/dean/event-management'),
                    label: 'Announcements & Events',
                    onClick: () => navigate('/dean/announcement-management')
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