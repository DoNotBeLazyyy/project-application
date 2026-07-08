import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import AssessmentsTab from '@pages/faculty/sections/AssessmentsTab';
import AttendanceTab from '@pages/faculty/sections/attendance/AttendanceTab';
import GradingTab from '@pages/faculty/sections/grading/GradingTab';
import StudentsTab from '@pages/faculty/sections/StudentsTab';
import { CalendarCheckIcon, ClipboardTextIcon, GraduationCapIcon, NotepadIcon } from '@phosphor-icons/react';
import { getSectionDetail } from '@services/faculty.service';
import { SectionDetail } from '@type/faculty.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

type SectionTab = 'students' | 'attendance' | 'grading' | 'assessments';

const SECTION_TABS: SectionTab[] = ['students', 'attendance', 'grading', 'assessments'];

export default function SectionDetailPage() {
    const { sectionId = '' } = useParams<{ sectionId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [section, setSection] = useState<SectionDetail | null>(null);

    const tabParam = searchParams.get('tab') as SectionTab | null;
    const activeTab: SectionTab = tabParam && SECTION_TABS.includes(tabParam)
        ? tabParam
        : 'students';

    useEffect(function() {
        if (!sectionId) return;

        async function fetchData() {
            const sectionResult = await getSectionDetail(sectionId);

            if (sectionResult.data) {
                setSection(sectionResult.data);
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
                        <GradingTab sectionId={sectionId} />
                    )}
                    {activeTab === 'assessments' && (
                        <AssessmentsTab sectionId={sectionId} />
                    )}
                </div>
            </div>
        </CommonCard>
    );
}