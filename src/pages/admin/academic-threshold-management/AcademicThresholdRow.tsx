import CommonInput from '@components/input/CommonInput';
import { AcademicThreshold, AcademicThresholdCategory } from '@type/academic-threshold.type';
import { periodRailColor } from '@utils/period-allocation.util';
import { ChangeEvent } from 'react';

export const ACADEMIC_THRESHOLD_GRID_CLASS =
    'gap-3 grid grid-cols-[2rem_minmax(11rem,1.8fr)_6.5rem_6.5rem_7.5rem_6.5rem_6.5rem_4.5rem] items-center min-w-4xl';

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
    threshold: AcademicThresholdDraft;
    onChange: (patch: Partial<AcademicThresholdDraft>) => void;
}

export default function AcademicThresholdRow({
    disabled = false,
    index,
    threshold,
    onChange
}: AcademicThresholdRowProps) {
    const isStanding = threshold.category === 'Standing';
    const isScholarship = threshold.category === 'Scholarship';

    function handleNumericChange(field: keyof AcademicThresholdDraft) {
        return function(event: ChangeEvent<HTMLInputElement>) {
            onChange({ [field]: event.target.value });
        };
    }

    return (
        <div className="border-(--mui-palette-divider) border-t flex flex-col last:border-b">
            <div className={`${ACADEMIC_THRESHOLD_GRID_CLASS} py-3`}>
                <span
                    className="flex font-bold items-center justify-center rounded-(--mui-tokens-radius-md) shrink-0 size-8 text-(--mui-tokens-color-common-white) text-xs"
                    style={{ background: periodRailColor(index) }}
                >
                    {index + 1}
                </span>

                <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm truncate">
                            {threshold.label}
                        </span>
                        <span className={`border font-semibold px-1.5 py-0.2 rounded-full text-[10px] tracking-tight uppercase ${CATEGORY_BADGE_STYLE[threshold.category]}`}>
                            {threshold.category}
                        </span>
                    </div>
                    <span className="font-mono text-(--mui-palette-text-disabled) text-[11px] truncate">
                        {threshold.code}
                    </span>
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
                            <label className="cursor-pointer flex gap-1.5 items-center select-none text-xs">
                                <input
                                    checked={threshold.requires_no_failing}
                                    className="accent-(--mui-palette-primary-main) rounded size-4"
                                    disabled={disabled}
                                    type="checkbox"
                                    onChange={function(e) {
                                        onChange({ requires_no_failing: e.target.checked });
                                    }}
                                />
                                <span className={threshold.requires_no_failing
                                    ? 'font-medium text-blue-700 text-xs'
                                    : 'text-(--mui-palette-text-secondary) text-xs'}
                                >
                                    {threshold.requires_no_failing
                                        ? 'Required'
                                        : 'Optional'}
                                </span>
                            </label>
                        </div>
                    )}

                <div className="flex items-center justify-center">
                    <label className="cursor-pointer flex gap-1.5 items-center select-none text-xs">
                        <input
                            checked={threshold.is_active}
                            className="accent-emerald-600 rounded size-4"
                            disabled={disabled}
                            type="checkbox"
                            onChange={function(e) {
                                onChange({ is_active: e.target.checked });
                            }}
                        />
                        <span className={threshold.is_active
                            ? 'font-bold text-emerald-700 text-xs'
                            : 'font-medium text-(--mui-palette-text-disabled) text-xs'}
                        >
                            {threshold.is_active
                                ? 'Active'
                                : 'Off'}
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}
