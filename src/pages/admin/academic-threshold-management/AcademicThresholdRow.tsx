import CommonInput from '@components/input/CommonInput';
import { MinusCircleIcon, SealCheckIcon, TrashIcon } from '@phosphor-icons/react';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { periodRailColor } from '@utils/period-allocation.util';
import { ChangeEvent } from 'react';

export const ACADEMIC_THRESHOLD_GRID_CLASS
    = 'gap-3 grid grid-cols-[2rem_minmax(12rem,1.8fr)_6.5rem_6.5rem_7.5rem_6.5rem_6.5rem_5.5rem_2.5rem] items-center min-w-5xl';

const CATEGORY_BADGE_STYLE: Record<AcademicThresholdCategory, string> = {
    Honor: 'bg-amber-50 text-amber-700 border-amber-200/80',
    Scholarship: 'bg-blue-50 text-blue-700 border-blue-200/80',
    Standing: 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
};

export interface AcademicThresholdDraft {
    id: string;
    category: AcademicThresholdCategory;
    code: string;
    label: string;
    min_gwa: string;
    max_gwa: string;
    min_subject_grade: string;
    requires_no_failing: boolean;
    scholarship_discount_pct: string;
    sort_order: number;
    is_active: boolean;
}

export interface AcademicThresholdRowProps {
    disabled?: boolean;
    index: number;
    isLast?: boolean;
    threshold: AcademicThresholdDraft;
    onChange: (patch: Partial<AcademicThresholdDraft>) => void;
    onDelete: () => void;
}

export default function AcademicThresholdRow({
    disabled = false,
    index,
    isLast = false,
    threshold,
    onChange,
    onDelete
}: AcademicThresholdRowProps) {
    const isStanding = threshold.category === 'Standing';
    const isScholarship = threshold.category === 'Scholarship';
    const isNew = threshold.id.startsWith('temp-');

    function handleNumericChange(field: keyof AcademicThresholdDraft) {
        return function(event: ChangeEvent<HTMLInputElement>) {
            onChange({ [field]: event.target.value });
        };
    }

    function handleCycleCategory() {
        const order: AcademicThresholdCategory[] = ['Honor', 'Scholarship', 'Standing'];
        const currentIdx = order.indexOf(threshold.category);
        const nextCat = order[(currentIdx + 1) % order.length];
        onChange({ category: nextCat });
    }

    return (
        <div className="flex flex-col w-full">
            {/* Desktop View (md and up) */}
            <div
                className={`${ACADEMIC_THRESHOLD_GRID_CLASS} ${isLast
                    ? ''
                    : 'border-(--mui-palette-divider) border-b'} hidden md:grid hover:bg-neutral-50/60 px-3 py-3 transition-colors w-full`}>
                <span
                    className="flex font-bold items-center justify-center rounded-(--mui-tokens-radius-md) shrink-0 size-8 text-(--mui-tokens-color-common-white) text-xs"
                    style={{ background: periodRailColor(index) }}
                >
                    {index + 1}
                </span>

                <div className="flex flex-col gap-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                        {isNew
                            ? (
                                <div className="flex gap-1 items-center">
                                    {(['Honor', 'Scholarship', 'Standing'] as const).map((cat) => (
                                        <button
                                            className={`cursor-pointer font-semibold px-1.5 py-0.2 rounded-full text-[10px] tracking-tight uppercase border transition-colors ${
                                                threshold.category === cat
                                                    ? `${CATEGORY_BADGE_STYLE[cat]} ring-1 ring-current`
                                                    : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                                            }`}
                                            disabled={disabled}
                                            key={cat}
                                            type="button"
                                            onClick={function() {
                                                onChange({ category: cat });
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            )
                            : (
                                <button
                                    className={`border cursor-pointer font-semibold px-1.5 py-0.2 rounded-full text-[10px] tracking-tight uppercase transition-transform active:scale-95 ${CATEGORY_BADGE_STYLE[threshold.category]}`}
                                    disabled={disabled}
                                    title="Click to change category"
                                    type="button"
                                    onClick={handleCycleCategory}
                                >
                                    {threshold.category}
                                </button>
                            )}
                    </div>
                    <CommonInput
                        containerClassName="min-w-0 w-full"
                        disabled={disabled}
                        fullWidth
                        hasClearButton={false}
                        placeholder="Threshold name (e.g. Magna Cum Laude)"
                        size="small"
                        value={threshold.label}
                        onChange={function(event: ChangeEvent<HTMLInputElement>) {
                            onChange({ label: event.target.value });
                        }}
                    />
                </div>

                <CommonInput
                    containerClassName="min-w-0 w-full"
                    disabled={disabled}
                    fullWidth
                    hasClearButton={false}
                    placeholder="e.g. 1.00"
                    size="small"
                    slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                    value={threshold.min_gwa}
                    onChange={handleNumericChange('min_gwa')}
                />

                <CommonInput
                    containerClassName="min-w-0 w-full"
                    disabled={disabled}
                    fullWidth
                    hasClearButton={false}
                    placeholder="e.g. 1.25"
                    size="small"
                    slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                    value={threshold.max_gwa}
                    onChange={handleNumericChange('max_gwa')}
                />

                {isStanding
                    ? (
                        <span className="font-medium text-(--mui-palette-text-disabled) text-center text-xs">
                            &mdash;
                        </span>
                    )
                    : (
                        <CommonInput
                            containerClassName="min-w-0 w-full"
                            disabled={disabled}
                            fullWidth
                            hasClearButton={false}
                            placeholder="e.g. 1.75"
                            size="small"
                            slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                            value={threshold.min_subject_grade}
                            onChange={handleNumericChange('min_subject_grade')}
                        />
                    )}

                {isScholarship
                    ? (
                        <CommonInput
                            containerClassName="min-w-0 w-full"
                            disabled={disabled}
                            fullWidth
                            hasClearButton={false}
                            placeholder="e.g. 100"
                            size="small"
                            slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                            value={threshold.scholarship_discount_pct}
                            onChange={handleNumericChange('scholarship_discount_pct')}
                        />
                    )
                    : (
                        <span className="font-medium text-(--mui-palette-text-disabled) text-center text-xs">
                            &mdash;
                        </span>
                    )}

                {isStanding
                    ? (
                        <span className="font-medium text-(--mui-palette-text-disabled) text-center text-xs">
                            &mdash;
                        </span>
                    )
                    : (
                        <div className="flex items-center justify-center">
                            <button
                                className={`cursor-pointer flex font-bold gap-1 items-center px-2 py-0.5 rounded-full text-[11px] transition-colors shrink-0 ${
                                    threshold.requires_no_failing
                                        ? 'bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100'
                                        : 'bg-neutral-100 border border-neutral-300 text-neutral-500 hover:bg-neutral-200'
                                }`}
                                disabled={disabled}
                                type="button"
                                onClick={function() {
                                    onChange({ requires_no_failing: !threshold.requires_no_failing });
                                }}
                            >
                                {threshold.requires_no_failing
                                    ? (
                                        <>
                                            <SealCheckIcon size={12} weight="bold" />
                                            <span>Required</span>
                                        </>
                                    )
                                    : (
                                        <>
                                            <MinusCircleIcon size={12} weight="bold" />
                                            <span>Optional</span>
                                        </>
                                    )}
                            </button>
                        </div>
                    )}

                <div className="flex items-center justify-center">
                    <button
                        className={`cursor-pointer flex font-bold gap-1.5 items-center px-2 py-0.5 rounded-full text-[11px] transition-colors shrink-0 ${
                            threshold.is_active
                                ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                                : 'bg-neutral-100 border border-neutral-300 text-neutral-500'
                        }`}
                        disabled={disabled}
                        type="button"
                        onClick={function() {
                            onChange({ is_active: !threshold.is_active });
                        }}
                    >
                        <span
                            className={`rounded-full size-1.5 ${threshold.is_active
                                ? 'bg-emerald-500'
                                : 'bg-neutral-400'}`} />
                        {threshold.is_active
                            ? 'Active'
                            : 'Off'}
                    </button>
                </div>

                <div className="flex items-center justify-center">
                    <button
                        aria-label={`Delete ${threshold.label || 'threshold'}`}
                        className="cursor-pointer flex items-center justify-center p-1.5 rounded-(--mui-tokens-radius-md) text-(--mui-palette-text-disabled) hover:text-(--mui-palette-error-main) hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        disabled={disabled}
                        title="Delete threshold"
                        type="button"
                        onClick={onDelete}
                    >
                        <TrashIcon size={16} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Mobile View: 2-tier touch card (< md) */}
            <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-3 md:hidden my-2 p-3.5 rounded-xl shadow-xs">
                {/* Tier 1: Header with Index, Category, Title input, Active switch and Delete button */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center justify-between">
                        <div className="flex gap-2 items-center min-w-0">
                            <span
                                className="flex font-bold items-center justify-center rounded-(--mui-tokens-radius-md) shrink-0 size-7 text-(--mui-tokens-color-common-white) text-xs"
                                style={{ background: periodRailColor(index) }}
                            >
                                {index + 1}
                            </span>
                            {isNew
                                ? (
                                    <div className="flex flex-wrap gap-1 items-center">
                                        {(['Honor', 'Scholarship', 'Standing'] as const).map((cat) => (
                                            <button
                                                className={`cursor-pointer font-semibold px-2 py-0.5 rounded-full text-[10px] tracking-tight uppercase border transition-colors ${
                                                    threshold.category === cat
                                                        ? `${CATEGORY_BADGE_STYLE[cat]} ring-1 ring-current`
                                                        : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                }`}
                                                disabled={disabled}
                                                key={cat}
                                                type="button"
                                                onClick={function() {
                                                    onChange({ category: cat });
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                )
                                : (
                                    <button
                                        className={`border cursor-pointer font-semibold px-2 py-0.5 rounded-full text-[10px] tracking-tight uppercase transition-transform active:scale-95 ${CATEGORY_BADGE_STYLE[threshold.category]}`}
                                        disabled={disabled}
                                        title="Click to change category"
                                        type="button"
                                        onClick={handleCycleCategory}
                                    >
                                        {threshold.category}
                                    </button>
                                )}
                        </div>

                        <div className="flex gap-1.5 items-center shrink-0">
                            <button
                                className={`cursor-pointer flex font-bold gap-1.5 items-center px-2.5 py-1 rounded-full text-xs transition-colors shrink-0 ${
                                    threshold.is_active
                                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                                        : 'bg-neutral-100 border border-neutral-300 text-neutral-500'
                                }`}
                                disabled={disabled}
                                type="button"
                                onClick={function() {
                                    onChange({ is_active: !threshold.is_active });
                                }}
                            >
                                <span
                                    className={`rounded-full size-2 ${threshold.is_active
                                        ? 'bg-emerald-500'
                                        : 'bg-neutral-400'}`} />
                                {threshold.is_active
                                    ? 'Active'
                                    : 'Off'}
                            </button>

                            <button
                                aria-label={`Delete ${threshold.label || 'threshold'}`}
                                className="cursor-pointer flex items-center justify-center p-1.5 rounded-lg text-(--mui-palette-text-disabled) hover:text-(--mui-palette-error-main) hover:bg-red-50 transition-colors shrink-0"
                                disabled={disabled}
                                title="Delete threshold"
                                type="button"
                                onClick={onDelete}
                            >
                                <TrashIcon size={16} weight="bold" />
                            </button>
                        </div>
                    </div>

                    <CommonInput
                        containerClassName="w-full"
                        disabled={disabled}
                        fullWidth
                        hasClearButton={false}
                        placeholder="Threshold Name (e.g. Magna Cum Laude)"
                        size="small"
                        value={threshold.label}
                        onChange={function(event: ChangeEvent<HTMLInputElement>) {
                            onChange({ label: event.target.value });
                        }}
                    />
                </div>

                {/* Tier 2: Form fields without horizontal scroll */}
                <div className="border-(--mui-palette-divider)/60 border-t flex flex-col gap-3 pt-2">
                    {/* Row 1: GWA Range */}
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-(--mui-palette-text-secondary) text-[10px] tracking-wider uppercase">
                            GWA Range (Best &rarr; Cutoff)
                        </span>
                        <div className="gap-2 grid grid-cols-[1fr_auto_1fr] items-center">
                            <CommonInput
                                containerClassName="min-w-0 w-full"
                                disabled={disabled}
                                fullWidth
                                hasClearButton={false}
                                placeholder="e.g. 1.00"
                                size="small"
                                slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                                value={threshold.min_gwa}
                                onChange={handleNumericChange('min_gwa')}
                            />
                            <span className="font-bold text-(--mui-palette-text-disabled) text-center text-sm w-4 shrink-0">&rarr;</span>
                            <CommonInput
                                containerClassName="min-w-0 w-full"
                                disabled={disabled}
                                fullWidth
                                hasClearButton={false}
                                placeholder="e.g. 1.25"
                                size="small"
                                slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                                value={threshold.max_gwa}
                                onChange={handleNumericChange('max_gwa')}
                            />
                        </div>
                    </div>

                    {/* Row 2: Min Subj Floor and Zero Failing Marks in the SAME row with matching field widths */}
                    {!isStanding && (
                        <div className="gap-2 grid grid-cols-[1fr_auto_1fr] items-end">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-(--mui-palette-text-secondary) text-[10px] tracking-wider truncate uppercase">
                                    Min Subj Floor
                                </span>
                                <CommonInput
                                    containerClassName="min-w-0 w-full"
                                    disabled={disabled}
                                    fullWidth
                                    hasClearButton={false}
                                    placeholder="e.g. 1.75"
                                    size="small"
                                    slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                                    value={threshold.min_subject_grade}
                                    onChange={handleNumericChange('min_subject_grade')}
                                />
                            </div>

                            <span
                                aria-hidden="true"
                                className="font-bold opacity-0 pointer-events-none select-none text-center text-sm w-4 shrink-0"
                            >
                                &rarr;
                            </span>

                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-(--mui-palette-text-secondary) text-[10px] tracking-wider truncate uppercase">
                                    Zero Failing Marks
                                </span>
                                <button
                                    className={`cursor-pointer flex font-bold gap-1.5 h-9 items-center justify-center rounded-(--mui-tokens-radius-md) text-xs transition-colors w-full border ${
                                        threshold.requires_no_failing
                                            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                                            : 'bg-neutral-100 border-neutral-300 text-neutral-500 hover:bg-neutral-200'
                                    }`}
                                    disabled={disabled}
                                    type="button"
                                    onClick={function() {
                                        onChange({ requires_no_failing: !threshold.requires_no_failing });
                                    }}
                                >
                                    {threshold.requires_no_failing
                                        ? (
                                            <>
                                                <SealCheckIcon size={14} weight="bold" />
                                                <span>Required</span>
                                            </>
                                        )
                                        : (
                                            <>
                                                <MinusCircleIcon size={14} weight="bold" />
                                                <span>Optional</span>
                                            </>
                                        )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Row 3: Discount % for Scholarship with matching field width */}
                    {isScholarship && (
                        <div className="gap-2 grid grid-cols-[1fr_auto_1fr] items-end">
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="font-bold text-(--mui-palette-text-secondary) text-[10px] tracking-wider truncate uppercase">
                                    Discount %
                                </span>
                                <CommonInput
                                    containerClassName="min-w-0 w-full"
                                    disabled={disabled}
                                    fullWidth
                                    hasClearButton={false}
                                    placeholder="e.g. 100"
                                    size="small"
                                    slotProps={{ htmlInput: { inputMode: 'decimal', style: { textAlign: 'center' } } }}
                                    value={threshold.scholarship_discount_pct}
                                    onChange={handleNumericChange('scholarship_discount_pct')}
                                />
                            </div>

                            <span
                                aria-hidden="true"
                                className="font-bold opacity-0 pointer-events-none select-none text-center text-sm w-4 shrink-0"
                            >
                                &rarr;
                            </span>

                            <div className="min-w-0 w-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}