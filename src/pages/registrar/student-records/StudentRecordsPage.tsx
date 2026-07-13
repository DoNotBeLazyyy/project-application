import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import LifecyclePanel from '@pages/registrar/student-records/LifecyclePanel';
import StudentInsightView from '@pages/shared/analytics/StudentInsightView';
import CurriculumAuditView from '@pages/shared/records/CurriculumAuditView';
import TranscriptView from '@pages/shared/records/TranscriptView';
import {
    ArrowLeftIcon, ChartLineUpIcon, ClockCounterClockwiseIcon, ListChecksIcon, ScrollIcon
} from '@phosphor-icons/react';
import { SyntheticEvent, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type RecordsTab = 'transcript' | 'checklist' | 'lifecycle' | 'insight';

export default function StudentRecordsPage() {
    const { studentId = '' } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RecordsTab>('transcript');

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as RecordsTab);
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex gap-3 items-center no-print">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        navigate('/registrar/student-management');
                    }}
                >
                    Back
                </CommonButton>
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Academic Records
                </h1>
            </div>
            <CommonTabMenu
                className="no-print"
                menuStyle="outline"
                tabs={[
                    {
                        icon: <ScrollIcon />,
                        label: 'Transcript',
                        value: 'transcript'
                    },
                    {
                        icon: <ListChecksIcon />,
                        label: 'Curriculum Checklist',
                        value: 'checklist'
                    },
                    {
                        icon: <ChartLineUpIcon />,
                        label: 'Insight',
                        value: 'insight'
                    },
                    {
                        icon: <ClockCounterClockwiseIcon />,
                        label: 'Lifecycle',
                        value: 'lifecycle'
                    }
                ]}
                value={activeTab}
                onChange={handleTabChange}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'transcript' && <TranscriptView studentId={studentId} />}
                {activeTab === 'checklist' && <CurriculumAuditView studentId={studentId} />}
                {activeTab === 'insight' && <StudentInsightView studentId={studentId} />}
                {activeTab === 'lifecycle' && <LifecyclePanel studentId={studentId} />}
            </div>
        </CommonCard>
    );
}