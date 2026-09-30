import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import useBreakpoint from '@hooks/useBreakpoint';
import Radio from '@mui/material/Radio';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { EvaluationTemplateForm } from '@type/evaluation.type';
import { useMemo } from 'react';

const RATING_LEGEND = '5 = Strongly Agree, 4 = Agree, 3 = Uncertain, 2 = Disagree, 1 = Strongly Disagree';
const DEFAULT_SCALE = [5, 4, 3, 2, 1];

interface EvaluationTemplateViewPanelProps {
    values: EvaluationTemplateForm;
}

export default function EvaluationTemplateViewPanel({ values }: EvaluationTemplateViewPanelProps) {
    const { isMobile } = useBreakpoint();
    const { programOptions } = useProgramOptions();

    const questions = values.questions ?? [];

    const scopeLabel = useMemo(() => {
        const programIds = values.program_ids ?? [];
        if (programIds.length === 0) {
            return 'All Programs (Campus-wide)';
        }

        const selectedLabels = programIds
            .map((id) => programOptions.find((p) => p.value === id)?.label ?? id)
            .filter(Boolean);

        const joined = selectedLabels.join(', ');
        if (values.target_mode === 'EXCLUDE') {
            return `Excludes: ${joined}`;
        }
        return `Applies to: ${joined}`;
    }, [values.program_ids, values.target_mode, programOptions]);

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Metadata Summary Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-(--mui-palette-action-hover)/60 border border-(--mui-palette-divider) text-xs">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-(--mui-palette-text-primary)">
                        Order Sequence: <span className="font-bold text-(--mui-palette-primary-main)">#{values.sequence || 1}</span>
                    </span>
                    <span className="text-(--mui-palette-text-secondary)">•</span>
                    <span className="text-(--mui-palette-text-secondary)">
                        Scope: <span className="font-medium text-(--mui-palette-text-primary)">{scopeLabel}</span>
                    </span>
                </div>
                <CommonBadgeStatus
                    label={values.is_active ? 'Active' : 'Inactive'}
                    variant={values.is_active ? 'success' : 'error'}
                />
            </div>

            {/* Rating Legend Card (Matching Student View) */}
            <div className="border border-(--mui-palette-divider) rounded-xl flex flex-col gap-1.5 p-4 bg-(--mui-palette-background-paper) shadow-xs">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                    Rating Legend
                </h2>
                <p className="text-(--mui-palette-text-secondary) text-sm leading-relaxed">
                    {RATING_LEGEND}
                </p>
            </div>

            {/* Student Preview Section */}
            <section className="flex flex-col gap-4 border border-(--mui-palette-divider) rounded-xl p-4 sm:p-6 bg-(--mui-palette-background-paper) shadow-xs">
                {/* Section Title & Description */}
                <div className="flex flex-col gap-1">
                    <h3 className="bg-(--mui-palette-primary-main)/10 font-bold px-3 py-1.5 rounded-lg self-start text-(--mui-palette-primary-main) text-sm sm:text-base">
                        {values.title || 'Untitled Section'}
                    </h3>
                    {values.description && (
                        <p className="text-(--mui-palette-text-secondary) text-sm leading-relaxed mt-1">
                            {values.description}
                        </p>
                    )}
                </div>

                {/* Questions Display */}
                {questions.length === 0 ? (
                    <div className="text-center py-8 text-(--mui-palette-text-secondary) text-sm border border-dashed border-(--mui-palette-divider) rounded-lg">
                        No questions configured for this section.
                    </div>
                ) : isMobile ? (
                    /* Mobile Cards View */
                    <div className="flex flex-col gap-3">
                        {questions.map((q, idx) => (
                            <div
                                className="border border-(--mui-palette-divider) flex flex-col gap-3 p-3.5 rounded-xl bg-(--mui-palette-background-paper)"
                                key={q.id ?? idx}
                            >
                                <span className="leading-snug text-(--mui-palette-text-primary) text-sm">
                                    <span className="text-(--mui-palette-text-secondary) font-semibold">{idx + 1}. </span>
                                    {q.question_text || <span className="italic text-(--mui-palette-text-secondary)">Untitled question</span>}
                                    {q.is_required && <span className="text-(--mui-palette-error-main) font-bold"> *</span>}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {DEFAULT_SCALE.map((rating) => (
                                        <div
                                            className="border border-(--mui-palette-divider) font-semibold rounded-lg size-11 text-sm flex items-center justify-center text-(--mui-palette-text-secondary) bg-(--mui-palette-action-hover)/40 select-none"
                                            key={rating}
                                        >
                                            {rating}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Desktop Rating Matrix Table */
                    <div className="overflow-x-auto w-full border border-(--mui-palette-divider) rounded-lg">
                        <table className="min-w-full table-fixed">
                            <thead>
                                <tr className="border-b border-(--mui-palette-divider) bg-(--mui-palette-action-hover)">
                                    <th className="font-semibold py-3 px-4 text-(--mui-palette-text-primary) text-left text-sm w-3/5">
                                        Questions
                                    </th>
                                    {DEFAULT_SCALE.map((rating) => (
                                        <th
                                            className="font-semibold py-3 text-(--mui-palette-text-primary) text-center text-sm w-[8%]"
                                            key={rating}
                                        >
                                            {rating}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {questions.map((q, idx) => (
                                    <tr
                                        className="border-b border-(--mui-palette-divider) last:border-b-0 hover:bg-(--mui-palette-action-hover)/40 transition-colors"
                                        key={q.id ?? idx}
                                    >
                                        <td className="align-middle py-3 px-4">
                                            <span className="leading-snug text-(--mui-palette-text-primary) text-sm">
                                                <span className="text-(--mui-palette-text-secondary) font-semibold">{idx + 1}. </span>
                                                {q.question_text || <span className="italic text-(--mui-palette-text-secondary)">Untitled question</span>}
                                                {q.is_required && (
                                                    <span className="text-(--mui-palette-error-main) font-bold"> *</span>
                                                )}
                                            </span>
                                        </td>
                                        {DEFAULT_SCALE.map((rating) => (
                                            <td className="text-center align-middle" key={rating}>
                                                <Radio disabled size="small" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Student Suggestion / Comments Box */}
                {values.suggestion_placeholder && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-(--mui-palette-divider)">
                        <label className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Student Suggestions & Comments
                        </label>
                        <textarea
                            disabled
                            className="w-full p-3 rounded-lg border border-(--mui-palette-divider) bg-(--mui-palette-action-hover)/40 text-(--mui-palette-text-secondary) text-sm resize-none cursor-not-allowed"
                            placeholder={values.suggestion_placeholder}
                            rows={3}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}
