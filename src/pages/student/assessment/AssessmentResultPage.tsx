import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import LinkifiedText from '@components/text/LinkifiedText';
import {
    ArrowLeftIcon,
    ArrowLineDownIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    ClockIcon,
    FileTextIcon,
    LockIcon,
    QuestionIcon,
    ShieldCheckIcon,
    SparkleIcon,
    TargetIcon,
    TrophyIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { getAttachmentSignedUrl } from '@services/assessment.service';
import { getMyAssessmentResult } from '@services/student-portal.service';
import { getFileUrl } from '@services/storage.service';
import { StudentAssessmentResult, StudentResultAnswer, StudentResultRubric } from '@type/student-portal.type';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const CHOICE_TYPES = ['Multiple Choice', 'True or False', 'Matching'];

function formatDateTime(value: string | null): string {
    return value
        ? new Date(value).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
        : '—';
}

function formatScore(value: number | null): string {
    return value !== null
        ? String(value)
        : '—';
}

async function openSubmissionFile(path: string) {
    const result = await getFileUrl('submissions', path);
    if (result.data) window.open(result.data.url, '_blank', 'noopener');
}

async function downloadAttachment(fileUrl: string, fileName: string) {
    const result = await getAttachmentSignedUrl(fileUrl);
    if (!result.data) return;
    const anchor = document.createElement('a');
    anchor.href = result.data;
    anchor.download = fileName;
    anchor.target = '_blank';
    anchor.click();
}

interface ResultDetailTileProps {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
}

function ResultDetailTile({ icon, iconBg, iconColor, label, value }: ResultDetailTileProps) {
    return (
        <div className="bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 p-3 rounded-2xl shadow-2xs min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <span className={`flex items-center justify-center ${iconColor}`}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                    {value}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {label}
                </span>
            </div>
        </div>
    );
}

interface NoticeBannerProps {
    icon: 'clock' | 'lock';
    message: string;
}

function NoticeBanner({ icon, message }: NoticeBannerProps) {
    return (
        <div className="border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/30 flex gap-3 items-center p-3.5 rounded-xl">
            {icon === 'lock' ? (
                <LockIcon
                    className="text-slate-500 dark:text-slate-400 shrink-0"
                    size={20}
                    weight="fill"
                />
            ) : (
                <ClockIcon
                    className="text-amber-500 shrink-0"
                    size={20}
                    weight="fill"
                />
            )}
            <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm m-0">
                {message}
            </p>
        </div>
    );
}

interface RubricBreakdownProps {
    resultsAvailable: boolean;
    rubric: StudentResultRubric;
}

function RubricBreakdown({ resultsAvailable, rubric }: RubricBreakdownProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    Rubric Evaluation — {rubric.title}
                </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
                {rubric.criteria.map(function(criterion) {
                    return (
                        <div
                            className="border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2 p-4 rounded-xl shadow-2xs"
                            key={criterion.id}
                        >
                            <div className="flex gap-2 items-start justify-between">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                        {criterion.title}
                                    </span>
                                    {criterion.description && (
                                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                                            {criterion.description}
                                        </span>
                                    )}
                                </div>
                                <span className="font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0">
                                    {resultsAvailable
                                        ? `${formatScore(criterion.points_earned)} / ${criterion.max_points} pts`
                                        : `${criterion.max_points} pts`}
                                </span>
                            </div>
                            {resultsAvailable && criterion.feedback && (
                                <div className="bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold">Instructor Feedback: </span>
                                    {criterion.feedback}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface ResultAnswerCardProps {
    answer: StudentResultAnswer;
    hasSubmission: boolean;
    index: number;
    resultsAvailable: boolean;
}

function ResultAnswerCard({ answer, hasSubmission, index, resultsAvailable }: ResultAnswerCardProps) {
    const isChoiceBased = CHOICE_TYPES.includes(answer.question_type);

    return (
        <div className="border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-3.5 p-4 rounded-xl shadow-2xs">
            <div className="flex gap-3 items-start justify-between">
                <p className="font-semibold min-w-0 text-slate-900 dark:text-slate-100 text-sm sm:text-base wrap-break-word m-0">
                    <span className="text-slate-400 font-mono mr-1.5">{index + 1}.</span>
                    {answer.question_text}
                </p>
                <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 shrink-0">
                    {resultsAvailable && hasSubmission
                        ? `${formatScore(answer.points_earned)} / ${answer.points} pts`
                        : `${answer.points} pts`}
                </span>
            </div>

            {isChoiceBased && (
                <div className="flex flex-col gap-2">
                    {answer.choices.map(function(choice) {
                        const isSelected = choice.id === answer.choice_id;
                        const showCorrect = resultsAvailable && choice.is_correct === true;
                        const showWrongSelected = resultsAvailable && isSelected && choice.is_correct === false;

                        return (
                            <div
                                className={`border flex flex-wrap gap-2.5 items-center px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                                    showCorrect
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                                        : showWrongSelected
                                            ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                                            : isSelected
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                                                : 'border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-slate-200'
                                }`}
                                key={choice.id}
                            >
                                {showCorrect && (
                                    <CheckCircleIcon
                                        className="text-emerald-600 dark:text-emerald-400 shrink-0"
                                        size={18}
                                        weight="fill"
                                    />
                                )}
                                {showWrongSelected && (
                                    <XCircleIcon
                                        className="text-rose-600 dark:text-rose-400 shrink-0"
                                        size={18}
                                        weight="fill"
                                    />
                                )}
                                <span className="min-w-0 wrap-break-word font-medium flex-1">
                                    {choice.choice_text}
                                </span>
                                {isSelected && (
                                    <span className="font-semibold text-xs px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-800 shrink-0">
                                        Your Choice
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isChoiceBased && hasSubmission && (
                <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Submitted Response
                    </span>
                    {answer.answer_text ? (
                        <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-800/80 break-words p-3.5 rounded-xl text-slate-900 dark:text-slate-100 text-sm whitespace-pre-wrap leading-relaxed">
                            <LinkifiedText text={answer.answer_text} />
                        </div>
                    ) : answer.file_attachments.length > 0 ? (
                        <div className="flex flex-col gap-1 items-start">
                            {answer.file_attachments.map(function(file) {
                                return (
                                    <button
                                        className="flex items-center min-h-11 text-(--mui-palette-primary-main) text-left text-sm underline wrap-break-word cursor-pointer"
                                        key={file.path}
                                        type="button"
                                        onClick={() => openSubmissionFile(file.path)}
                                    >
                                        <FileTextIcon className="inline mr-1.5 shrink-0" size={16} />
                                        {file.name}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="text-slate-400 italic text-xs">No response provided.</span>
                    )}
                </div>
            )}
        </div>
    );
}

function computeTransmutedGrade(score: number | null, total: number | null): string {
    if (score === null || total === null || total === 0) return '—';
    const pct = (score / total) * 100;
    if (pct >= 99) return '1.00 (99–100% · Excellent)';
    if (pct >= 96) return '1.25 (96–98% · Superior)';
    if (pct >= 93) return '1.50 (93–95% · Very Good)';
    if (pct >= 90) return '1.75 (90–92% · Good)';
    if (pct >= 87) return '2.00 (87–89% · Meritorious)';
    if (pct >= 84) return '2.25 (84–86% · Satisfactory)';
    if (pct >= 81) return '2.50 (81–83% · Fair)';
    if (pct >= 78) return '2.75 (78–80% · Passing)';
    if (pct >= 75) return '3.00 (75–77% · Conditional)';
    return '5.00 (Below 75% · Failed)';
}

export default function AssessmentResultPage() {
    const { enrollmentId = '', assessmentId = '' } = useParams<{
        enrollmentId: string;
        assessmentId: string;
    }>();
    const [searchParams] = useSearchParams();
    const isJustSubmitted = searchParams.get('submitted') === 'true';
    const navigate = useNavigate();

    const [result, setResult] = useState<StudentAssessmentResult | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchResult() {
            const response = await getMyAssessmentResult(enrollmentId, assessmentId);
            if (response.data) {
                setResult(response.data);
                if (response.data.enrollment_id && response.data.enrollment_id !== enrollmentId) {
                    navigate(`/student/subjects/${response.data.enrollment_id}/assessments/${assessmentId}/result`, { replace: true });
                }
            }
            setIsLoaded(true);
        }
        fetchResult();
    }, [assessmentId, enrollmentId]);

    const passed = result && result.has_submission && result.results_available
        && result.passing_points !== null && result.final_score !== null
        ? result.final_score >= result.passing_points
        : null;

    return (
        <CommonCard className="flex flex-col gap-5 h-full p-4 sm:p-6 w-full">
            <div className="flex gap-3 items-center pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        navigate(`/student/subjects/${result?.enrollment_id || enrollmentId}?tab=assessments`);
                    }}
                >
                    Back to Subject
                </CommonButton>
            </div>

            {!result && isLoaded && (
                <div className="flex flex-1 items-center justify-center py-16">
                    <p className="text-slate-500 text-sm">
                        Assessment result not available.
                    </p>
                </div>
            )}

            {!result && !isLoaded && (
                <div className="py-16 text-center text-slate-500 text-sm">Loading results…</div>
            )}

            {result && (
                <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto pr-1">
                    {/* Real-time Result Banner */}
                    {(isJustSubmitted || result.has_submission) && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/80 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between p-4 rounded-2xl shadow-2xs">
                            <div className="flex gap-3.5 items-center">
                                <div className="bg-blue-600 dark:bg-blue-500 p-2.5 rounded-xl text-white shrink-0">
                                    <SparkleIcon size={24} weight="fill" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                        Assessment Submitted &amp; Recorded
                                    </span>
                                    <p className="m-0 text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
                                        Computed Grade Scale:{' '}
                                        <strong className="text-blue-700 dark:text-blue-300">
                                            {computeTransmutedGrade(result.final_score ?? result.raw_score, result.total_points)}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assessment Meta Header */}
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center">
                            <CommonBadgeStatus label={result.assessment_type} variant="info" />
                            {result.grading_period_name && (
                                <CommonBadgeStatus label={result.grading_period_name} variant="info" />
                            )}
                            <CommonBadgeStatus
                                label={result.status ?? 'Not Started'}
                                variant="info"
                            />
                            {passed !== null && (
                                <CommonBadgeStatus
                                    label={passed ? 'Passing' : 'Below Passing'}
                                    variant={passed ? 'success' : 'error'}
                                />
                            )}
                            {result.is_late && (
                                <CommonBadgeStatus label="Late Submission" variant="warning" />
                            )}
                        </div>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-xl sm:text-2xl tracking-tight">
                            {result.title}
                        </h1>
                        {result.description && (
                            <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap leading-relaxed">
                                {result.description}
                            </p>
                        )}
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="gap-3 sm:gap-4 grid grid-cols-2 md:grid-cols-4">
                        <ResultDetailTile
                            icon={<TrophyIcon size={20} />}
                            iconBg="bg-blue-50 dark:bg-blue-950/60"
                            iconColor="text-blue-600 dark:text-blue-400"
                            label="Final Score"
                            value={!result.has_submission
                                ? 'Not attempted'
                                : result.results_available
                                    ? `${formatScore(result.final_score)} / ${result.total_points}`
                                    : 'Pending Grading'}
                        />
                        <ResultDetailTile
                            icon={<TargetIcon size={20} />}
                            iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                            label="Passing Mark"
                            value={result.passing_points !== null ? `${result.passing_points} pts` : '—'}
                        />
                        <ResultDetailTile
                            icon={<ShieldCheckIcon size={20} />}
                            iconBg="bg-purple-50 dark:bg-purple-950/60"
                            iconColor="text-purple-600 dark:text-purple-400"
                            label="Attempt"
                            value={`${result.attempt_number ?? 0} of ${result.max_attempts}`}
                        />
                        <ResultDetailTile
                            icon={<QuestionIcon size={20} />}
                            iconBg="bg-amber-50 dark:bg-amber-950/60"
                            iconColor="text-amber-600 dark:text-amber-400"
                            label="Total Items"
                            value={String(result.question_count)}
                        />
                        <ResultDetailTile
                            icon={<ClockIcon size={20} />}
                            iconBg="bg-slate-100 dark:bg-zinc-800"
                            iconColor="text-slate-600 dark:text-slate-300"
                            label="Opened"
                            value={formatDateTime(result.opens_at)}
                        />
                        <ResultDetailTile
                            icon={<CalendarDotsIcon size={20} />}
                            iconBg="bg-slate-100 dark:bg-zinc-800"
                            iconColor="text-slate-600 dark:text-slate-300"
                            label="Due Date"
                            value={formatDateTime(result.due_at)}
                        />
                        <ResultDetailTile
                            icon={<ClockIcon size={20} />}
                            iconBg="bg-slate-100 dark:bg-zinc-800"
                            iconColor="text-slate-600 dark:text-slate-300"
                            label="Cutoff"
                            value={formatDateTime(result.closes_at)}
                        />
                        <ResultDetailTile
                            icon={<CheckCircleIcon size={20} />}
                            iconBg="bg-indigo-50 dark:bg-indigo-950/60"
                            iconColor="text-indigo-600 dark:text-indigo-400"
                            label="Submitted At"
                            value={formatDateTime(result.submitted_at)}
                        />
                    </div>

                    {result.attachments.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                Reference Materials &amp; Attachments
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {result.attachments.map(function(file) {
                                    return (
                                        <CommonButton
                                            key={file.id}
                                            size="small"
                                            startIcon={<ArrowLineDownIcon size={14} weight="bold" />}
                                            variant="outlined"
                                            onClick={function() {
                                                downloadAttachment(file.file_url, file.file_name);
                                            }}
                                        >
                                            {file.file_name}
                                        </CommonButton>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {result.has_submission && result.results_available && result.feedback && (
                        <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-1.5 p-4 rounded-xl text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                Instructor Evaluation Feedback
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 text-sm m-0 whitespace-pre-wrap leading-relaxed">
                                {result.feedback}
                            </p>
                        </div>
                    )}

                    {result.has_submission && !result.results_available && (
                        <NoticeBanner
                            icon="clock"
                            message={result.show_results_at
                                ? `Results will be available on ${formatDateTime(result.show_results_at)}.`
                                : 'Your submission is awaiting grading. Detailed results will appear here once released.'}
                        />
                    )}

                    {!result.review_available && result.review_blocked_reason && (
                        <NoticeBanner icon="lock" message={result.review_blocked_reason} />
                    )}

                    {result.review_available && !result.has_submission && (
                        <NoticeBanner
                            icon="clock"
                            message={result.results_available
                                ? 'You did not submit this assessment. The questions below are shown for review only.'
                                : 'You did not submit this assessment. Correct answers stay hidden until your instructor releases results.'}
                        />
                    )}

                    {result.rubric && (
                        <RubricBreakdown
                            resultsAvailable={result.results_available}
                            rubric={result.rubric}
                        />
                    )}

                    {result.answers.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                {result.has_submission ? 'Your Submitted Responses' : 'Assessment Questions'}
                            </span>
                            {result.answers.map(function(answer, index) {
                                return (
                                    <ResultAnswerCard
                                        answer={answer}
                                        hasSubmission={result.has_submission}
                                        index={index}
                                        key={answer.id}
                                        resultsAvailable={result.results_available}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </CommonCard>
    );
}
