import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import AssessmentsTab from '@pages/faculty/sections/AssessmentsTab';
import AttendanceTab from '@pages/faculty/sections/attendance/AttendanceTab';
import GradingTab from '@pages/faculty/sections/grading/GradingTab';
import StudentsTab from '@pages/faculty/sections/StudentsTab';
import SectionAnnouncementPanel from '@pages/shared/announcement/SectionAnnouncementPanel';
import SectionContentPanel from '@pages/shared/content/SectionContentPanel';
import SectionDiscussionPanel from '@pages/shared/discussion/SectionDiscussionPanel';
import {
    BookOpenIcon,
    CalendarCheckIcon,
    ChatCircleTextIcon,
    ChalkboardTeacherIcon,
    DoorIcon,
    GraduationCapIcon,
    MegaphoneIcon,
    NotepadIcon,
    StudentIcon
} from '@phosphor-icons/react';
import { getSectionDetail } from '@services/faculty.service';
import { useBreadcrumbStore } from '@stores/breadcrumb.store';
import { SectionDetail } from '@type/faculty.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

type SectionTab = 'content' | 'assessments' | 'grading' | 'attendance' | 'students' | 'discussion' | 'announcements' | 'rubrics';

const SECTION_TABS: SectionTab[] = [
    'content', 'assessments', 'grading', 'attendance', 'students', 'discussion', 'announcements', 'rubrics'
];

export default function SectionDetailPage() {
    const { sectionId = '' } = useParams<{ sectionId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [section, setSection] = useState<SectionDetail | null>(null);

    const tabParam = searchParams.get('tab') as SectionTab | null;
    const isRubricsTab = tabParam === 'rubrics';
    const activeTab: SectionTab = tabParam && SECTION_TABS.includes(tabParam)
        ? (isRubricsTab ? 'assessments' : tabParam)
        : 'content';

    useEffect(function() {
        if (!sectionId) return;

        async function fetchData() {
            const sectionResult = await getSectionDetail(sectionId);

            if (sectionResult.data) {
                setSection(sectionResult.data);
                const title = sectionResult.data.course_code
                    ? `${sectionResult.data.section_code} (${sectionResult.data.course_code})`
                    : sectionResult.data.section_code;
                useBreadcrumbStore
                    .getState()
                    .setCustomLabel(sectionId, title);
            }
        }

        fetchData();
    }, [sectionId]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setSearchParams({ tab: value }, { replace: true });
    }

    if (!sectionId) return null;

    return (
        <CommonCard className="h-full w-full p-3 sm:p-5 flex flex-col">
            <div className="flex flex-col gap-3.5 h-full min-h-0">
                {/* Mobile-First Section Detail Header */}
                <div className="flex flex-col gap-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm sm:text-base px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            {section?.section_code ?? '—'}
                        </span>
                        <span className="text-slate-400 text-sm hidden sm:inline">
                            /
                        </span>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight leading-snug">
                            {section?.course_code ? `${section.course_code} — ` : ''}{section?.course_title ?? 'Loading Course...'}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        {section?.term_label && (
                            <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                {section.term_label}
                            </span>
                        )}
                        {section?.room && (
                            <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                <DoorIcon size={14} className="text-slate-400" />
                                {section.room}
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
                                    icon: <ChalkboardTeacherIcon size={16} />,
                                    label: 'Gradebook',
                                    value: 'grading'
                                },
                                {
                                    icon: <CalendarCheckIcon size={16} />,
                                    label: 'Attendance',
                                    value: 'attendance'
                                },
                                {
                                    icon: <StudentIcon size={16} />,
                                    label: 'Class Roster',
                                    value: 'students'
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
                    {activeTab === 'content' && (
                        <SectionContentPanel sectionId={sectionId} />
                    )}
                    {activeTab === 'assessments' && (
                        <AssessmentsTab
                            initialView={isRubricsTab ? 'rubrics' : 'assessments'}
                            sectionId={sectionId}
                        />
                    )}
                    {activeTab === 'grading' && (
                        <GradingTab
                            courseCode={section?.course_code}
                            courseTitle={section?.course_title}
                            sectionCode={section?.section_code}
                            sectionId={sectionId}
                        />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab sectionId={sectionId} />
                    )}
                    {activeTab === 'students' && (
                        <StudentsTab sectionId={sectionId} />
                    )}
                    {activeTab === 'discussion' && (
                        <SectionDiscussionPanel sectionId={sectionId} />
                    )}
                    {activeTab === 'announcements' && (
                        <SectionAnnouncementPanel sectionId={sectionId} />
                    )}
                </div>
            </div>
        </CommonCard>
    );
}