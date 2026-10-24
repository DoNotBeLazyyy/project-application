import RoleShell from '@components/layout/RoleShell';
import StudentProfilePromptModal from '@components/modal/StudentProfilePromptModal';
import {
    BooksIcon, CalendarBlankIcon, CalendarDotsIcon, ChartLineUpIcon, ClipboardTextIcon, ExamIcon, GraduationCapIcon, HouseIcon, ListChecksIcon, MegaphoneIcon
} from '@phosphor-icons/react';
import { getMyProfile } from '@services/profile.service';
import { useAppStore } from '@stores/app.store';
import { MyProfile } from '@type/profile.type';
import { SideBarSection } from '@type/sidebar.types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const userProfile = useAppStore((s) => s.userProfile);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    const loadProfile = useCallback(async function() {
        const result = await getMyProfile();
        if (result.data) {
            setProfile(result.data);
            if (result.data.profile_completed !== false && !result.data.student) {
                setIsPromptOpen(true);
            } else {
                setIsPromptOpen(false);
            }
        }
    }, []);

    useEffect(function() {
        loadProfile();
    }, [loadProfile, userProfile?.profile_completed]);

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
                    icon: <MegaphoneIcon size={18} />,
                    isActive: pathname.startsWith('/student/announcement') || pathname.startsWith('/student/event'),
                    label: 'Announcements & Events',
                    onClick: () => navigate('/student/announcement-management')
                },
                {
                    icon: <CalendarBlankIcon size={18} />,
                    isActive: pathname === '/student/calendar',
                    label: 'Calendar',
                    onClick: () => navigate('/student/calendar')
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
                    isActive: pathname === '/student/grade' || pathname.startsWith('/student/grade/'),
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
                },
                {
                    icon: <GraduationCapIcon size={18} />,
                    isActive: pathname === '/student/grade-report',
                    label: 'Grade Report',
                    onClick: () => navigate('/student/grade-report')
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
