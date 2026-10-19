import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import SubjectAssessmentList from '@pages/student/subject/SubjectAssessmentList';
import SubjectAttendanceList from '@pages/student/subject/SubjectAttendanceList';
import SubjectGradeList from '@pages/student/subject/SubjectGradeList';
import SectionAnnouncementPanel from '@pages/shared/announcement/SectionAnnouncementPanel';
import SectionContentPanel from '@pages/shared/content/SectionContentPanel';
import SectionDiscussionPanel from '@pages/shared/discussion/SectionDiscussionPanel';
import {
    ArrowLeftIcon, BookOpenIcon, CalendarCheckIcon, ChatCircleTextIcon, ClipboardTextIcon, GraduationCapIcon, MegaphoneIcon
} from '@phosphor-icons/react';
import { getSubjectAssessments, getSubjectAttendance, getSubjectDetail, getSubjectGrades } from '@services/student-portal.service';
import { StudentSubjectAttendanceItem, SubjectAssessmentItem, SubjectDetail, SubjectGradeItem } from '@type/student-portal.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

const SUBJECT_TABS = ['assessments', 'attendance', 'grades', 'content', 'discussion', 'announcements'] as const;
type SubjectTab = typeof SUBJECT_TABS[number];

export default function SubjectDetailPage() {
    const { enrollmentId = '' } = useParams<{ enrollmentId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [subject, setSubject] = useState<SubjectDetail | null>(null);

    const tabParam = searchParams.get('tab') as SubjectTab | null;
    const activeTab: SubjectTab = tabParam && SUBJECT_TABS.includes(tabParam)
        ? tabParam
        : 'assessments';

    const [assessments, setAssessments] = useState<SubjectAssessmentItem[] | null>(null);
    const [attendance, setAttendance] = useState<StudentSubjectAttendanceItem[] | null>(null);
    const [grades, setGrades] = useState<SubjectGradeItem[] | null>(null);

    const effectiveEnrollmentId = subject?.enrollment_id || enrollmentId;

    useEffect(function() {
        setSubject(null);
        setAssessments(null);
        setAttendance(null);
        setGrades(null);
    }, [enrollmentId]);

    useEffect(function() {
        if (!enrollmentId) return;

        async function fetchSubject() {
            const result = await getSubjectDetail(enrollmentId);
            if (result.data) {
                setSubject(result.data);
                // If the parameter was a sectionId rather than enrollmentId, smoothly sync to canonical enrollment URL
                if (result.data.enrollment_id && result.data.enrollment_id !== enrollmentId) {
                    navigate(`/student/subjects/${result.data.enrollment_id}${location.search}`, { replace: true });
                }
            }
        }

        fetchSubject();
    }, [enrollmentId, location.search, navigate]);

    useEffect(function() {
        if (!effectiveEnrollmentId) return;

        async function fetchAssessments() {
            const result = await getSubjectAssessments(effectiveEnrollmentId);
            if (result.data) setAssessments(result.data);
        }

        async function fetchAttendance() {
            const result = await getSubjectAttendance(effectiveEnrollmentId);
            if (result.data) setAttendance(result.data);
        }

        async function fetchGrades() {
            const result = await getSubjectGrades(effectiveEnrollmentId);
            if (result.data) setGrades(result.data);
        }

        if (activeTab === 'assessments' && assessments === null) fetchAssessments();
        if (activeTab === 'attendance' && attendance === null) fetchAttendance();
        if (activeTab === 'grades') fetchGrades();
    }, [activeTab, assessments, attendance, effectiveEnrollmentId]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setSearchParams(function(prev) {
            const next = new URLSearchParams(prev);
            next.set('tab', value);
            return next;
        });
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex gap-3 items-center">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        navigate('/student/subjects');
                    }}
                >
                    Back
                </CommonButton>
                <div className="flex flex-col">
                    <div className="flex gap-2 items-center">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {subject?.course_code ?? '—'}
                        </h1>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            /
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.course_title}
                        </span>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.section_code}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            ·
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.term_label}
                        </span>
                        {subject?.faculty_name && (
                            <>
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                    ·
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                    {subject.faculty_name}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <CommonTabMenu
                menuStyle="outline"
                tabs={[
                    {
                        icon: <ClipboardTextIcon />,
                        label: 'Assessments',
                        value: 'assessments'
                    },
                    {
                        icon: <CalendarCheckIcon />,
                        label: 'Attendance',
                        value: 'attendance'
                    },
                    {
                        icon: <GraduationCapIcon />,
                        label: 'Grades',
                        value: 'grades'
                    },
                    {
                        icon: <BookOpenIcon />,
                        label: 'Content',
                        value: 'content'
                    },
                    {
                        icon: <ChatCircleTextIcon />,
                        label: 'Discussion',
                        value: 'discussion'
                    },
                    {
                        icon: <MegaphoneIcon />,
                        label: 'Announcements',
                        value: 'announcements'
                    }
                ]}
                value={activeTab}
                onChange={handleTabChange}
            />
            <div className="flex flex-1 flex-col min-h-0">
                {activeTab === 'assessments' && (
                    <SubjectAssessmentList
                        assessments={assessments ?? []}
                        enrollmentId={effectiveEnrollmentId}
                    />
                )}
                {activeTab === 'attendance' && (
                    <SubjectAttendanceList attendance={attendance ?? []} />
                )}
                {activeTab === 'grades' && (
                    <SubjectGradeList
                        enrollmentId={effectiveEnrollmentId}
                        grades={grades ?? []}
                    />
                )}
                {activeTab === 'content' && subject?.section_id && (
                    <SectionContentPanel sectionId={subject.section_id} />
                )}
                {activeTab === 'discussion' && subject?.section_id && (
                    <SectionDiscussionPanel sectionId={subject.section_id} />
                )}
                {activeTab === 'announcements' && subject?.section_id && (
                    <SectionAnnouncementPanel canManage={false} sectionId={subject.section_id} />
                )}
            </div>
        </CommonCard>
    );
}