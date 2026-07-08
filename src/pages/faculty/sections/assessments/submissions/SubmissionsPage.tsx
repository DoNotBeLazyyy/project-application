import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import GradingPanel from '@pages/faculty/sections/assessments/submissions/GradingPanel';
import SubmissionList from '@pages/faculty/sections/assessments/submissions/SubmissionList';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { getSubmissionForGrading, gradeSubmission, listSubmissions } from '@services/assessment.service';
import { GradeAnswerUpdate, SubmissionForGrading, SubmissionListRow } from '@type/assessment.type';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function SubmissionsPage() {
    const { sectionId = '', assessmentId = '' } = useParams<{ sectionId: string; assessmentId: string }>();
    const navigate = useNavigate();

    const [submissions, setSubmissions] = useState<SubmissionListRow[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionForGrading | null>(null);
    const [draftAnswers, setDraftAnswers] = useState<GradeAnswerUpdate[]>([]);
    const [draftFeedback, setDraftFeedback] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(function() {
        if (!assessmentId) return;
        fetchSubmissions();
    }, [assessmentId]);

    async function fetchSubmissions() {
        const result = await listSubmissions(assessmentId);
        if (result.data) setSubmissions(result.data);
    }

    async function handleSelectSubmission(submissionId: string) {
        const result = await getSubmissionForGrading(submissionId);

        if (result.data) {
            setSelectedSubmission(result.data);
            setDraftFeedback(result.data.feedback ?? '');
            setDraftAnswers(
                result.data.answers.map((a) => ({
                    id: a.id,
                    points_earned: a.points_earned ?? 0,
                    grader_notes: a.grader_notes ?? ''
                }))
            );
        }
    }

    async function handleSaveGrade() {
        if (!selectedSubmission) return;
        setIsSaving(true);

        try {
            const result = await gradeSubmission(selectedSubmission.id, draftFeedback, draftAnswers);

            if (!result.error) {
                await fetchSubmissions();
                await handleSelectSubmission(selectedSubmission.id);
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    function handlePointsChange(answerId: string, value: number) {
        setDraftAnswers((prev) =>
            prev.map((a) => a.id === answerId
                ? { ...a, points_earned: value }
                : a));
    }

    function handleNotesChange(answerId: string, value: string) {
        setDraftAnswers((prev) =>
            prev.map((a) => a.id === answerId
                ? { ...a, grader_notes: value }
                : a));
    }

    return (
        <CommonCard className="h-full w-full">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-3 items-center">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                        variant="outlined"
                        onClick={function() {
                            navigate(`/faculty/sections/${sectionId}?tab=assessments`);
                        }}
                    >
                    Back
                    </CommonButton>
                    <div className="flex flex-col">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Submissions
                        </h1>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {submissions.length} submission{submissions.length !== 1
                                ? 's'
                                : ''}
                        </p>
                    </div>
                </div>
                <div className="flex flex-1 gap-4 min-h-0">
                    <SubmissionList
                        submissions={submissions}
                        onSelect={handleSelectSubmission}
                    />
                    {selectedSubmission
                        ? (
                            <GradingPanel
                                draftAnswers={draftAnswers}
                                draftFeedback={draftFeedback}
                                isSaving={isSaving}
                                submission={selectedSubmission}
                                onFeedbackChange={setDraftFeedback}
                                onNotesChange={handleNotesChange}
                                onPointsChange={handlePointsChange}
                                onSave={handleSaveGrade}
                            />
                        )
                        : (
                            <div className="flex flex-1 items-center justify-center">
                                <p className="text-(--mui-palette-text-secondary) text-sm">
                                Select a submission to grade
                                </p>
                            </div>
                        )
                    }
                </div>
            </div>
        </CommonCard>
    );
}