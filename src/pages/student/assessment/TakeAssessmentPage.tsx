import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import AssessmentQuestionCard from '@pages/student/assessment/AssessmentQuestionCard';
import AssessmentTimer from '@pages/student/assessment/AssessmentTimer';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDotsIcon,
    ClockIcon,
    ExamIcon,
    EyeIcon,
    PlayIcon,
    ShieldCheckIcon,
    TrophyIcon
} from '@phosphor-icons/react';
import {
    getAssessmentForStudent,
    getAssessmentQuestionsForStudent,
    recordFocusEvent,
    recordHeartbeat,
    saveStudentAnswer,
    startAssessmentTimer,
    submitAssessment
} from '@services/student-portal.service';
import { StudentAssessment, StudentQuestion } from '@type/student-portal.type';
import { DEFAULT_FORM_OPTIONS } from '@utils/form.util';
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

    const methods = useForm<Record<string, string>>({ ...DEFAULT_FORM_OPTIONS, defaultValues: {} });

    useEffect(function() {
        async function fetchAssessment() {
            const result = await getAssessmentForStudent(assessmentId, enrollmentId);
            if (result.data) {
                setAssessment(result.data);
                const canonicalEnrollmentId = result.data.enrollment_id || enrollmentId;
                if (result.data.enrollment_id && result.data.enrollment_id !== enrollmentId) {
                    navigate(`/student/subjects/${result.data.enrollment_id}/assessments/${assessmentId}`, { replace: true });
                }
                const used = result.data.attempts_used ?? 0;
                const max = result.data.max_attempts ?? 1;
                if (used >= max && !result.data.has_active_submission) {
                    navigate(`/student/subjects/${canonicalEnrollmentId}/assessments/${assessmentId}/result?already_submitted=true`, { replace: true });
                }
            }
        }

        fetchAssessment();
    }, [assessmentId, enrollmentId, navigate]);

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
            setIsStarted(true);

            heartbeatRef.current = setInterval(function() {
                recordHeartbeat(subId);
            }, 30000);

            const qResult = await getAssessmentQuestionsForStudent(
                assessmentId,
                enrollmentId,
                subId
            );
            if (qResult.data) {
                setQuestions(qResult.data);
                const initialValues: Record<string, string> = {};
                qResult.data.forEach((q) => {
                    const isChoice = ['Multiple Choice', 'True or False', 'Matching'].includes(q.question_type);
                    initialValues[`answer_${q.id}`] = isChoice
                        ? (q.saved_answer?.choice_id ?? '')
                        : (q.saved_answer?.answer_text ?? '');
                });
                methods.reset(initialValues);
            }
        }
    }

    const handleSaveAnswer = useCallback(
        async function(questionId: string, value: string) {
            if (!submissionId) return;

            const question = questions.find((q) => q.id === questionId);
            if (!question || question.question_type === 'File Upload') return;

            const isChoice = ['Multiple Choice', 'True or False', 'Matching'].includes(question.question_type);

            await saveStudentAnswer(submissionId, {
                question_id: questionId,
                answer_text: isChoice ? '' : value,
                choice_id: isChoice ? value : ''
            });
        },
        [submissionId, questions]
    );

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
                navigate(`/student/subjects/${assessment?.enrollment_id || enrollmentId}/assessments/${assessmentId}/result?submitted=true`);
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
            <CommonCard className="flex flex-col gap-4 h-full p-6 w-full items-center justify-center">
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading assessment…</div>
            </CommonCard>
        );
    }

    // Assessment Preparation Lobby
    if (!isStarted) {
        const attemptsUsed = assessment.attempts_used ?? 0;
        const maxAttempts = assessment.max_attempts ?? 1;
        const isMaxedOut = attemptsUsed >= maxAttempts && !assessment.has_active_submission;

        return (
            <CommonCard className="flex flex-col gap-6 h-full p-4 sm:p-8 w-full max-w-4xl mx-auto shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                        variant="outlined"
                        onClick={function() {
                            navigate(`/student/subjects/${assessment?.enrollment_id || enrollmentId}?tab=assessments`);
                        }}
                    >
                        Back to Subject
                    </CommonButton>
                    <CommonBadgeStatus
                        label={assessment.has_active_submission ? 'In Progress' : 'Ready to Take'}
                        variant={assessment.has_active_submission ? 'warning' : 'info'}
                    />
                </div>

                <div className="flex flex-col items-center text-center gap-6 py-4">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
                        <ExamIcon size={36} weight="duotone" />
                    </div>

                    <div className="flex flex-col gap-2 max-w-xl">
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-2xl sm:text-3xl tracking-tight">
                            {assessment.title}
                        </h1>
                        {assessment.description ? (
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                {assessment.description}
                            </p>
                        ) : (
                            <p className="text-slate-400 text-xs italic">
                                Please review the assessment guidelines below before starting.
                            </p>
                        )}
                    </div>

                    {/* Metric Badges Grid */}
                    <div className="gap-3 sm:gap-4 grid grid-cols-2 sm:grid-cols-4 w-full">
                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <TrophyIcon size={20} className="text-amber-500" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {assessment.total_points} pts
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Total Points</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <ClockIcon size={20} className="text-blue-500" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {assessment.time_limit_minutes ? `${assessment.time_limit_minutes} min` : 'Untimed'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Time Limit</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <ShieldCheckIcon size={20} className="text-purple-500" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {attemptsUsed} / {maxAttempts}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Attempts Used</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <CalendarDotsIcon size={20} className="text-emerald-500" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mt-0.5 truncate">
                                {assessment.due_at ? new Date(assessment.due_at).toLocaleDateString() : 'No Deadline'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Due Date</span>
                        </div>
                    </div>

                    {/* Proctoring Integrity Notice */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3 text-left w-full max-w-xl">
                        <EyeIcon size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Focus Tracking Enabled</span>
                            <span>
                                While taking this assessment, switching browser tabs or leaving the screen is recorded and made visible in your submission logs.
                            </span>
                        </div>
                    </div>

                    {/* Action CTA */}
                    {isMaxedOut ? (
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                You have used all available attempts ({attemptsUsed} of {maxAttempts}).
                            </span>
                            <CommonButton
                                size="medium"
                                variant="contained"
                                onClick={function() {
                                    navigate(`/student/subjects/${assessment?.enrollment_id || enrollmentId}/assessments/${assessmentId}/result`);
                                }}
                            >
                                View Assessment Results
                            </CommonButton>
                        </div>
                    ) : (
                        <CommonButton
                            className="px-8 py-2.5 text-base font-semibold shadow-md"
                            color="primary"
                            size="medium"
                            startIcon={<PlayIcon size={18} weight="bold" />}
                            variant="contained"
                            onClick={handleStart}
                        >
                            {assessment.has_active_submission ? 'Resume Assessment' : 'Start Assessment Now'}
                        </CommonButton>
                    )}
                </div>
            </CommonCard>
        );
    }

    // Active Assessment Session
    return (
        <CommonCard className="flex flex-col gap-5 h-full p-4 sm:p-6 w-full">
            {/* Active Test Sticky Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex flex-col min-w-0">
                    <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl truncate tracking-tight">
                        {assessment.title}
                    </h1>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        Total {questions.length} Questions {!assessment.show_all_questions && `· Page ${currentPage + 1} of ${totalPages}`}
                    </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <AssessmentTimer
                        expiresAt={expiresAt}
                        onExpire={handleSubmit}
                    />
                </div>
            </div>

            {/* Questions Container */}
            <div className="flex flex-1 flex-col gap-4 min-h-0 overflow-y-auto pr-1">
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

            {/* Bottom Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
                {!assessment.show_all_questions && (
                    <CommonButton
                        color="inherit"
                        disabled={currentPage === 0 || isSubmitting}
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
                        Previous Page
                    </CommonButton>
                )}
                <div className="flex items-center gap-2.5 sm:ml-auto w-full sm:w-auto justify-end">
                    {!assessment.show_all_questions && !isLastPage && (
                        <CommonButton
                            disabled={isSubmitting}
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
                            Next Page
                        </CommonButton>
                    )}
                    {(assessment.show_all_questions || isLastPage) && (
                        <CommonButton
                            color="primary"
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            size="medium"
                            variant="contained"
                            onClick={handleSubmit}
                        >
                            {isSubmitting ? 'Submitting Responses...' : 'Finish & Submit Assessment'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonCard>
    );
}
