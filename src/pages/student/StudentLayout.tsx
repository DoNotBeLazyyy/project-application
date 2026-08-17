import RoleShell from '@components/layout/RoleShell';
import {
    BooksIcon, CalendarDotsIcon, ChartLineUpIcon, ClipboardTextIcon, ExamIcon, ListChecksIcon, SquaresFourIcon
} from '@phosphor-icons/react';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/student',
                    label: 'Dashboard',
                    onClick: () => navigate('/student')
                },
                {
                    icon: <CalendarDotsIcon size={18} />,
                    isActive: pathname === '/student/schedule',
                    label: 'Schedule',
                    onClick: () => navigate('/student/schedule')
                },
                {
                    icon: <BooksIcon size={18} />,
                    isActive: pathname === '/student/subjects',
                    label: 'Subject',
                    onClick: () => navigate('/student/subjects')
                },
                {
                    icon: <ExamIcon size={18} />,
                    isActive: pathname === '/student/grade',
                    label: 'Grade',
                    onClick: () => navigate('/student/grade')
                },
                {
                    icon: <ClipboardTextIcon size={18} />,
                    isActive: pathname.startsWith('/student/evaluations'),
                    label: 'Evaluate',
                    onClick: () => navigate('/student/evaluations')
                },
                {
                    icon: <ListChecksIcon size={18} />,
                    isActive: pathname === '/student/curriculum',
                    label: 'Curriculum',
                    onClick: () => navigate('/student/curriculum')
                },
                {
                    icon: <ChartLineUpIcon size={18} />,
                    isActive: pathname === '/student/insight',
                    label: 'Insight',
                    onClick: () => navigate('/student/insight')
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