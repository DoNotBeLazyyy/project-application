import CommonButton from '@components/button/CommonButton';
import { CheckCircleIcon, PlayIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { previewSpecialGradeRule } from '@services/grading-config.service';
import { SpecialGradeConditionGroup, SpecialGradePreviewResult } from '@type/grading-config.type';
import { describeEvidence, readConditionLeaves } from '@utils/special-grade.util';
import { useState } from 'react';

export interface RulePreviewPanelProps {
    conditions: SpecialGradeConditionGroup;
    code?: string;
}

/**
 * RulePreviewPanel
 *
 * Dry-runs a candidate rule against every currently enrolled student and
 * reports how many it would catch, without saving or flagging anything.
 *
 * This is what makes admin-authored rules safe to author: a threshold typed one
 * digit wrong is visible here as "matches 289 students" instead of surfacing as
 * a few hundred wrongly flagged transcripts after the next sweep.
 */
export default function RulePreviewPanel({ conditions, code }: RulePreviewPanelProps) {
    const [result, setResult] = useState<SpecialGradePreviewResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isRunnable = readConditionLeaves(conditions).length > 0;

    async function handlePreview() {
        setIsRunning(true);
        setError(null);

        const response = await previewSpecialGradeRule(conditions);

        setIsRunning(false);

        if (response.error || !response.data) {
            setError(response.error?.message ?? 'Preview could not be completed.');
            setResult(null);
            return;
        }

        if (!response.data.success) {
            setError(response.data.message ?? 'Preview could not be completed.');
            setResult(null);
            return;
        }

        setResult(response.data);
    }

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-3 rounded-lg">
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Preview matches
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Check who this rule would catch before you save it. Nothing is flagged.
                    </span>
                </div>
                <CommonButton
                    disabled={!isRunnable || isRunning}
                    size="small"
                    startIcon={<PlayIcon size={14} weight="fill" />}
                    variant="outlined"
                    onClick={handlePreview}
                >
                    {isRunning
                        ? 'Checking…'
                        : 'Preview'}
                </CommonButton>
            </div>

            {!isRunnable
                ? (
                    <p className="text-(--mui-palette-text-secondary) text-xs">
                        Add at least one condition to preview this rule.
                    </p>
                )
                : null}

            {error
                ? (
                    <div className="bg-(--mui-palette-error-main)/10 border border-(--mui-palette-error-main) flex gap-2 items-center p-2 rounded-lg">
                        <WarningCircleIcon
                            className="text-(--mui-palette-error-main) shrink-0"
                            size={16}
                            weight="fill"
                        />
                        <p className="text-(--mui-palette-error-main) text-xs">{error}</p>
                    </div>
                )
                : null}

            {result
                ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                            <CheckCircleIcon
                                className="text-(--mui-palette-success-main) shrink-0"
                                size={16}
                                weight="fill"
                            />
                            <p className="text-(--mui-palette-text-primary) text-sm">
                                This rule currently matches
                                {' '}
                                <span className="font-semibold">{result.matched_count}</span>
                                {' of '}
                                <span className="font-semibold">{result.total_students}</span>
                                {' enrolled student(s).'}
                            </p>
                        </div>

                        {result.matched_count > result.sample.length
                            ? (
                                <p className="text-(--mui-palette-text-secondary) text-xs">
                                    Showing the first
                                    {' '}
                                    {result.sample.length}
                                    .
                                </p>
                            )
                            : null}

                        {result.sample.length > 0
                            ? (
                                <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                                    {result.sample.map(function(match) {
                                        return (
                                            <li
                                                className="bg-(--mui-palette-background-default) flex flex-col gap-0.5 p-2 rounded"
                                                key={match.enrollment_id}
                                            >
                                                <span className="font-medium text-(--mui-palette-text-primary) text-xs">
                                                    {match.full_name}
                                                    {' · '}
                                                    {match.student_number}
                                                    {' · '}
                                                    {match.section_code}
                                                </span>
                                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                                    {describeEvidence(match.evidence)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                            : (
                                <p className="text-(--mui-palette-text-secondary) text-xs">
                                    No students currently meet these conditions
                                    {code
                                        ? ` for ${code}`
                                        : ''}
                                    .
                                </p>
                            )}
                    </div>
                )
                : null}
        </div>
    );
}