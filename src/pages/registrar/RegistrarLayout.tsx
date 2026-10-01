import RoleShell from '@components/layout/RoleShell';
import {
    CalendarIcon, HouseIcon, MegaphoneIcon, ScrollIcon, SealCheckIcon, UserCheckIcon, UserPlusIcon
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
            sectionLabel: 'STUDENT PROFILE VERIFICATION',
            items: [
                {
                    icon: <UserCheckIcon size={18} />,
                    isActive: pathname === '/registrar/student-verification',
                    label: 'Profile Verification',
                    onClick: () => navigate('/registrar/student-verification')
                },
                {
                    icon: <ScrollIcon size={18} />,
                    isActive: pathname === '/registrar/registrar-logs',
                    label: 'Registrar Logs',
                    onClick: () => navigate('/registrar/registrar-logs')
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
        },
        {
            sectionLabel: 'COMING SOON',
            items: [
                {
                    icon: <SealCheckIcon size={18} />,
                    isActive: pathname === '/registrar/grade-release',
                    label: 'Grade Release (Soon)',
                    onClick: () => navigate('/registrar/grade-release')
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