import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { ArrowRightIcon, CheckCircleIcon, ClockIcon, InfoIcon, UserFocusIcon } from '@phosphor-icons/react';
import { ChangeEventInputTextarea } from '@type/common.type';
import { MyEvaluationRow } from '@type/evaluation.type';

export interface Step1FacultyAndGuideProps {
    enrollmentId: string;
    gradingPeriodId: string;
    targets: MyEvaluationRow[];
    targetOptions: CommonSelectOption[];
    selectedTarget: MyEvaluationRow | null;
    pendingCount: number;
    isLoadingForm: boolean;
    onSelectTarget: (enrollmentId: string, gradingPeriodId: string) => void;
    onProceed: () => void;
}

const RATING_SCALE_ITEMS = [
    {
        rating: 5,
        label: 'Strongly Agree',
        desc: 'Always demonstrates outstanding instructional mastery and excellence.',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    },
    {
        rating: 4,
        label: 'Agree',
        desc: 'Consistently demonstrates dependable performance and thorough competence.',
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    },
    {
        rating: 3,
        label: 'Uncertain',
        desc: 'Meets basic expectations with neutral or variable performance.',
        color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
    },
    {
        rating: 2,
        label: 'Disagree',
        desc: 'Rarely meets expectations; clear and noticeable room for improvement.',
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    },
    {
        rating: 1,
        label: 'Strongly Disagree',
        desc: 'Consistently fails to meet course and instructional requirements.',
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    }
];

export default function Step1FacultyAndGuide({
    enrollmentId,
    gradingPeriodId,
    targets,
    targetOptions,
    selectedTarget,
    pendingCount,
    isLoadingForm,
    onSelectTarget,
    onProceed
}: Step1FacultyAndGuideProps) {
    const hasTarget = Boolean(enrollmentId && gradingPeriodId);

    function handleDropdownChange(event: ChangeEventInputTextarea) {
        const [nextEnrollmentId = '', nextGradingPeriodId = ''] = String(event.target.value).split('|');
        onSelectTarget(nextEnrollmentId, nextGradingPeriodId);
    }

    const selectOptions: CommonSelectOption[] = [
        { label: 'Select a faculty to evaluate...', value: '' },
        ...targetOptions
    ];

    const currentKey = hasTarget ? `${enrollmentId}|${gradingPeriodId}` : '';

    return (
        <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto pr-1">
            {/* Target Faculty Selection */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm sm:text-base">
                        Select Faculty to Evaluate
                    </span>
                    {pendingCount > 0 && (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            {pendingCount} Pending
                        </span>
                    )}
                </div>

                {/* Dropdown Select (Great for fast direct selection) */}
                <CommonSelect
                    fullWidth
                    options={selectOptions}
                    value={currentKey}
                    onChange={handleDropdownChange}
                />

                {/* Faculty Card List (Touch-friendly on mobile) */}
                {targets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {targets.map((target) => {
                            const isSelected =
                                target.enrollment_id === enrollmentId &&
                                target.grading_period_id === gradingPeriodId;

                            return (
                                <div
                                    key={`${target.enrollment_id}-${target.grading_period_id}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelectTarget(target.enrollment_id, target.grading_period_id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelectTarget(target.enrollment_id, target.grading_period_id);
                                        }
                                    }}
                                    className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all select-none ${
                                        isSelected
                                            ? 'border-(--mui-palette-primary-main) bg-(--mui-palette-primary-main)/8 ring-1 ring-(--mui-palette-primary-main)'
                                            : 'border-(--mui-palette-divider) hover:border-(--mui-palette-primary-main)/50 bg-(--mui-palette-background-paper)'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <div
                                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                isSelected
                                                    ? 'bg-(--mui-palette-primary-main) text-(--mui-palette-primary-contrastText)'
                                                    : 'bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary)'
                                            }`}
                                        >
                                            <UserFocusIcon size={18} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm text-(--mui-palette-text-primary) truncate">
                                                {target.faculty_name}
                                            </span>
                                            <span className="text-xs text-(--mui-palette-text-secondary) truncate">
                                                {target.course_code} · {target.section_code}
                                            </span>
                                            <span className="text-[11px] text-(--mui-palette-text-secondary) truncate">
                                                {target.grading_period_name} ({target.term_label})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 mt-0.5">
                                        {target.is_completed ? (
                                            <CommonBadgeStatus label="Completed" size="small" variant="success" />
                                        ) : (
                                            <CommonBadgeStatus label="Pending" size="small" variant="warning" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {targets.length === 0 && (
                    <div className="border border-(--mui-palette-divider) rounded-xl p-6 text-center text-(--mui-palette-text-secondary) text-sm">
                        No faculty evaluations are available for your enrolled sections right now.
                    </div>
                )}
            </div>

            {/* Selected Faculty Confirmation Box */}
            {selectedTarget && (
                <div className="bg-(--mui-palette-primary-main)/5 border border-(--mui-palette-primary-main)/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-(--mui-palette-primary-main)">
                            Selected for Evaluation:
                        </span>
                        <span className="font-semibold text-sm sm:text-base text-(--mui-palette-text-primary) truncate">
                            {selectedTarget.faculty_name}
                        </span>
                        <span className="text-xs text-(--mui-palette-text-secondary) truncate">
                            {selectedTarget.course_code} — {selectedTarget.course_title} · {selectedTarget.section_code}
                        </span>
                    </div>
                    {selectedTarget.is_completed ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <CheckCircleIcon size={16} />
                            <span>Submitted & Completed</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            <ClockIcon size={16} />
                            <span>Awaiting Evaluation</span>
                        </div>
                    )}
                </div>
            )}

            {/* Evaluation Guidelines & Instructions */}
            <div className="border border-(--mui-palette-divider) rounded-xl p-4 flex flex-col gap-3 bg-(--mui-palette-background-paper)">
                <div className="flex items-center gap-2">
                    <InfoIcon className="text-(--mui-palette-primary-main)" size={20} />
                    <h2 className="font-semibold text-sm sm:text-base text-(--mui-palette-text-primary)">
                        Evaluation Instructions
                    </h2>
                </div>
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-(--mui-palette-text-secondary) leading-relaxed">
                    <p>
                        • <strong>Confidential & Objective:</strong> Your responses are completely confidential and will not impact your standing or relationship with the faculty. Please provide honest, constructive feedback.
                    </p>
                    <p>
                        • <strong>Required Questions:</strong> All items marked with an asterisk (<span className="text-(--mui-palette-error-main)">*</span>) are mandatory and must be answered before final submission.
                    </p>
                    <p>
                        • <strong>Grade Unlocking:</strong> Once submitted, official grades for this subject will be immediately visible upon registrar release.
                    </p>
                </div>
            </div>

            {/* Rating Scale Legend */}
            <div className="border border-(--mui-palette-divider) rounded-xl p-4 flex flex-col gap-3 bg-(--mui-palette-background-paper)">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-sm sm:text-base text-(--mui-palette-text-primary)">
                        Rating Scale Guide
                    </h2>
                    <span className="text-xs text-(--mui-palette-text-secondary)">
                        1 (Lowest) to 5 (Highest)
                    </span>
                </div>
                <div className="flex flex-col gap-2">
                    {RATING_SCALE_ITEMS.map((item) => (
                        <div
                            key={item.rating}
                            className="flex items-center gap-3 p-2 rounded-lg border border-(--mui-palette-divider) bg-(--mui-palette-action-hover)/40"
                        >
                            <span
                                className={`size-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 ${item.color}`}
                            >
                                {item.rating}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
                                <span className="font-semibold text-xs text-(--mui-palette-text-primary) shrink-0">
                                    {item.label}:
                                </span>
                                <span className="text-xs text-(--mui-palette-text-secondary) truncate">
                                    {item.desc}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="sticky bottom-0 bg-(--mui-palette-background-paper) border-t border-(--mui-palette-divider) pt-3 pb-1 mt-auto flex justify-end">
                <CommonButton
                    disabled={!hasTarget || isLoadingForm}
                    endIcon={<ArrowRightIcon size={16} />}
                    loading={isLoadingForm}
                    size="medium"
                    variant="contained"
                    onClick={onProceed}
                >
                    {!hasTarget
                        ? 'Select Faculty to Proceed'
                        : selectedTarget?.is_completed
                            ? 'View Submitted Evaluation'
                            : 'Proceed to Evaluation Form'}
                </CommonButton>
            </div>
        </div>
    );
}
