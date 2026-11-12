import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonEmptyState from '@components/empty/CommonEmptyState';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
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
    TrophyIcon,
    WarningCircleIcon
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
import { useToastStore } from '@stores/toast.store';
import { StudentAssessment, StudentQuestion } from '@type/student-portal.type';
import { DEFAULT_FORM_OPTIONS } from '@utils/form.util';
import { holdIdleTimeout, releaseIdleTimeout } from '@utils/session.util';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

const REQUIRED_ANSWER_MESSAGE = 'This question is required.';
const CHOICE_TYPES = ['Multiple Choice', 'True or False', 'Matching'];
const TEXT_SAVE_DELAY_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 30000;
const SAVE_FAILED_MESSAGE = 'Some answers could not be saved, so the assessment was not submitted. Your answers are still on this page. Check your connection and try again.';
const PAGE_SAVE_FAILED_MESSAGE = 'Some answers on this page could not be saved. Check your connection and try again.';
const TIME_UP_MESSAGE = 'Time is up. Your saved answers were submitted automatically.';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Tells whether a heartbeat or submit error means the attempt has already ended on the server.
 */
function isAttemptEndedMessage(message: string): boolean {
    return /expired|no longer active|not in a submittable state/i.test(message);
}

/**
 * Tells whether an attempt with this expiry time has already run out.
 */
function isPastExpiry(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return false;

    return new Date(expiresAt)
        .getTime() <= Date.now();
}

/**
 * Tells whether the assessment window is open right now.
 */
function isWindowOpen(assessment: StudentAssessment): boolean {
    const now = Date.now();
    const hasOpened = !assessment.opens_at || new Date(assessment.opens_at)
        .getTime() <= now;
    const hasClosed = Boolean(assessment.closes_at) && new Date(assessment.closes_at ?? '')
        .getTime() < now;

    return hasOpened && !hasClosed;
}

interface SaveIndicatorProps {
    status: SaveStatus;
}

/**
 * Small "Saving / Saved / Not saved" label shown next to the timer.
 */
function SaveIndicator({ status }: SaveIndicatorProps) {
    if (status === 'idle') return null;

    const labels: Record<Exclude<SaveStatus, 'idle'>, string> = {
        error: 'Not saved',
        saved: 'All answers saved',
        saving: 'Saving…'
    };
    const colors: Record<Exclude<SaveStatus, 'idle'>, string> = {
        error: 'text-rose-600 dark:text-rose-400',
        saved: 'text-emerald-600 dark:text-emerald-400',
        saving: 'text-slate-500 dark:text-slate-400'
    };

    return (
        <span
            aria-live="polite"
            className={`font-medium text-xs ${colors[status]}`}
        >
            {labels[status]}
        </span>
    );
}

export default function TakeAssessmentPage() {
    const { enrollmentId = '', assessmentId = '' } = useParams<{
        enrollmentId: string;
        assessmentId: string;
    }>();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState<StudentAssessment | null>(null);
    const [isLoadFailed, setIsLoadFailed] = useState(false);
    const [loadKey, setLoadKey] = useState(0);
    const [questions, setQuestions] = useState<StudentQuestion[]>([]);
    const [isQuestionsFailed, setIsQuestionsFailed] = useState(false);
    const [submissionId, setSubmissionId] = useState('');
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Question ids whose latest value has not reached the server yet
    const dirtyIdsRef = useRef<Set<string>>(new Set());
    const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const pendingSavesRef = useRef(0);
    const hasShownTimeUpRef = useRef(false);

    const methods = useForm<Record<string, string>>({ ...DEFAULT_FORM_OPTIONS, defaultValues: {} });

    const subjectPath = `/student/subjects/${assessment?.enrollment_id || enrollmentId}`;
    const resultPath = `${subjectPath}/assessments/${assessmentId}/result`;

    useEffect(function() {
        let isCurrent = true;

        async function fetchAssessment() {
            setIsLoadFailed(false);
            const result = await getAssessmentForStudent(assessmentId, enrollmentId);
            if (!isCurrent) return;

            if (!result.data) {
                setIsLoadFailed(true);
                return;
            }

            const data: StudentAssessment = result.data;
            setAssessment(data);
            const canonicalEnrollmentId = data.enrollment_id || enrollmentId;
            if (data.enrollment_id && data.enrollment_id !== enrollmentId) {
                navigate(`/student/subjects/${data.enrollment_id}/assessments/${assessmentId}`, { replace: true });
            }
            const used = data.attempts_used ?? 0;
            const max = data.max_attempts ?? 1;
            if (used >= max && !data.has_active_submission && !data.expired_attempt_auto_submitted) {
                navigate(`/student/subjects/${canonicalEnrollmentId}/assessments/${assessmentId}/result?already_submitted=true`, { replace: true });
            }
        }

        fetchAssessment();

        return function() {
            isCurrent = false;
        };
    }, [assessmentId, enrollmentId, navigate, loadKey]);

    useEffect(function() {
        const saveTimers = saveTimersRef.current;

        return function() {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            saveTimers.forEach(clearTimeout);
        };
    }, []);

    // A student reading a question without touching anything is not signed out mid-attempt
    useEffect(function() {
        if (!isStarted || isTimeUp) return;

        holdIdleTimeout(expiresAt
            ? new Date(expiresAt)
                .getTime()
            : undefined);

        return function() {
            releaseIdleTimeout();
        };
    }, [expiresAt, isStarted, isTimeUp]);

    // Warn before leaving the page while answers are still unsaved
    useEffect(function() {
        if (!isStarted || isTimeUp) return;

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            if (dirtyIdsRef.current.size === 0 && pendingSavesRef.current === 0) return;
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);

        return function() {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isStarted, isTimeUp]);

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

    /**
     * Stops the heartbeat and pending saves, and shows the time-up screen with one message.
     */
    const handleAttemptEnded = useCallback(function() {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
        saveTimersRef.current.forEach(clearTimeout);
        saveTimersRef.current.clear();
        dirtyIdsRef.current.clear();
        setIsConfirmSubmitOpen(false);
        setIsTimeUp(true);

        if (!hasShownTimeUpRef.current) {
            hasShownTimeUpRef.current = true;
            useToastStore.getState()
                .showToast(TIME_UP_MESSAGE, 'warning');
        }
    }, []);

    /**
     * Loads the questions of the started attempt and fills in any saved answers.
     */
    async function loadQuestions(subId: string) {
        setIsQuestionsFailed(false);
        const qResult = await getAssessmentQuestionsForStudent(assessmentId, enrollmentId, subId);

        if (!qResult.data || qResult.data.length === 0) {
            setIsQuestionsFailed(true);
            return;
        }

        setQuestions(qResult.data);
        const initialValues: Record<string, string> = {};
        qResult.data.forEach((q) => {
            const isChoice = CHOICE_TYPES.includes(q.question_type);
            initialValues[`answer_${q.id}`] = isChoice
                ? (q.saved_answer?.choice_id ?? '')
                : (q.saved_answer?.answer_text ?? '');
        });
        methods.reset(initialValues);
    }

    async function handleStart() {
        if (isStarting || !assessment) return;

        setIsStarting(true);
        try {
            const hadActiveAttempt = Boolean(assessment.has_active_submission);
            const result = await startAssessmentTimer(enrollmentId, assessmentId);

            if (!result.data?.submission_id) return;

            const subId = result.data.submission_id;
            // The server ended the old attempt because its time ran out, then started a new one
            if (hadActiveAttempt && result.data.is_resumed === false) {
                useToastStore.getState()
                    .showToast('Your previous attempt ran out of time and was submitted automatically. This is a new attempt.', 'warning');
            }

            setSubmissionId(subId);
            setExpiresAt(result.data.expires_at ?? null);
            setIsStarted(true);

            heartbeatRef.current = setInterval(async function() {
                const heartbeat = await recordHeartbeat(subId);
                if (heartbeat.error && isAttemptEndedMessage(heartbeat.error.message)) {
                    handleAttemptEnded();
                }
            }, HEARTBEAT_INTERVAL_MS);

            await loadQuestions(subId);
        }
        finally {
            setIsStarting(false);
        }
    }

    const handleSaveAnswer = useCallback(
        async function(questionId: string, value: string): Promise<string | null> {
            if (!submissionId) return null;

            const question = questions.find((q) => q.id === questionId);
            if (!question || question.question_type === 'File Upload') return null;

            const isChoice = CHOICE_TYPES.includes(question.question_type);

            const result = await saveStudentAnswer(submissionId, {
                question_id: questionId,
                answer_text: isChoice
                    ? ''
                    : value,
                choice_id: isChoice
                    ? value
                    : ''
            });

            return result.error?.message ?? null;
        },
        [submissionId, questions]
    );

    /**
     * Saves the current value of one question and keeps the save indicator up to date.
     * Returns the error message when the save failed.
     */
    const saveQuestion = useCallback(
        async function(questionId: string): Promise<string | null> {
            const pendingTimer = saveTimersRef.current.get(questionId);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                saveTimersRef.current.delete(questionId);
            }

            const value = methods.getValues(`answer_${questionId}`) ?? '';
            dirtyIdsRef.current.delete(questionId);
            pendingSavesRef.current += 1;
            setSaveStatus('saving');

            const error = await handleSaveAnswer(questionId, value);
            pendingSavesRef.current -= 1;

            if (error) {
                dirtyIdsRef.current.add(questionId);
                setSaveStatus('error');
                return error;
            }

            if (pendingSavesRef.current === 0) {
                setSaveStatus(function(previous) {
                    if (dirtyIdsRef.current.size > 0) {
                        return previous === 'error'
                            ? 'error'
                            : 'saving';
                    }
                    return 'saved';
                });
            }
            return null;
        },
        [handleSaveAnswer, methods]
    );

    // Autosave: a picked choice saves at once, a typed answer 1.5 s after typing stops
    useEffect(function() {
        if (!isStarted || questions.length === 0) return;

        const subscription = methods.watch(function(_values, { name }) {
            if (!name?.startsWith('answer_')) return;

            const questionId = name.slice('answer_'.length);
            const question = questions.find((q) => q.id === questionId);
            if (!question || question.question_type === 'File Upload') return;

            dirtyIdsRef.current.add(questionId);
            setSaveStatus('saving');

            const pendingTimer = saveTimersRef.current.get(questionId);
            if (pendingTimer) clearTimeout(pendingTimer);

            if (CHOICE_TYPES.includes(question.question_type)) {
                saveQuestion(questionId);
                return;
            }

            saveTimersRef.current.set(questionId, setTimeout(function() {
                saveQuestion(questionId);
            }, TEXT_SAVE_DELAY_MS));
        });

        return function() {
            subscription.unsubscribe();
        };
    }, [isStarted, questions, methods, saveQuestion]);

    /**
     * Saves the given questions now. Returns false and shows one error when any save failed.
     */
    async function saveAnswers(targets: StudentQuestion[], failureMessage: string): Promise<boolean> {
        const errors = await Promise.all(targets.map((q) => saveQuestion(q.id)));
        const hasFailed = errors.some(Boolean);

        if (hasFailed) {
            useToastStore.getState()
                .showToast(failureMessage, 'error');
        }

        return !hasFailed;
    }

    // Flags every unanswered required question and jumps to the first one's page.
    function validateRequiredAnswers(): boolean {
        const values = methods.getValues();
        const missing = questions.filter(function(q) {
            return q.is_required
                && q.question_type !== 'File Upload'
                && !String(values[`answer_${q.id}`] ?? '')
                    .trim();
        });

        if (missing.length === 0) return true;

        missing.forEach(function(q) {
            methods.setError(`answer_${q.id}`, { message: REQUIRED_ANSWER_MESSAGE, type: 'required' });
        });

        if (!assessment?.show_all_questions && questionsPerPage > 0) {
            setCurrentPage(Math.floor(questions.indexOf(missing[0]) / questionsPerPage));
        }

        useToastStore.getState()
            .showToast(`Answer all required questions before submitting (${missing.length} remaining).`, 'error');

        return false;
    }

    async function handleSubmit(isAutoSubmit: boolean) {
        if (!submissionId || isSubmitting || isTimeUp) return;
        // Never send an empty attempt when the questions did not load
        if (questions.length === 0) return;

        if (!isAutoSubmit && !validateRequiredAnswers()) return;

        setIsSubmitting(true);
        try {
            const isAllSaved = await saveAnswers(questions, SAVE_FAILED_MESSAGE);
            // A failed save would be graded as a blank answer, so keep the student here
            if (!isAllSaved) return;

            const result = await submitAssessment(submissionId);
            if (!result.error) {
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                dirtyIdsRef.current.clear();
                navigate(`${resultPath}?submitted=true`);
                return;
            }

            if (isAutoSubmit || isAttemptEndedMessage(result.error.message)) {
                handleAttemptEnded();
            }
        }
        finally {
            setIsSubmitting(false);
        }
    }

    /**
     * Moves to another page of questions after saving the visible ones.
     */
    async function handleChangePage(step: number) {
        const isSaved = await saveAnswers(visibleQuestions, PAGE_SAVE_FAILED_MESSAGE);
        if (!isSaved) return;

        setCurrentPage((prev) => prev + step);
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

    if (isLoadFailed) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-6 w-full items-center justify-center">
                <CommonEmptyState
                    action={(
                        <div className="flex flex-wrap gap-2 justify-center">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={function() {
                                    navigate(`${subjectPath}?tab=assessments`);
                                }}
                            >
                                Back to Subject
                            </CommonButton>
                            <CommonButton
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    setLoadKey((key) => key + 1);
                                }}
                            >
                                Try Again
                            </CommonButton>
                        </div>
                    )}
                    description="The assessment could not be loaded. Check your connection and try again."
                    icon={(
                        <WarningCircleIcon
                            size={48}
                            weight="duotone"
                        />
                    )}
                    title="Assessment not available"
                />
            </CommonCard>
        );
    }

    if (!assessment) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-6 w-full items-center justify-center">
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">Loading assessment…</div>
            </CommonCard>
        );
    }

    if (isTimeUp) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-6 w-full items-center justify-center">
                <CommonEmptyState
                    action={(
                        <CommonButton
                            size="small"
                            variant="contained"
                            onClick={function() {
                                navigate(resultPath);
                            }}
                        >
                            View Result
                        </CommonButton>
                    )}
                    description="Your saved answers were submitted automatically when the time limit ended."
                    icon={(
                        <ClockIcon
                            size={48}
                            weight="duotone"
                        />
                    )}
                    title="Time is up"
                />
            </CommonCard>
        );
    }

    // Assessment Preparation Lobby
    if (!isStarted) {
        const attemptsUsed = assessment.attempts_used ?? 0;
        const maxAttempts = assessment.max_attempts ?? 1;
        const isMaxedOut = attemptsUsed >= maxAttempts && !assessment.has_active_submission;
        // An attempt whose time ran out cannot be resumed; the server submits it when asked
        const isActiveAttemptExpired = Boolean(assessment.has_active_submission)
            && isPastExpiry(assessment.active_submission_expires_at);
        const wasAutoSubmitted = Boolean(assessment.expired_attempt_auto_submitted) || isActiveAttemptExpired;
        // The expired attempt counts once the server submits it
        const finishedAttempts = attemptsUsed + (isActiveAttemptExpired
            ? 1
            : 0);
        const canRetake = finishedAttempts < maxAttempts && isWindowOpen(assessment);
        const startLabel = assessment.has_active_submission && !isActiveAttemptExpired
            ? 'Resume Assessment'
            : wasAutoSubmitted || attemptsUsed > 0
                ? `Retake (attempt ${finishedAttempts + 1} of ${maxAttempts})`
                : 'Start Assessment Now';

        return (
            <CommonCard className="flex flex-col gap-6 h-full p-4 sm:p-8 w-full max-w-4xl mx-auto shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={(
                            <ArrowLeftIcon
                                size={16}
                                weight="bold"
                            />
                        )}
                        variant="outlined"
                        onClick={function() {
                            navigate(`${subjectPath}?tab=assessments`);
                        }}
                    >
                        Back to Subject
                    </CommonButton>
                    <CommonBadgeStatus
                        label={assessment.has_active_submission && !isActiveAttemptExpired
                            ? 'In Progress'
                            : 'Ready to Take'}
                        variant={assessment.has_active_submission && !isActiveAttemptExpired
                            ? 'warning'
                            : 'info'}
                    />
                </div>

                <div className="flex flex-col items-center text-center gap-6 py-4">
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
                        <ExamIcon
                            size={36}
                            weight="duotone"
                        />
                    </div>

                    <div className="flex flex-col gap-2 max-w-xl">
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-2xl sm:text-3xl tracking-tight">
                            {assessment.title}
                        </h1>
                        {assessment.description
                            ? (
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    {assessment.description}
                                </p>
                            )
                            : (
                                <p className="text-slate-400 text-xs italic">
                                Please review the assessment guidelines below before starting.
                                </p>
                            )}
                    </div>

                    {wasAutoSubmitted && (
                        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3 text-left w-full max-w-xl">
                            <ClockIcon
                                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                                size={22}
                            />
                            <div className="flex flex-col gap-1 text-xs text-amber-900 dark:text-amber-200">
                                <span className="font-bold">Your last attempt ran out of time</span>
                                <span>
                                    It was submitted automatically with the answers you saved. You can view its result
                                    {canRetake
                                        ? ' or start a new attempt.'
                                        : '.'}
                                </span>
                                <CommonButton
                                    className="self-start"
                                    size="small"
                                    variant="outlined"
                                    onClick={function() {
                                        navigate(resultPath);
                                    }}
                                >
                                    View Result
                                </CommonButton>
                            </div>
                        </div>
                    )}

                    {/* Metric Badges Grid */}
                    <div className="gap-3 sm:gap-4 grid grid-cols-2 sm:grid-cols-4 w-full">
                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <TrophyIcon
                                className="text-amber-500"
                                size={20}
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {assessment.total_points} pts
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Total Points</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <ClockIcon
                                className="text-blue-500"
                                size={20}
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {assessment.time_limit_minutes
                                    ? `${assessment.time_limit_minutes} min`
                                    : 'Untimed'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Time Limit</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <ShieldCheckIcon
                                className="text-purple-500"
                                size={20}
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                                {attemptsUsed} / {maxAttempts}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Attempts Used</span>
                        </div>

                        <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col items-center gap-1 shadow-2xs">
                            <CalendarDotsIcon
                                className="text-emerald-500"
                                size={20}
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mt-0.5 truncate">
                                {assessment.due_at
                                    ? new Date(assessment.due_at)
                                        .toLocaleDateString()
                                    : 'No Deadline'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Due Date</span>
                        </div>
                    </div>

                    {/* Proctoring Integrity Notice */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3 text-left w-full max-w-xl">
                        <EyeIcon
                            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                            size={22}
                        />
                        <div className="flex flex-col gap-0.5 text-xs text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Focus Tracking Enabled</span>
                            <span>
                                While taking this assessment, switching browser tabs or leaving the screen is recorded and made visible in your submission logs.
                            </span>
                        </div>
                    </div>

                    {/* Action CTA */}
                    {isMaxedOut
                        ? (
                            <div className="flex flex-col items-center gap-3">
                                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                                You have used all available attempts ({attemptsUsed} of {maxAttempts}).
                                </span>
                                <CommonButton
                                    size="medium"
                                    variant="contained"
                                    onClick={function() {
                                        navigate(resultPath);
                                    }}
                                >
                                View Assessment Results
                                </CommonButton>
                            </div>
                        )
                        : (
                            <CommonButton
                                className="px-8 py-2.5 text-base font-semibold shadow-md"
                                color="primary"
                                disabled={isStarting || (isActiveAttemptExpired && !canRetake)}
                                loading={isStarting}
                                size="medium"
                                startIcon={(
                                    <PlayIcon
                                        size={18}
                                        weight="bold"
                                    />
                                )}
                                variant="contained"
                                onClick={handleStart}
                            >
                                {startLabel}
                            </CommonButton>
                        )}
                </div>
            </CommonCard>
        );
    }

    if (isQuestionsFailed) {
        return (
            <CommonCard className="flex flex-col gap-4 h-full p-6 w-full items-center justify-center">
                <CommonEmptyState
                    action={(
                        <CommonButton
                            size="small"
                            variant="contained"
                            onClick={function() {
                                loadQuestions(submissionId);
                            }}
                        >
                            Load Questions Again
                        </CommonButton>
                    )}
                    description="The questions could not be loaded, so nothing can be submitted yet. Your attempt has started; try loading the questions again."
                    icon={(
                        <WarningCircleIcon
                            size={48}
                            weight="duotone"
                        />
                    )}
                    title="Questions not loaded"
                />
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
                    <SaveIndicator status={saveStatus} />
                    <AssessmentTimer
                        expiresAt={expiresAt}
                        onExpire={function() {
                            handleSubmit(true);
                        }}
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
                        startIcon={(
                            <ArrowLeftIcon
                                size={14}
                                weight="bold"
                            />
                        )}
                        variant="outlined"
                        onClick={function() {
                            handleChangePage(-1);
                        }}
                    >
                        Previous Page
                    </CommonButton>
                )}
                <div className="flex items-center gap-2.5 sm:ml-auto w-full sm:w-auto justify-end">
                    {!assessment.show_all_questions && !isLastPage && (
                        <CommonButton
                            disabled={isSubmitting}
                            endIcon={(
                                <ArrowRightIcon
                                    size={14}
                                    weight="bold"
                                />
                            )}
                            size="small"
                            variant="outlined"
                            onClick={async function() {
                                const isPageValid = await methods.trigger(
                                    visibleQuestions.map((q) => `answer_${q.id}`)
                                );
                                if (!isPageValid) return;

                                await handleChangePage(1);
                            }}
                        >
                            Next Page
                        </CommonButton>
                    )}
                    {(assessment.show_all_questions || isLastPage) && (
                        <CommonButton
                            color="primary"
                            disabled={isSubmitting || questions.length === 0}
                            loading={isSubmitting}
                            size="medium"
                            variant="contained"
                            onClick={function() {
                                // Final submission can't be undone, so check answers first and then confirm
                                if (validateRequiredAnswers()) setIsConfirmSubmitOpen(true);
                            }}
                        >
                            {isSubmitting
                                ? 'Submitting Responses...'
                                : 'Finish & Submit Assessment'}
                        </CommonButton>
                    )}
                </div>
            </div>

            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Keep Reviewing',
                        disabled: isSubmitting,
                        onClick: () => setIsConfirmSubmitOpen(false)
                    },
                    confirmProps: {
                        children: isSubmitting
                            ? 'Submitting...'
                            : 'Submit Assessment',
                        disabled: isSubmitting,
                        loading: isSubmitting,
                        onClick: async function() {
                            await handleSubmit(false);
                            setIsConfirmSubmitOpen(false);
                        }
                    }
                }}
                mainContent={{ title: 'Submit your answers?' }}
                open={isConfirmSubmitOpen}
                subContent={{ title: 'Once submitted, you can no longer change your answers for this attempt.' }}
                onClose={() => setIsConfirmSubmitOpen(false)}
            />
        </CommonCard>
    );
}