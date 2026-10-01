import RoleShell from '@components/layout/RoleShell';
import StudentProfilePromptModal from '@components/modal/StudentProfilePromptModal';
import {
    BooksIcon, CalendarDotsIcon, ChartLineUpIcon, ClipboardTextIcon, ExamIcon, HouseIcon, ListChecksIcon
} from '@phosphor-icons/react';
import { getMyProfile } from '@services/profile.service';
import { MyProfile } from '@type/profile.type';
import { SideBarSection } from '@type/sidebar.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    const loadProfile = useCallback(async function() {
        const result = await getMyProfile();
        if (result.data) {
            setProfile(result.data);
            if (!result.data.student) {
                setIsPromptOpen(true);
            } else {
                setIsPromptOpen(false);
            }
        }
    }, []);

    useEffect(function() {
        loadProfile();
    }, [loadProfile]);

    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <HouseIcon size={18} />,
                    isActive: pathname === '/student',
                    label: 'Dashboard',
                    onClick: () => navigate('/student')
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
            sectionLabel: 'COURSES & GRADES',
            items: [
                {
                    icon: <BooksIcon size={18} />,
                    isActive: pathname.startsWith('/student/subjects'),
                    label: 'My Subjects',
                    onClick: () => navigate('/student/subjects')
                },
                {
                    icon: <ExamIcon size={18} />,
                    isActive: pathname.startsWith('/student/grade'),
                    label: 'My Grades',
                    onClick: () => navigate('/student/grade')
                }
            ]
        },
        {
            sectionLabel: 'PROGRESS & FEEDBACK',
            items: [
                {
                    icon: <ChartLineUpIcon size={18} />,
                    isActive: pathname === '/student/insight',
                    label: 'Achievement & Honors Tracker',
                    onClick: () => navigate('/student/insight')
                },
                {
                    icon: <ClipboardTextIcon size={18} />,
                    isActive: pathname.startsWith('/student/evaluations'),
                    label: 'Faculty Evaluations',
                    onClick: () => navigate('/student/evaluations')
                }
            ]
        },
        {
            sectionLabel: 'ACADEMIC RECORDS',
            items: [
                {
                    icon: <ListChecksIcon size={18} />,
                    isActive: pathname === '/student/curriculum',
                    label: 'Curriculum Audit',
                    onClick: () => navigate('/student/curriculum')
                }
            ]
        }
    ], [pathname, navigate]);

    return (
        <>
            <RoleShell
                fallbackRoleLabel="Student"
                navSections={navSections}
                profilePath="/student/profile"
            />
            <StudentProfilePromptModal
                currentProfile={profile}
                isMandatory={!profile?.student}
                open={isPromptOpen}
                onClose={function() {
                    setIsPromptOpen(false);
                }}
                onSuccess={loadProfile}
            />
        </>
    );
}