import RoleShell from '@components/layout/RoleShell';
import {
    BookOpenTextIcon, BuildingsIcon, CalendarIcon, CertificateIcon, ChalkboardTeacherIcon, MegaphoneIcon, SquaresFourIcon, StepsIcon, TagIcon, TreeStructureIcon, UsersThreeIcon
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
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/dean',
                    label: 'Dashboard',
                    onClick: () => navigate('/dean')
                },
                {
                    icon: <StepsIcon size={18} />,
                    isActive: pathname === '/dean/program-level-management',
                    label: 'Program Level',
                    onClick: () => navigate('/dean/program-level-management')
                },
                {
                    icon: <TagIcon size={18} />,
                    isActive: pathname === '/dean/course-type-management',
                    label: 'Course Type',
                    onClick: () => navigate('/dean/course-type-management')
                },
                {
                    icon: <BuildingsIcon size={18} />,
                    isActive: pathname === '/dean/department-management',
                    label: 'Department',
                    onClick: () => navigate('/dean/department-management')
                },
                {
                    icon: <CertificateIcon size={18} />,
                    isActive: pathname === '/dean/program-management',
                    label: 'Program',
                    onClick: () => navigate('/dean/program-management')
                },
                {
                    icon: <BookOpenTextIcon size={18} />,
                    isActive: pathname === '/dean/course-management',
                    label: 'Course',
                    onClick: () => navigate('/dean/course-management')
                },
                {
                    icon: <TreeStructureIcon size={18} />,
                    isActive: pathname === '/dean/curriculum-map-management',
                    label: 'Curriculum Map',
                    onClick: () => navigate('/dean/curriculum-map-management')
                },
                {
                    icon: <UsersThreeIcon size={18} />,
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

    return (
        <RoleShell
            fallbackRoleLabel="Dean"
            navSections={navSections}
            profilePath="/dean/profile"
        />
    );
}