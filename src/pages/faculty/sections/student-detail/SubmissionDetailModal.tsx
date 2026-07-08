import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonModal from '@components/modal/CommonModal';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import { formatDateTime, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { InfoIcon, ListChecksIcon, XIcon } from '@phosphor-icons/react';
import { getSubmissionForGrading } from '@services/assessment.service';
import { SubmissionAnswer, SubmissionForGrading } from '@type/assessment.type';
import { StudentEvaluationAssessment } from '@type/faculty.type';
import { SyntheticEvent, useEffect, useState } from 'react';

type SubmissionTab = 'overview' | 'answers';

interface SubmissionDetailModalProps {
    assessment: StudentEvaluationAssessment | null;
    onClose: () => void;
}

interface DetailFieldProps {
    label: string;
    value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                {label}
            </span>
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                {value}
            </span>
        </div>
    );
}

const MANUAL_TYPES = ['Essay', 'Short Answer', 'File Upload'];

function AnswerRow({ answer }: { answer: SubmissionAnswer }) {
    const isManual = MANUAL_TYPES.includes(answer.question_type);

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-2 p-4 rounded-lg">
            <div className="flex gap-2 items-start justify-between">
                <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {answer.sequence}. {answer.question_text}
                </p>
                <span className="flex-shrink-0 text-(--mui-palette-text-secondary) text-xs">
                    {formatScore(answer.points_earned)} / {answer.points} pts
                </span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-secondary) text-xs">
                    Student Answer
                </span>
                {answer.answer_text
                    ? (
                        <p className="bg-(--mui-palette-action-hover) p-2 rounded text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                            {answer.answer_text}
                        </p>
                    )
                    : answer.file_attachments?.length > 0
                        ? (
                            <div className="flex flex-col gap-1">
                                {answer.file_attachments.map((file, i) => (
                                    <a
                                        className="text-(--mui-palette-primary-main) text-sm underline"
                                        href={file.url}
                                        key={i}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {file.name}
                                    </a>
                                ))}
                            </div>
                        )
                        : (
                            <p className="italic text-(--mui-palette-text-disabled) text-sm">
                                No answer provided
                            </p>
                        )
                }
            </div>
            <div className="flex gap-3 items-center">
                {!isManual && answer.is_correct !== null && (
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
                {answer.grader_notes && (
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Note: {answer.grader_notes}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function SubmissionDetailModal({ assessment, onClose }: SubmissionDetailModalProps) {
    const [activeTab, setActiveTab] = useState<SubmissionTab>('overview');
    const [submission, setSubmission] = useState<SubmissionForGrading | null>(null);

    useEffect(function() {
        setActiveTab('overview');
        setSubmission(null);

        if (!assessment?.submission_id) {
            return;
        }

        async function fetchSubmission(submissionId: string) {
            const result = await getSubmissionForGrading(submissionId);

            if (result.data) {
                setSubmission(result.data);
            }
        }

        fetchSubmission(assessment.submission_id);
    }, [assessment]);

    if (!assessment) {
        return null;
    }

    const hasSubmission = Boolean(assessment.submission_id);
    const passed = assessment.passing_points !== null && assessment.final_score !== null
        ? assessment.final_score >= assessment.passing_points
        : null;

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as SubmissionTab);
    }

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-4 max-h-[85vh] overflow-y-auto w-[min(94vw,640px)]' }}
            open={Boolean(assessment)}
            onClose={onClose}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 items-center">
                        <CommonBadgeStatus label={assessment.assessment_type} variant="info" />
                        {assessment.grading_period_name && (
                            <CommonBadgeStatus label={assessment.grading_period_name} variant="info" />
                        )}
                        <CommonBadgeStatus
                            label={assessment.submission_status ?? 'Not Started'}
                            variant={submissionStatusVariant(assessment.submission_status)}
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
                    </div>
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        {assessment.title}
                    </h2>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                    title="Close"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            <CommonTabMenu
                menuStyle="outline"
                size="small"
                tabs={[
                    { icon: <InfoIcon />, label: 'Overview', value: 'overview' },
                    { icon: <ListChecksIcon />, label: 'Answers', value: 'answers' }
                ]}
                value={activeTab}
                onChange={handleTabChange}
            />

            {activeTab === 'overview' && (
                <div className="flex flex-col gap-4">
                    {assessment.description && (
                        <div className="flex flex-col gap-1">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                                Description
                            </span>
                            <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                                {assessment.description}
                            </p>
                        </div>
                    )}
                    <div className="gap-4 grid grid-cols-2 sm:grid-cols-3">
                        <DetailField
                            label="Score"
                            value={`${formatScore(assessment.final_score)} / ${assessment.total_points}`}
                        />
                        <DetailField
                            label="Raw Score"
                            value={formatScore(assessment.raw_score)}
                        />
                        <DetailField
                            label="Passing"
                            value={assessment.passing_points !== null
                                ? `${assessment.passing_points} pts`
                                : '—'}
                        />
                        <DetailField
                            label="Questions"
                            value={String(assessment.question_count)}
                        />
                        <DetailField
                            label="Late"
                            value={assessment.is_late
                                ? 'Yes'
                                : 'No'}
                        />
                        <DetailField
                            label="Due"
                            value={formatDateTime(assessment.due_at)}
                        />
                        <DetailField
                            label="Submitted"
                            value={formatDateTime(assessment.submitted_at)}
                        />
                        <DetailField
                            label="Graded"
                            value={formatDateTime(assessment.graded_at)}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'answers' && (
                <div className="flex flex-col gap-3">
                    {!hasSubmission && (
                        <p className="italic py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                            The student has not submitted this assessment.
                        </p>
                    )}
                    {hasSubmission && !submission && (
                        <p className="py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                            Loading submission…
                        </p>
                    )}
                    {submission?.answers.map((answer) => (
                        <AnswerRow answer={answer} key={answer.id} />
                    ))}
                    {submission && submission.answers.length === 0 && (
                        <p className="italic py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                            No answers recorded for this submission.
                        </p>
                    )}
                </div>
            )}
        </CommonModal>
    );
}