import RoleShell from '@components/layout/RoleShell';
import {
    CalendarIcon, HouseIcon, MegaphoneIcon, SealCheckIcon, UserPlusIcon
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
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/registrar',
                    label: 'Dashboard',
                    onClick: () => navigate('/registrar')
                }
            ]
        },
        {
            sectionLabel: 'COURSE ENROLLMENTS',
            items: [
                {
                    icon: <UserPlusIcon size={18} />,
                    isActive: pathname === '/registrar/enrollment-management',
                    label: 'Section Enrollments',
                    onClick: () => navigate('/registrar/enrollment-management')
                }
            ]
        },
        {
            sectionLabel: 'GRADE RELEASE & VERIFICATION',
            items: [
                {
                    icon: <SealCheckIcon size={18} />,
                    isActive: pathname === '/registrar/grade-release',
                    label: 'Grade Release',
                    onClick: () => navigate('/registrar/grade-release')
                }
            ]
        },
        {
            sectionLabel: 'CAMPUS COMMUNICATION',
            items: [
                {
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/registrar/announcement-management') || pathname.startsWith('/registrar/event-management'),
                    label: 'Announcements & Events',
                    onClick: () => navigate('/registrar/announcement-management')
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