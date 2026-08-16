import CommonCard from '@components/card/CommonCard';
import StudentInsightView from '@pages/shared/analytics/StudentInsightView';

export default function StudentInsight() {
    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <StudentInsightView />
            </div>
        </CommonCard>
    );
}