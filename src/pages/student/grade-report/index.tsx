import CommonCard from '@components/card/CommonCard';
import TranscriptView from '@pages/shared/records/TranscriptView';

export default function StudentGradeReport() {
    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <TranscriptView />
            </div>
        </CommonCard>
    );
}