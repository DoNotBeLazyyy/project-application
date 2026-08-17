import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import GradingPanel from '@pages/faculty/sections/assessments/submissions/GradingPanel';
import RubricGradingPanel from '@pages/faculty/sections/assessments/submissions/RubricGradingPanel';
import SubmissionList from '@pages/faculty/sections/assessments/submissions/SubmissionList';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { getSubmissionForGrading, gradeSubmission, listSubmissions } from '@services/assessment.service';
import { getSubmissionRubric, gradeSubmissionRubric } from '@services/rubric.service';
import { GradeAnswerUpdate, SubmissionForGrading, SubmissionListRow } from '@type/assessment.type';
import { RubricEvaluationInput, SubmissionRubric } from '@type/rubric.type';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function buildGradeDraftKey(
    feedback: string,
    answers: GradeAnswerUpdate[],
    evaluations: RubricEvaluationInput[]
): string {
    return JSON.stringify({ answers, evaluations, feedback });
}

export default function SubmissionsPage() {
    const { sectionId = '', assessmentId = '' } = useParams<{ sectionId: string; assessmentId: string }>();
    const navigate = useNavigate();

    const [submissions, setSubmissions] = useState<SubmissionListRow[]>([]);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionForGrading | null>(null);
    const [draftAnswers, setDraftAnswers] = useState<GradeAnswerUpdate[]>([]);
    const [rubric, setRubric] = useState<SubmissionRubric | null>(null);
    const [draftEvaluations, setDraftEvaluations] = useState<RubricEvaluationInput[]>([]);
    const [draftFeedback, setDraftFeedback] = useState('');
    const [savedGradeDraft, setSavedGradeDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isGradeDirty = buildGradeDraftKey(draftFeedback, draftAnswers, draftEvaluations)
        !== savedGradeDraft;

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

        if (!result.data) return;

        const feedback = result.data.feedback ?? '';
        const answers = result.data.answers.map((a) => ({
            id: a.id,
            points_earned: a.points_earned ?? 0,
            grader_notes: a.grader_notes ?? ''
        }));

        setSelectedSubmission(result.data);
        setDraftFeedback(feedback);
        setDraftAnswers(answers);

        if (!result.data.use_rubric_scoring) {
            setRubric(null);
            setDraftEvaluations([]);
            setSavedGradeDraft(buildGradeDraftKey(feedback, answers, []));

            return;
        }

        const rubricResult = await getSubmissionRubric(submissionId);
        const evaluations = rubricResult.data
            ? rubricResult.data.criteria.map((c) => ({
                criteria_id: c.id,
                points_earned: c.points_earned ?? 0,
                feedback: c.feedback ?? ''
            }))
            : [];

        if (rubricResult.data) {
            setRubric(rubricResult.data);
        }

        setDraftEvaluations(evaluations);
        setSavedGradeDraft(buildGradeDraftKey(feedback, answers, evaluations));
    }

    async function handleSaveGrade() {
        if (!selectedSubmission) return;
        setIsSaving(true);

        try {
            const result = selectedSubmission.use_rubric_scoring
                ? await gradeSubmissionRubric(selectedSubmission.id, draftFeedback, draftEvaluations)
                : await gradeSubmission(selectedSubmission.id, draftFeedback, draftAnswers);

            if (!result.error) {
                await fetchSubmissions();
                await handleSelectSubmission(selectedSubmission.id);
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    function handleRubricPointsChange(criteriaId: string, value: number) {
        setDraftEvaluations((prev) =>
            prev.map((e) => e.criteria_id === criteriaId
                ? { ...e, points_earned: value }
                : e));
    }

    function handleRubricFeedbackChange(criteriaId: string, value: string) {
        setDraftEvaluations((prev) =>
            prev.map((e) => e.criteria_id === criteriaId
                ? { ...e, feedback: value }
                : e));
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
                    {selectedSubmission && selectedSubmission.use_rubric_scoring && rubric
                        ? (
                            <RubricGradingPanel
                                draftEvaluations={draftEvaluations}
                                draftFeedback={draftFeedback}
                                isDirty={isGradeDirty}
                                isSaving={isSaving}
                                rubric={rubric}
                                onEvaluationFeedbackChange={handleRubricFeedbackChange}
                                onFeedbackChange={setDraftFeedback}
                                onPointsChange={handleRubricPointsChange}
                                onSave={handleSaveGrade}
                            />
                        )
                        : selectedSubmission
                            ? (
                                <GradingPanel
                                    draftAnswers={draftAnswers}
                                    draftFeedback={draftFeedback}
                                    isDirty={isGradeDirty}
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