import RoleShell from '@components/layout/RoleShell';
import {
    ArrowsClockwiseIcon, CalendarIcon, MegaphoneIcon, SealCheckIcon, SquaresFourIcon, StudentIcon, UserPlusIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RegistrarLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/registrar',
                    label: 'Dashboard',
                    onClick: () => navigate('/registrar')
                },
                {
                    icon: <StudentIcon size={18} />,
                    isActive: pathname === '/registrar/student-management',
                    label: 'Student',
                    onClick: () => navigate('/registrar/student-management')
                },
                {
                    icon: <UserPlusIcon size={18} />,
                    isActive: pathname === '/registrar/enrollment-management',
                    label: 'Enrollment',
                    onClick: () => navigate('/registrar/enrollment-management')
                },
                {
                    icon: <ArrowsClockwiseIcon size={18} />,
                    isActive: pathname === '/registrar/batch-progression',
                    label: 'Batch Progression',
                    onClick: () => navigate('/registrar/batch-progression')
                },
                {
                    icon: <SealCheckIcon size={18} />,
                    isActive: pathname === '/registrar/grade-release',
                    label: 'Grade Release',
                    onClick: () => navigate('/registrar/grade-release')
                },
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/registrar/announcement-management'),
                    label: 'Announcements',
                    onClick: () => navigate('/registrar/announcement-management')
                },
                {
                    icon: <CalendarIcon size={18} />,
                    isActive: pathname.startsWith('/registrar/event-management'),
                    label: 'Events',
                    onClick: () => navigate('/registrar/event-management')
                }
            ]
        }
    ], [pathname, navigate]);

    return (
        <RoleShell
            fallbackRoleLabel="Registrar"
            navSections={navSections}
            profilePath="/registrar/profile"
        />
    );
}