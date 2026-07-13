import CommonCard from '@components/card/CommonCard';
import StudentInsightView from '@pages/shared/analytics/StudentInsightView';

export default function StudentInsight() {
    return (
        <CommonCard className="flex flex-col gap-4 h-full overflow-y-auto p-4 w-full">
            <StudentInsightView />
        </CommonCard>
    );
}