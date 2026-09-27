import RoleShell from '@components/layout/RoleShell';
import { ChalkboardTeacherIcon, HouseIcon, StarIcon } from '@phosphor-icons/react';
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
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/faculty',
                    label: 'Dashboard',
                    onClick: () => navigate('/faculty')
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