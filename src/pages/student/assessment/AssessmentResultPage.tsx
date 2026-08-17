import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import {
    ArrowLeftIcon, ArrowLineDownIcon, CheckCircleIcon, ClockIcon, LockIcon, XCircleIcon
} from '@phosphor-icons/react';
import { getAttachmentSignedUrl } from '@services/assessment.service';
import { getMyAssessmentResult } from '@services/student-portal.service';
import { getFileUrl } from '@services/storage.service';
import { StudentAssessmentResult, StudentResultAnswer, StudentResultRubric } from '@type/student-portal.type';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const CHOICE_TYPES = ['Multiple Choice', 'True or False', 'Matching'];

function formatDateTime(value: string | null): string {
    return value
        ? new Date(value)
            .toLocaleString()
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

interface DetailFieldProps {
    label: string;
    value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                {label}
            </span>
            <span className="font-medium text-(--mui-palette-text-primary) text-sm wrap-break-word">
                {value}
            </span>
        </div>
    );
}

interface NoticeBannerProps {
    icon: 'clock' | 'lock';
    message: string;
}

function NoticeBanner({ icon, message }: NoticeBannerProps) {
    return (
        <div className="border border-(--mui-palette-divider) flex gap-2 items-center p-3 rounded-lg">
            {icon === 'lock'
                ? (
                    <LockIcon
                        className="text-(--mui-palette-text-secondary) shrink-0"
                        size={18}
                        weight="fill"
                    />
                )
                : (
                    <ClockIcon
                        className="text-(--mui-palette-warning-main) shrink-0"
                        size={18}
                        weight="fill"
                    />
                )}
            <p className="text-(--mui-palette-text-secondary) text-sm">
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
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                Rubric — {rubric.title}
            </span>
            {rubric.criteria.map(function(criterion) {
                return (
                    <div
                        className="border border-(--mui-palette-divider) flex flex-col gap-2 p-4 rounded-lg"
                        key={criterion.id}
                    >
                        <div className="flex gap-2 items-start justify-between">
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {criterion.title}
                                </span>
                                {criterion.description && (
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {criterion.description}
                                    </span>
                                )}
                            </div>
                            <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                {resultsAvailable
                                    ? `${formatScore(criterion.points_earned)} / ${criterion.max_points}`
                                    : criterion.max_points} pts
                            </span>
                        </div>
                        {resultsAvailable && criterion.feedback && (
                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                Note: {criterion.feedback}
                            </p>
                        )}
                    </div>
                );
            })}
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
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex gap-2 items-start justify-between">
                <p className="font-medium min-w-0 text-(--mui-palette-text-primary) text-sm wrap-break-word">
                    {index + 1}. {answer.question_text}
                </p>
                <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                    {resultsAvailable && hasSubmission
                        ? `${formatScore(answer.points_earned)} / ${answer.points}`
                        : answer.points} pts
                </span>
            </div>

            {isChoiceBased && (
                <div className="flex flex-col gap-1.5">
                    {answer.choices.map(function(choice) {
                        const isSelected = choice.id === answer.choice_id;
                        const showCorrect = resultsAvailable && choice.is_correct === true;
                        const showWrongSelected = resultsAvailable && isSelected && choice.is_correct === false;

                        return (
                            <div
                                className="border flex flex-wrap gap-2 items-center px-3 py-2 rounded text-sm"
                                key={choice.id}
                                style={{
                                    borderColor: showCorrect
                                        ? 'var(--mui-palette-success-main)'
                                        : showWrongSelected
                                            ? 'var(--mui-palette-error-main)'
                                            : isSelected
                                                ? 'var(--mui-palette-primary-main)'
                                                : 'var(--mui-palette-divider)'
                                }}
                            >
                                {showCorrect && (
                                    <CheckCircleIcon
                                        className="text-(--mui-palette-success-main) shrink-0"
                                        size={16}
                                        weight="fill"
                                    />
                                )}
                                {showWrongSelected && (
                                    <XCircleIcon
                                        className="text-(--mui-palette-error-main) shrink-0"
                                        size={16}
                                        weight="fill"
                                    />
                                )}
                                <span className="min-w-0 text-(--mui-palette-text-primary) wrap-break-word">
                                    {choice.choice_text}
                                </span>
                                {isSelected && (
                                    <span className="ml-auto shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                        Your answer
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!isChoiceBased && hasSubmission && (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-(--mui-palette-text-secondary) text-xs">
                        Your Answer
                    </span>
                    {answer.answer_text
                        ? (
                            <p className="bg-(--mui-palette-action-hover) p-2 rounded text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                                {answer.answer_text}
                            </p>
                        )
                        : answer.file_attachments.length > 0
                            ? (
                                <div className="flex flex-col gap-1 items-start">
                                    {answer.file_attachments.map(function(file) {
                                        return (
                                            <button
                                                className="flex items-center min-h-11 text-(--mui-palette-primary-main) text-left text-sm underline wrap-break-word"
                                                key={file.path}
                                                type="button"
                                                onClick={function() {
                                                    openSubmissionFile(file.path);
                                                }}
                                            >
                                                {file.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                            : (
                                <p className="italic text-(--mui-palette-text-disabled) text-sm">
                                    No answer provided
                                </p>
                            )}
                </div>
            )}

            {resultsAvailable && hasSubmission && answer.is_correct !== null && (
                <span
                    className="font-medium text-xs"
                    style={{
                        color: answer.is_correct
                            ? 'var(--mui-palette-success-main)'
                            : 'var(--mui-palette-error-main)'
                    }}
                >
                    {answer.is_correct
                        ? '✓ Correct'
                        : '✗ Incorrect'}
                </span>
            )}
            {resultsAvailable && hasSubmission && answer.grader_notes && (
                <p className="text-(--mui-palette-text-secondary) text-xs">
                    Note: {answer.grader_notes}
                </p>
            )}
            {resultsAvailable && answer.explanation && (
                <div className="bg-(--mui-palette-action-hover) flex flex-col gap-0.5 p-2 rounded">
                    <span className="font-medium text-(--mui-palette-text-secondary) text-xs uppercase">
                        Explanation
                    </span>
                    <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                        {answer.explanation}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function AssessmentResultPage() {
    const { enrollmentId = '', assessmentId = '' } = useParams<{
        enrollmentId: string;
        assessmentId: string;
    }>();
    const navigate = useNavigate();

    const [result, setResult] = useState<StudentAssessmentResult | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchResult() {
            const response = await getMyAssessmentResult(enrollmentId, assessmentId);
            if (response.data) setResult(response.data);
            setIsLoaded(true);
        }

        fetchResult();
    }, [assessmentId, enrollmentId]);

    const passed = result && result.has_submission && result.results_available
        && result.passing_points !== null && result.final_score !== null
        ? result.final_score >= result.passing_points
        : null;

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex gap-3 items-center">
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
            </div>

            {!result && isLoaded && (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Assessment not available.
                    </p>
                </div>
            )}

            {!result && !isLoaded && (
                <p className="text-(--mui-palette-text-secondary) text-sm">Loading...</p>
            )}

            {result && (
                <div className="flex flex-1 flex-col gap-4 min-h-0 overflow-y-auto">
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
                                    label={passed
                                        ? 'Passed'
                                        : 'Failed'}
                                    variant={passed
                                        ? 'success'
                                        : 'error'}
                                />
                            )}
                            {result.is_late && (
                                <CommonBadgeStatus label="Late" variant="warning" />
                            )}
                        </div>
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-lg md:text-xl">
                            {result.title}
                        </h1>
                        {result.description && (
                            <p className="text-(--mui-palette-text-secondary) text-sm whitespace-pre-wrap">
                                {result.description}
                            </p>
                        )}
                    </div>

                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                        <DetailField
                            label="Score"
                            value={!result.has_submission
                                ? 'Not attempted'
                                : result.results_available
                                    ? `${formatScore(result.final_score)} / ${result.total_points}`
                                    : 'Pending'}
                        />
                        <DetailField
                            label="Passing"
                            value={result.passing_points !== null
                                ? `${result.passing_points} pts`
                                : '—'}
                        />
                        <DetailField
                            label="Attempt"
                            value={`${result.attempt_number ?? 0} / ${result.max_attempts}`}
                        />
                        <DetailField
                            label="Questions"
                            value={String(result.question_count)}
                        />
                        <DetailField
                            label="Opens"
                            value={formatDateTime(result.opens_at)}
                        />
                        <DetailField
                            label="Due"
                            value={formatDateTime(result.due_at)}
                        />
                        <DetailField
                            label="Closes"
                            value={formatDateTime(result.closes_at)}
                        />
                        <DetailField
                            label="Submitted"
                            value={formatDateTime(result.submitted_at)}
                        />
                    </div>

                    {result.attachments.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                                Attachments
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
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3 rounded-lg">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                                Instructor Feedback
                            </span>
                            <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
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
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {result.has_submission
                                    ? 'Your Answers'
                                    : 'Questions'}
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