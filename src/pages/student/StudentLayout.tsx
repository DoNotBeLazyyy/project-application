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
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/student',
                    label: 'Dashboard',
                    onClick: () => navigate('/student')
                }
            ]
        },
        {
            sectionLabel: 'MY ACADEMICS',
            items: [
                {
                    icon: <CalendarDotsIcon size={18} />,
                    isActive: pathname === '/student/schedule',
                    label: 'Class Schedule',
                    onClick: () => navigate('/student/schedule')
                },
                {
                    icon: <BooksIcon size={18} />,
                    isActive: pathname === '/student/subjects',
                    label: 'My Subjects',
                    onClick: () => navigate('/student/subjects')
                },
                {
                    icon: <ExamIcon size={18} />,
                    isActive: pathname === '/student/grade',
                    label: 'Grades & Transcripts',
                    onClick: () => navigate('/student/grade')
                }
            ]
        },
        {
            sectionLabel: 'PROGRESS & FEEDBACK',
            items: [
                {
                    icon: <ListChecksIcon size={18} />,
                    isActive: pathname === '/student/curriculum',
                    label: 'Curriculum Audit',
                    onClick: () => navigate('/student/curriculum')
                },
                {
                    icon: <ChartLineUpIcon size={18} />,
                    isActive: pathname === '/student/insight',
                    label: 'Academic Insights',
                    onClick: () => navigate('/student/insight')
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