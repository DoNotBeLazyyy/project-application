import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import EvaluationQuestionField from '@pages/student/evaluation/EvaluationQuestionField';
import EvaluationRatingMatrix, { EvaluationRatingRow } from '@pages/student/evaluation/EvaluationRatingMatrix';
import { ArrowLeftIcon, CaretDownIcon, CaretUpIcon, InfoIcon } from '@phosphor-icons/react';
import { EvaluationAnswersForm, EvaluationForm, EvaluationSection } from '@type/evaluation.type';
import { RefObject, useState } from 'react';
import { Control } from 'react-hook-form';

export interface RenderedSection extends EvaluationSection {
    startIndex: number;
}

export interface ScrolledSection {
    openRows: EvaluationRatingRow[];
    ratingRows: EvaluationRatingRow[];
    section: RenderedSection;
}

export interface Step2EvaluationFormProps {
    control: Control<EvaluationAnswersForm>;
    fieldsCount: number;
    form: EvaluationForm | null;
    hasMore: boolean;
    isLoading: boolean;
    isReadOnly: boolean;
    isSubmitting: boolean;
    scrolledSections: ScrolledSection[];
    sentinelRef: RefObject<HTMLDivElement | null>;
    visibleCount: number;
    onBack: VoidFunction;
    onSubmit: VoidFunction;
}

const QUICK_RATING_LEGEND: { label: string; value: number }[] = [
    { label: 'Strongly Agree', value: 5 },
    { label: 'Agree', value: 4 },
    { label: 'Uncertain', value: 3 },
    { label: 'Disagree', value: 2 },
    { label: 'Strongly Disagree', value: 1 }
];

export default function Step2EvaluationForm({
    control,
    fieldsCount,
    form,
    hasMore,
    isLoading,
    isReadOnly,
    isSubmitting,
    scrolledSections,
    sentinelRef,
    visibleCount,
    onBack,
    onSubmit
}: Step2EvaluationFormProps) {
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    if (isLoading || !form) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-0 text-(--mui-palette-text-secondary) text-sm">
                Loading evaluation questions...
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col h-full min-h-0">
            {/* Compact Header for Evaluation Form */}
            <div className="flex flex-col gap-2 shrink-0 border-b border-(--mui-palette-divider) pb-2.5 mb-2">
                <div className="flex items-center justify-between gap-2">
                    <button
                        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-(--mui-palette-primary-main) hover:underline cursor-pointer select-none"
                        type="button"
                        onClick={onBack}
                    >
                        <ArrowLeftIcon size={16} />
                        <span>Change Faculty / Instructions</span>
                    </button>
                    {isReadOnly && (
                        <CommonBadgeStatus
                            label="Completed"
                            size="small"
                            variant="success"
                        />
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm sm:text-base text-(--mui-palette-text-primary) truncate">
                            {form.faculty_name || 'Faculty Evaluation'}
                        </span>
                        <span className="text-xs text-(--mui-palette-text-secondary) truncate">
                            {form.course_code} — {form.course_title} · {form.section_code} · {form.grading_period_name}
                        </span>
                    </div>

                    {/* Quick Collapsible Rating Legend Pill */}
                    <button
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isLegendOpen
                                ? 'border-(--mui-palette-primary-main) bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main)'
                                : 'border-(--mui-palette-divider) bg-(--mui-palette-background-paper) text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                        }`}
                        type="button"
                        onClick={() => setIsLegendOpen((prev) => !prev)}
                    >
                        <InfoIcon size={14} />
                        <span>Rating Guide</span>
                        {isLegendOpen
                            ? <CaretUpIcon size={12} />
                            : <CaretDownIcon size={12} />}
                    </button>
                </div>

                {/* Collapsible Mini Legend Ribbon */}
                {isLegendOpen && (
                    <div className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) p-2.5 rounded-lg text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5 animate-fadeIn">
                        {QUICK_RATING_LEGEND.map((item) => (
                            <span
                                className="inline-flex items-center gap-1 text-(--mui-palette-text-secondary)"
                                key={item.value}
                            >
                                <strong className="font-bold text-(--mui-palette-primary-main)">{item.value}</strong>
                                <span>= {item.label}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Questions Scrollable Body — Maximized Screen Space */}
            <div className="flex flex-1 flex-col gap-6 min-h-0 overflow-y-auto pr-1">
                {scrolledSections.map(function({ openRows, ratingRows, section }) {
                    return (
                        <section
                            className="flex flex-col gap-3"
                            key={section.template_id}
                        >
                            <div className="flex flex-col gap-1">
                                <h3 className="bg-(--mui-palette-primary-main)/10 font-semibold px-2 py-0.5 rounded self-start text-(--mui-palette-primary-main) text-xs sm:text-sm">
                                    {section.title}
                                </h3>
                                {section.description && (
                                    <p className="text-(--mui-palette-text-secondary) text-xs">
                                        {section.description}
                                    </p>
                                )}
                            </div>

                            <EvaluationRatingMatrix
                                control={control}
                                disabled={isReadOnly}
                                rows={ratingRows}
                            />

                            {openRows.map(function({ answer, index }) {
                                return (
                                    <EvaluationQuestionField
                                        answer={answer}
                                        control={control}
                                        disabled={isReadOnly}
                                        index={index}
                                        key={answer.question_id}
                                    />
                                );
                            })}
                        </section>
                    );
                })}

                <div
                    className="flex items-center justify-center text-(--mui-palette-text-secondary) text-xs py-2"
                    ref={sentinelRef}
                >
                    {hasMore
                        ? `Loading more questions... (${Math.min(visibleCount, fieldsCount)} of ${fieldsCount})`
                        : ''}
                </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="border-(--mui-palette-divider) border-t flex items-center justify-between gap-3 pt-3 shrink-0 bg-(--mui-palette-background-paper)">
                <CommonButton
                    startIcon={<ArrowLeftIcon size={16} />}
                    variant="outlined"
                    onClick={onBack}
                >
                    Back
                </CommonButton>

                {!isReadOnly
                    ? (
                        <CommonButton
                            disabled={isSubmitting}
                            loading={isSubmitting}
                            variant="contained"
                            onClick={onSubmit}
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Submit Evaluation'}
                        </CommonButton>
                    )
                    : (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Evaluation submitted
                        </span>
                    )}
            </div>
        </div>
    );
}