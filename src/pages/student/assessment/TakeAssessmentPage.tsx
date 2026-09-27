import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import AssessmentQuestionCard from '@pages/student/assessment/AssessmentQuestionCard';
import AssessmentTimer from '@pages/student/assessment/AssessmentTimer';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import {
    getAssessmentForStudent, getAssessmentQuestionsForStudent, recordFocusEvent, recordHeartbeat, saveStudentAnswer, startAssessmentTimer, submitAssessment
} from '@services/student-portal.service';
import { StudentAssessment, StudentQuestion } from '@type/student-portal.type';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

export default function TakeAssessmentPage() {
    const { enrollmentId = '', assessmentId = '' } = useParams<{
        enrollmentId: string;
        assessmentId: string;
    }>();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
    const [questions, setQuestions] = useState<StudentQuestion[]>([]);
    const [submissionId, setSubmissionId] = useState('');
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const methods = useForm<Record<string, string>>({ defaultValues: {} });

    useEffect(function() {
        async function fetchAssessment() {
            const result = await getAssessmentForStudent(assessmentId, enrollmentId);
            if (result.data) setAssessment(result.data);
        }

        fetchAssessment();
    }, [assessmentId, enrollmentId]);

    useEffect(function() {
        return function() {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        };
    }, []);

    useEffect(function() {
        if (!isStarted || !submissionId) return;

        let isAway = false;

        function reportAway() {
            if (isAway) return;
            isAway = true;
            recordFocusEvent(submissionId, 'Focus Lost');
        }

        function reportBack() {
            if (!isAway) return;
            isAway = false;
            recordFocusEvent(submissionId, 'Focus Restored');
        }

        function handleVisibilityChange() {
            if (document.hidden) {
                reportAway();
            }
            else {
                reportBack();
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', reportAway);
        window.addEventListener('focus', reportBack);

        return function() {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', reportAway);
            window.removeEventListener('focus', reportBack);
        };
    }, [isStarted, submissionId]);

    async function handleStart() {
        const result = await startAssessmentTimer(enrollmentId, assessmentId);

        if (result.data?.submission_id) {
            const subId = result.data.submission_id;
            setSubmissionId(subId);
            setExpiresAt(result.data.expires_at ?? null);

            const questionsResult = await getAssessmentQuestionsForStudent(
                assessmentId,
                enrollmentId,
                subId
            );

            if (questionsResult.data) {
                setQuestions(questionsResult.data);

                const defaults: Record<string, string> = {};
                questionsResult.data.forEach((q) => {
                    defaults[`answer_${q.id}`] = q.saved_answer?.choice_id
                        ?? q.saved_answer?.answer_text
                        ?? '';
                });
                methods.reset(defaults);
            }

            setIsStarted(true);

            heartbeatRef.current = setInterval(async function() {
                await recordHeartbeat(subId);
            }, 30000);
        }
    }

    const handleSaveAnswer = useCallback(async function(questionId: string, value: string) {
        if (!submissionId) return;

        const question = questions.find((q) => q.id === questionId);
        if (!question) return;

        if (question.question_type === 'File Upload') return;

        const isChoice = ['Multiple Choice', 'True or False', 'Matching'].includes(question.question_type);

        await saveStudentAnswer(submissionId, {
            question_id: questionId,
            answer_text: isChoice
                ? ''
                : value,
            choice_id: isChoice
                ? value
                : ''
        });
    }, [submissionId, questions]);

    async function handleSubmit() {
        if (!submissionId) return;

        const values = methods.getValues();
        await Promise.all(
            questions.map((q) => handleSaveAnswer(q.id, values[`answer_${q.id}`] ?? ''))
        );

        setIsSubmitting(true);
        try {
            const result = await submitAssessment(submissionId);
            if (!result.error) {
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                navigate(`/student/subjects/${enrollmentId}/assessments/${assessmentId}/result?submitted=true`);
            }
        }
        finally {
            setIsSubmitting(false);
        }
    }

    const questionsPerPage = assessment?.show_all_questions
        ? questions.length
        : (assessment?.questions_per_page ?? questions.length);

    const totalPages = questionsPerPage > 0
        ? Math.ceil(questions.length / questionsPerPage)
        : 1;

    const visibleQuestions = assessment?.show_all_questions
        ? questions
        : questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);

    const isLastPage = currentPage >= totalPages - 1;

    if (!assessment) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
                <p className="text-(--mui-palette-text-secondary) text-sm">Loading...</p>
            </CommonCard>
        );
    }

    if (!isStarted) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        navigate(`/student/subjects/${enrollmentId}`);
                    }}
                >
                    Back
                </CommonButton>
                <div className="flex flex-1 flex-col gap-4 items-center justify-center">
                    <div className="flex flex-col gap-2 items-center max-w-md text-center">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl md:text-2xl">
                            {assessment.title}
                        </h1>
                        {assessment.description && (
                            <p className="text-(--mui-palette-text-secondary) text-sm">
                                {assessment.description}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-4 justify-center mt-2">
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-(--mui-palette-text-primary)">
                                    {assessment.total_points}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    Total Points
                                </span>
                            </div>
                            {assessment.time_limit_minutes && (
                                <div className="flex flex-col items-center">
                                    <span className="font-semibold text-(--mui-palette-text-primary)">
                                        {assessment.time_limit_minutes} min
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Time Limit
                                    </span>
                                </div>
                            )}
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-(--mui-palette-text-primary)">
                                    {assessment.max_attempts}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    Max Attempts
                                </span>
                            </div>
                            {assessment.due_at && (
                                <div className="flex flex-col items-center">
                                    <span className="font-semibold text-(--mui-palette-text-primary)">
                                        {new Date(assessment.due_at)
                                            .toLocaleString()}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Due
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="max-w-md text-(--mui-palette-text-secondary) text-center text-xs">
                        While this assessment is open, the time you spend away from this tab
                        is recorded and visible to your instructor.
                    </p>
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={handleStart}
                    >
                        Start Assessment
                    </CommonButton>
                </div>
            </CommonCard>
        );
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex flex-wrap gap-2 items-center justify-between shrink-0">
                <h1 className="font-semibold min-w-0 text-(--mui-palette-text-primary) text-lg">
                    {assessment.title}
                </h1>
                <div className="flex gap-3 items-center shrink-0">
                    {!assessment.show_all_questions && (
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            Page {currentPage + 1} of {totalPages}
                        </span>
                    )}
                    <AssessmentTimer
                        expiresAt={expiresAt}
                        onExpire={handleSubmit}
                    />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 min-h-0 overflow-y-auto">
                {visibleQuestions.map((question, index) => (
                    <AssessmentQuestionCard
                        control={methods.control}
                        index={assessment.show_all_questions
                            ? index
                            : currentPage * questionsPerPage + index}
                        key={question.id}
                        question={question}
                        submissionId={submissionId}
                    />
                ))}
            </div>
            <div className="flex flex-col gap-2 justify-between shrink-0 sm:flex-row">
                {!assessment.show_all_questions && (
                    <CommonButton
                        color="inherit"
                        disabled={currentPage === 0}
                        size="small"
                        startIcon={<ArrowLeftIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={async function() {
                            const values = methods.getValues();
                            await Promise.all(
                                visibleQuestions.map((q) =>
                                    handleSaveAnswer(q.id, values[`answer_${q.id}`] ?? ''))
                            );
                            setCurrentPage((prev) => prev - 1);
                        }}
                    >
                        Previous
                    </CommonButton>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:ml-auto">
                    {!assessment.show_all_questions && !isLastPage && (
                        <CommonButton
                            endIcon={<ArrowRightIcon size={14} weight="bold" />}
                            size="small"
                            variant="outlined"
                            onClick={async function() {
                                const values = methods.getValues();
                                await Promise.all(
                                    visibleQuestions.map((q) =>
                                        handleSaveAnswer(q.id, values[`answer_${q.id}`] ?? ''))
                                );
                                setCurrentPage((prev) => prev + 1);
                            }}
                        >
                            Next
                        </CommonButton>
                    )}
                    {(assessment.show_all_questions || isLastPage) && (
                        <CommonButton
                            disabled={isSubmitting}
                            size="small"
                            variant="contained"
                            onClick={handleSubmit}
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Submit'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonCard>
    );
}