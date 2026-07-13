import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import CurriculumAuditView from '@pages/shared/records/CurriculumAuditView';
import TranscriptView from '@pages/shared/records/TranscriptView';
import { GraduationCapIcon, ListChecksIcon } from '@phosphor-icons/react';
import { SyntheticEvent, useState } from 'react';

type CurriculumTab = 'checklist' | 'grades';

export default function StudentCurriculum() {
    const [activeTab, setActiveTab] = useState<CurriculumTab>('checklist');

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as CurriculumTab);
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <CommonTabMenu
                className="no-print"
                menuStyle="outline"
                tabs={[
                    {
                        icon: <ListChecksIcon />,
                        label: 'Curriculum Checklist',
                        value: 'checklist'
                    },
                    {
                        icon: <GraduationCapIcon />,
                        label: 'Grade Report',
                        value: 'grades'
                    }
                ]}
                value={activeTab}
                onChange={handleTabChange}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'checklist' && <CurriculumAuditView />}
                {activeTab === 'grades' && <TranscriptView />}
            </div>
        </CommonCard>
    );
}