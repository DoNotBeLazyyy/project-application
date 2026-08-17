import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import IntegrityReportView from '@pages/shared/analytics/IntegrityReportView';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useNavigate, useParams } from 'react-router-dom';

export default function IntegrityReportPage() {
    const navigate = useNavigate();
    const { assessmentId = '', sectionId = '' } = useParams<{
        assessmentId: string;
        sectionId: string;
    }>();

    if (!assessmentId || !sectionId) return null;

    return (
        <CommonCard className="flex flex-col gap-4 h-full overflow-y-auto p-4 w-full">
            <div>
                <CommonButton
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} />}
                    variant="text"
                    onClick={function() {
                        navigate(`/faculty/sections/${sectionId}?tab=assessments`);
                    }}
                >
                    Back to Assessments
                </CommonButton>
            </div>
            <IntegrityReportView assessmentId={assessmentId} />
        </CommonCard>
    );
}