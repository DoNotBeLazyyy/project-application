import CommonCard from '@components/card/CommonCard';
import CurriculumAuditView from '@pages/shared/records/CurriculumAuditView';

export default function StudentCurriculum() {
    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <CurriculumAuditView />
            </div>
        </CommonCard>
    );
}
