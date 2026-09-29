import RoleShell from '@components/layout/RoleShell';
import {
    BooksIcon, CalendarDotsIcon, ChartLineUpIcon, ClipboardTextIcon, ExamIcon, HouseIcon, ListChecksIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'ACADEMIC HUB',
            items: [
                {
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/student',
                    label: 'Dashboard',
                    onClick: () => navigate('/student')
                },
                {
                    icon: <BooksIcon size={18} />,
                    isActive: pathname.startsWith('/student/subjects'),
                    label: 'My Subjects',
                    onClick: () => navigate('/student/subjects')
                },
                {
                    icon: <CalendarDotsIcon size={18} />,
                    isActive: pathname === '/student/schedule',
                    label: 'Class Schedule',
                    onClick: () => navigate('/student/schedule')
                }
            ]
        },
        {
            sectionLabel: 'PERFORMANCE & RECORDS',
            items: [
                {
                    icon: <ExamIcon size={18} />,
                    isActive: pathname.startsWith('/student/grade'),
                    label: 'Grades & Honors',
                    onClick: () => navigate('/student/grade')
                },
                {
                    icon: <ChartLineUpIcon size={18} />,
                    isActive: pathname === '/student/insight',
                    label: 'Honors & Analytics',
                    onClick: () => navigate('/student/insight')
                },
                {
                    icon: <ListChecksIcon size={18} />,
                    isActive: pathname === '/student/curriculum',
                    label: 'Curriculum Audit',
                    onClick: () => navigate('/student/curriculum')
                },
                {
                    icon: <ClipboardTextIcon size={18} />,
                    isActive: pathname.startsWith('/student/evaluations'),
                    label: 'Faculty Evaluations',
                    onClick: () => navigate('/student/evaluations')
                }
            ]
        }
    ], [pathname, navigate]);

    return (
        <RoleShell
            fallbackRoleLabel="Student"
            navSections={navSections}
            profilePath="/student/profile"
        />
    );
}