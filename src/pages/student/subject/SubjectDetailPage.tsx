import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import SubjectAssessmentList from '@pages/student/subject/SubjectAssessmentList';
import SubjectAttendanceList from '@pages/student/subject/SubjectAttendanceList';
import SubjectGradeList from '@pages/student/subject/SubjectGradeList';
import SectionAnnouncementPanel from '@pages/shared/announcement/SectionAnnouncementPanel';
import SectionContentPanel from '@pages/shared/content/SectionContentPanel';
import SectionDiscussionPanel from '@pages/shared/discussion/SectionDiscussionPanel';
import {
    ArrowLeftIcon,
    BookOpenIcon,
    CalendarCheckIcon,
    ChatCircleTextIcon,
    ChalkboardTeacherIcon,
    GraduationCapIcon,
    MegaphoneIcon,
    NotepadIcon
} from '@phosphor-icons/react';
import {
    getSubjectAssessments,
    getSubjectAttendance,
    getSubjectDetail,
    getSubjectGrades
} from '@services/student-portal.service';
import { useBreadcrumbStore } from '@stores/breadcrumb.store';
import {
    StudentSubjectAttendanceItem,
    SubjectAssessmentItem,
    SubjectDetail,
    SubjectGradeItem
} from '@type/student-portal.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

type SubjectTab = 'content' | 'assessments' | 'grades' | 'attendance' | 'discussion' | 'announcements';

const SUBJECT_TABS: SubjectTab[] = [
    'content',
    'assessments',
    'grades',
    'attendance',
    'discussion',
    'announcements'
];

export default function SubjectDetailPage() {
    const { enrollmentId = '' } = useParams<{ enrollmentId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [subject, setSubject] = useState<SubjectDetail | null>(null);
    const [isSubjectMissing, setIsSubjectMissing] = useState(false);

    const tabParam = searchParams.get('tab');
    const normalizedTab = tabParam === 'grading' ? 'grades' : tabParam;
    const activeTab: SubjectTab = normalizedTab && SUBJECT_TABS.includes(normalizedTab as SubjectTab)
        ? (normalizedTab as SubjectTab)
        : 'content';

    const [assessments, setAssessments] = useState<SubjectAssessmentItem[] | null>(null);
    const [attendance, setAttendance] = useState<StudentSubjectAttendanceItem[] | null>(null);
    const [grades, setGrades] = useState<SubjectGradeItem[] | null>(null);

    const effectiveEnrollmentId = subject?.enrollment_id || enrollmentId;

    useEffect(function() {
        setSubject(null);
        setIsSubjectMissing(false);
        setAssessments(null);
        setAttendance(null);
        setGrades(null);
    }, [enrollmentId]);

    useEffect(function() {
        if (!enrollmentId) return;

        async function fetchSubject() {
            const result = await getSubjectDetail(enrollmentId);
            if (!result.data) {
                // Unknown id or not this student's enrollment: the function returns null.
                setIsSubjectMissing(true);
                return;
            }
            setSubject(result.data);
            const title = result.data.course_code
                ? `${result.data.section_code} (${result.data.course_code})`
                : result.data.section_code;
            useBreadcrumbStore
                .getState()
                .setCustomLabel(enrollmentId, title);
            if (result.data.enrollment_id) {
                useBreadcrumbStore
                    .getState()
                    .setCustomLabel(result.data.enrollment_id, title);
            }
            // If the parameter was a sectionId rather than enrollmentId, smoothly sync to canonical enrollment URL
            if (result.data.enrollment_id && result.data.enrollment_id !== enrollmentId) {
                navigate(`/student/subjects/${result.data.enrollment_id}${window.location.search}`, { replace: true });
            }
        }

        fetchSubject();
    }, [enrollmentId, navigate]);

    useEffect(function() {
        if (!effectiveEnrollmentId) return;

        async function fetchAssessments() {
            const result = await getSubjectAssessments(effectiveEnrollmentId);
            if (result.data) {
                setAssessments(result.data);
            } else {
                setAssessments([]);
            }
        }

        async function fetchAttendance() {
            const result = await getSubjectAttendance(effectiveEnrollmentId);
            if (result.data) {
                setAttendance(result.data);
            } else {
                setAttendance([]);
            }
        }

        async function fetchGrades() {
            const result = await getSubjectGrades(effectiveEnrollmentId);
            if (result.data) {
                setGrades(result.data);
            } else {
                setGrades([]);
            }
        }

        if (activeTab === 'assessments') fetchAssessments();
        if (activeTab === 'attendance' && attendance === null) fetchAttendance();
        if (activeTab === 'grades') fetchGrades();
    }, [activeTab, attendance, effectiveEnrollmentId]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setSearchParams({ tab: value }, { replace: true });
    }

    if (!enrollmentId) return null;

    return (
        <CommonCard className="h-full w-full p-3 sm:p-5 flex flex-col">
            <div className="flex flex-col gap-2 h-full min-h-0 sm:gap-3.5">
                {/* Mobile-First Subject Detail Header */}
                <div className="flex flex-col gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                    <div className="flex flex-nowrap items-center gap-2 min-w-0 sm:flex-wrap">
                        <button
                            type="button"
                            onClick={() => navigate('/student/subjects')}
                            aria-label="Back to My Subjects"
                            className="p-1 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                        >
                            <ArrowLeftIcon size={18} weight="bold" />
                        </button>
                        <span className="font-mono font-bold text-sm sm:text-base px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            {subject?.section_code ?? '—'}
                        </span>
                        <span className="text-slate-400 text-sm hidden sm:inline">
                            /
                        </span>
                        <h1 className="font-bold leading-snug min-w-0 text-base text-slate-900 tracking-tight truncate dark:text-slate-100 sm:text-lg sm:whitespace-normal">
                            {subject?.course_code ? `${subject.course_code} — ` : ''}{subject?.course_title ?? (isSubjectMissing
                                ? 'Subject not found'
                                : 'Loading Subject...')}
                        </h1>
                    </div>

                    <div className="hidden flex-wrap items-center gap-2.5 text-xs text-slate-500 sm:flex">
                        {subject?.term_label && (
                            <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                {subject.term_label}
                            </span>
                        )}
                        {subject?.faculty_name && (
                            <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                <ChalkboardTeacherIcon size={14} className="text-slate-400" />
                                {subject.faculty_name}
                            </span>
                        )}
                        {subject?.enrollment_status && (
                            <span className="flex items-center gap-1 font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-md">
                                {subject.enrollment_status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Horizontal Scrollable Tabs on Mobile */}
                <div className="overflow-x-auto no-scrollbar pb-1 shrink-0 -mx-1 px-1">
                    <div className="min-w-max">
                        <CommonTabMenu
                            menuStyle="outline"
                            tabs={[
                                {
                                    icon: <BookOpenIcon size={16} />,
                                    label: 'Lessons & Syllabus',
                                    value: 'content'
                                },
                                {
                                    icon: <NotepadIcon size={16} />,
                                    label: 'Assessments',
                                    value: 'assessments'
                                },
                                {
                                    icon: <GraduationCapIcon size={16} />,
                                    label: 'Grades',
                                    value: 'grades'
                                },
                                {
                                    icon: <CalendarCheckIcon size={16} />,
                                    label: 'Attendance',
                                    value: 'attendance'
                                },
                                {
                                    icon: <ChatCircleTextIcon size={16} />,
                                    label: 'Discussions',
                                    value: 'discussion'
                                },
                                {
                                    icon: <MegaphoneIcon size={16} />,
                                    label: 'Announcements',
                                    value: 'announcements'
                                }
                            ]}
                            value={activeTab}
                            onChange={handleTabChange}
                        />
                    </div>
                </div>

                {/* Tab Content Panes */}
                <div className="flex-1 min-h-0">
                    {activeTab === 'content' && subject?.section_id && (
                        <SectionContentPanel canManage={false} sectionId={subject.section_id} />
                    )}
                    {activeTab === 'assessments' && (
                        <SubjectAssessmentList
                            assessments={assessments ?? []}
                            enrollmentId={effectiveEnrollmentId}
                        />
                    )}
                    {activeTab === 'grades' && (
                        <SubjectGradeList
                            enrollmentId={effectiveEnrollmentId}
                            grades={grades ?? []}
                        />
                    )}
                    {activeTab === 'attendance' && (
                        <SubjectAttendanceList attendance={attendance ?? []} />
                    )}
                    {activeTab === 'discussion' && subject?.section_id && (
                        <SectionDiscussionPanel sectionId={subject.section_id} />
                    )}
                    {activeTab === 'announcements' && subject?.section_id && (
                        <SectionAnnouncementPanel canManage={false} sectionId={subject.section_id} />
                    )}
                </div>
            </div>
        </CommonCard>
    );
}
