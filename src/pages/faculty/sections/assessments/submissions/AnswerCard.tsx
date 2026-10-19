import LinkifiedText from '@components/text/LinkifiedText';
import { getFileUrl } from '@services/storage.service';
import { GradeAnswerUpdate, SubmissionAnswer } from '@type/assessment.type';
import { stripLeadingZeros } from '@utils/input.util';

const MANUAL_GRADE_TYPES = ['Essay', 'Short Answer', 'File Upload'];

async function openSubmissionFile(path: string) {
    const result = await getFileUrl('submissions', path);
    if (result.data) window.open(result.data.url, '_blank', 'noopener');
}

interface AnswerCardProps {
    answer: SubmissionAnswer;
    draftAnswer?: GradeAnswerUpdate;
    readOnly?: boolean;
    onNotesChange?: (answerId: string, value: string) => void;
    onPointsChange?: (answerId: string, value: number) => void;
}

export default function AnswerCard({
    answer,
    draftAnswer,
    readOnly = false,
    onNotesChange,
    onPointsChange
}: AnswerCardProps) {
    const isManual = MANUAL_GRADE_TYPES.includes(answer.question_type);

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex gap-2 items-start justify-between">
                <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {answer.sequence}. {answer.question_text}
                </p>
                <span className="flex-shrink-0 text-(--mui-palette-text-secondary) text-xs">
                    {answer.points} pt{answer.points !== 1
                        ? 's'
                        : ''}
                </span>
            </div>

            <div className="flex flex-col gap-1">
                <span className="font-medium text-(--mui-palette-text-secondary) text-xs">
                    Student Answer
                </span>
                {answer.answer_text
                    ? (
                        <p className="bg-(--mui-palette-action-hover) break-words p-2 rounded text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                            <LinkifiedText text={answer.answer_text} />
                        </p>
                    )
                    : answer.file_attachments?.length > 0
                        ? (
                            <div className="flex flex-col gap-1 items-start">
                                {answer.file_attachments.map((file) => (
                                    <button
                                        className="text-(--mui-palette-primary-main) text-left text-sm underline"
                                        key={file.path}
                                        type="button"
                                        onClick={function() {
                                            openSubmissionFile(file.path);
                                        }}
                                    >
                                        {file.name}
                                    </button>
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

            {!readOnly && !isManual && (
                <div className="flex gap-2 items-center">
                    {answer.is_correct !== null && (
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
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {answer.points_earned ?? 0} / {answer.points} pts
                    </span>
                </div>
            )}

            {!readOnly && isManual && draftAnswer && onNotesChange && onPointsChange && (
                <div className="flex flex-col gap-2">
                    <div className="flex gap-3 items-center">
                        <label className="font-medium text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                            Points Earned
                        </label>
                        <input
                            className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-2 py-1 rounded text-sm transition-colors w-20"
                            max={answer.points}
                            min={0}
                            step={0.01}
                            type="number"
                            value={draftAnswer.points_earned}
                            onChange={function(e) {
                                const val = stripLeadingZeros(e.target.value);
                                e.target.value = val;
                                onPointsChange(answer.id, Number(val));
                            }}
                        />
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            / {answer.points} pts
                        </span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="font-medium text-(--mui-palette-text-secondary) text-xs">
                            Grader Notes
                        </label>
                        <textarea
                            className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-2 py-1 resize-none rounded text-sm transition-colors"
                            rows={2}
                            value={draftAnswer.grader_notes}
                            onChange={function(e) {
                                onNotesChange(answer.id, e.target.value);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}