import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import AssessmentsTab from '@pages/faculty/sections/AssessmentsTab';
import AttendanceTab from '@pages/faculty/sections/attendance/AttendanceTab';
import GradingTab from '@pages/faculty/sections/grading/GradingTab';
import RubricsTab from '@pages/faculty/sections/rubrics/RubricsTab';
import StudentsTab from '@pages/faculty/sections/StudentsTab';
import SectionInsightPanel from '@pages/shared/analytics/SectionInsightPanel';
import SectionAnnouncementPanel from '@pages/shared/announcement/SectionAnnouncementPanel';
import SectionContentPanel from '@pages/shared/content/SectionContentPanel';
import SectionDiscussionPanel from '@pages/shared/discussion/SectionDiscussionPanel';
import {
    BookOpenIcon, CalendarCheckIcon, ChartLineUpIcon, ChatCircleTextIcon, ClipboardTextIcon,
    GraduationCapIcon, ListChecksIcon, MegaphoneIcon, NotepadIcon
} from '@phosphor-icons/react';
import { getSectionDetail } from '@services/faculty.service';
import { useBreadcrumbStore } from '@stores/breadcrumb.store';
import { SectionDetail } from '@type/faculty.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

type SectionTab = 'students' | 'attendance' | 'grading' | 'assessments' | 'rubrics' | 'content' | 'discussion' | 'announcements' | 'insight';

const SECTION_TABS: SectionTab[] = [
    'students', 'attendance', 'grading', 'assessments', 'rubrics', 'content', 'discussion', 'announcements', 'insight'
];

export default function SectionDetailPage() {
    const { sectionId = '' } = useParams<{ sectionId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [section, setSection] = useState<SectionDetail | null>(null);

    const tabParam = searchParams.get('tab') as SectionTab | null;
    const activeTab: SectionTab = tabParam && SECTION_TABS.includes(tabParam)
        ? tabParam
        : 'students';

    useEffect(function() {
        if (!sectionId) {
            return;
        }

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
        <CommonCard className="h-full w-full">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {section?.section_code ?? '—'}
                        </h1>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                        /
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {section?.course_code} — {section?.course_title}
                        </span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {section?.term_label}
                        </span>
                        {section?.room && (
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                {section.room}
                            </span>
                        )}
                    </div>
                </div>
                <CommonTabMenu
                    menuStyle="outline"
                    tabs={[
                        {
                            icon: <GraduationCapIcon />,
                            label: 'Students',
                            value: 'students'
                        },
                        {
                            icon: <CalendarCheckIcon />,
                            label: 'Attendance',
                            value: 'attendance'
                        },
                        {
                            icon: <ClipboardTextIcon />,
                            label: 'Grading',
                            value: 'grading'
                        },
                        {
                            icon: <NotepadIcon />,
                            label: 'Assessments',
                            value: 'assessments'
                        },
                        {
                            icon: <ListChecksIcon />,
                            label: 'Rubrics',
                            value: 'rubrics'
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
                        },
                        {
                            icon: <ChartLineUpIcon />,
                            label: 'Insight',
                            value: 'insight'
                        }
                    ]}
                    value={activeTab}
                    onChange={handleTabChange}
                />
                <div className="flex-1 min-h-0">
                    {activeTab === 'students' && (
                        <StudentsTab sectionId={sectionId} />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceTab sectionId={sectionId} />
                    )}
                    {activeTab === 'grading' && (
                        <GradingTab
                            courseCode={section?.course_code}
                            courseTitle={section?.course_title}
                            sectionCode={section?.section_code}
                            sectionId={sectionId}
                        />
                    )}
                    {activeTab === 'assessments' && (
                        <AssessmentsTab sectionId={sectionId} />
                    )}
                    {activeTab === 'rubrics' && (
                        <RubricsTab sectionId={sectionId} />
                    )}
                    {activeTab === 'content' && (
                        <SectionContentPanel sectionId={sectionId} />
                    )}
                    {activeTab === 'discussion' && (
                        <SectionDiscussionPanel sectionId={sectionId} />
                    )}
                    {activeTab === 'announcements' && (
                        <SectionAnnouncementPanel sectionId={sectionId} />
                    )}
                    {activeTab === 'insight' && (
                        <SectionInsightPanel sectionId={sectionId} />
                    )}
                </div>
            </div>
        </CommonCard>
    );
}