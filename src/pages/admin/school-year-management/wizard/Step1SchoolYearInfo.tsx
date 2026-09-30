import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { BroomIcon, CopySimpleIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, SchoolYearOption } from '@type/school-year.type';
import { useEffect, useRef } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';
import {
    checkSchoolYearCodeConflict,
    checkSchoolYearDateConflict,
    checkSchoolYearLabelConflict,
    ExistingSchoolYearComparison,
    generateAcademicYearCode,
    generateAcademicYearLabel,
    SourceSchoolYearInfo
} from './wizard.constants';

interface Step1SchoolYearInfoProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    isNew?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
    sourceSchoolYear?: SourceSchoolYearInfo | null;
    availableSourceYears?: SchoolYearOption[];
    existingSchoolYears?: ExistingSchoolYearComparison[];
    currentSchoolYearId?: string | null;
    onSelectSourceYear?: (sourceId: string) => void;
    onClearSourceYear?: () => void;
}

export default function Step1SchoolYearInfo({
    availableSourceYears = [],
    control,
    currentSchoolYearId = null,
    disabled = false,
    existingSchoolYears = [],
    isNew = true,
    onClearSourceYear,
    onSelectSourceYear,
    setValue,
    sourceSchoolYear
}: Step1SchoolYearInfoProps) {
    const startDate = useWatch({ control, name: 'start_date' });
    const endDate = useWatch({ control, name: 'end_date' });
    const code = useWatch({ control, name: 'code' });
    const label = useWatch({ control, name: 'label' });

    const userEditedCodeRef = useRef(false);
    const userEditedLabelRef = useRef(false);

    function handleClearForm() {
        setValue('start_date', '', { shouldValidate: false, shouldDirty: true });
        setValue('end_date', '', { shouldValidate: false, shouldDirty: true });
        setValue('code', '', { shouldValidate: false, shouldDirty: true });
        setValue('label', '', { shouldValidate: false, shouldDirty: true });
        setValue('is_active', false, { shouldValidate: false, shouldDirty: true });
        userEditedCodeRef.current = false;
        userEditedLabelRef.current = false;
        if (onClearSourceYear) {
            onClearSourceYear();
        }
    }

    useEffect(() => {
        userEditedCodeRef.current = false;
        userEditedLabelRef.current = false;
    }, [sourceSchoolYear]);

    useEffect(() => {
        if (!startDate || !endDate) {
            return;
        }

        const autoCode = generateAcademicYearCode(startDate, endDate);
        const autoLabel = generateAcademicYearLabel(startDate, endDate);

        if (!autoCode || !autoLabel) {
            return;
        }

        // In pure edit mode (existing school year not being duplicated), only populate if fields are blank
        if (!isNew && !sourceSchoolYear) {
            if (!code || !code.trim()) {
                setValue('code', autoCode, { shouldValidate: true });
            }
            if (!label || !label.trim()) {
                setValue('label', autoLabel, { shouldValidate: true });
            }
            return;
        }

        // When creating fresh or duplicating from another school year:
        const isDuplicatedSourceCode = Boolean(
            sourceSchoolYear &&
            code &&
            code.trim().toLowerCase() === sourceSchoolYear.code.trim().toLowerCase()
        );

        const shouldPopulateCode =
            !userEditedCodeRef.current ||
            !code ||
            !code.trim() ||
            /^AY-\d{4}-\d{4}$/i.test(code.trim()) ||
            isDuplicatedSourceCode;

        if (shouldPopulateCode && code !== autoCode) {
            setValue('code', autoCode, { shouldValidate: true });
        }

        const isDuplicatedSourceLabel = Boolean(
            sourceSchoolYear &&
            label &&
            label.trim().toLowerCase() === sourceSchoolYear.label.trim().toLowerCase()
        );

        const shouldPopulateLabel =
            !userEditedLabelRef.current ||
            !label ||
            !label.trim() ||
            /^Academic Year \d{4}-\d{4}$/i.test(label.trim()) ||
            isDuplicatedSourceLabel;

        if (shouldPopulateLabel && label !== autoLabel) {
            setValue('label', autoLabel, { shouldValidate: true });
        }
    }, [startDate, endDate, isNew, sourceSchoolYear, setValue, code, label]);

    return (
        <div className="flex flex-col gap-6">
            {/* Step Header Block with Description & Clear Form Button */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Academic Year Details</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Define operational start and end dates, system code, display label, and active status.
                    </p>
                </div>
                {!disabled && (
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<BroomIcon className="w-4 h-4" />}
                        variant="outlined"
                        onClick={handleClearForm}
                        title="Clear form fields in this step"
                    >
                        <span className="hidden sm:inline">Clear Form</span>
                        <span className="sm:hidden">Clear</span>
                    </CommonButton>
                )}
            </div>

            {/* Duplicate Banner when duplicating from an existing academic year */}
            {sourceSchoolYear && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-800/60 text-sm">
                    <div className="flex items-start gap-3">
                        <CopySimpleIcon
                            className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                            weight="bold"
                        />
                        <div className="space-y-1 text-slate-800 dark:text-slate-200">
                            <p className="font-semibold text-amber-900 dark:text-amber-200">
                                Duplicating configuration from {sourceSchoolYear.label} ({sourceSchoolYear.code})
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300/90">
                                Terms, grading periods, grade transmutation table, and academic thresholds have been copied.
                                <span className="font-semibold block sm:inline sm:ml-1">
                                    You are required to change and set a new Academic Year Code, Label, and Dates.
                                </span>
                            </p>
                        </div>
                    </div>
                    {!disabled && onClearSourceYear && (
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={onClearSourceYear}
                        >
                            Start Blank
                        </CommonButton>
                    )}
                </div>
            )}

            {/* Dropdown to copy from existing school year when creating fresh */}
            {isNew && !sourceSchoolYear && availableSourceYears && availableSourceYears.length > 0 && (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <CopySimpleIcon className="w-4 h-4 text-brand-600" weight="bold" />
                            <span>Duplicate from Existing Academic Year (Optional)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Copy terms, grading periods, transmutation rules, and thresholds from an existing year instead of setting them up manually.
                        </p>
                    </div>
                    <div className="sm:w-72 shrink-0">
                        <select
                            aria-label="Select Academic Year to duplicate configuration"
                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                            disabled={disabled}
                            value=""
                            onChange={(e) => {
                                if (e.target.value && onSelectSourceYear) {
                                    onSelectSourceYear(e.target.value);
                                }
                            }}
                        >
                            <option value="">-- Select Academic Year to Copy --</option>
                            {availableSourceYears.map((sy) => (
                                <option key={sy.id} value={sy.id}>
                                    {sy.label} ({sy.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        <span>Start Date <span className="text-red-500">*</span></span>
                        <CommonInfoTooltip content="Official start date of the academic calendar. Terms must begin on or after this date." size={14} />
                    </label>
                    <ValidCommonDatePicker
                        control={control}
                        disabled={disabled}
                        name="start_date"
                        rules={{
                            required: 'Start date is required',
                            validate: (val) => {
                                if (!val) return 'Start date is required';
                                if (endDate) {
                                    if (new Date(endDate) <= new Date(val as string)) {
                                        return 'Start date must be strictly before end date';
                                    }
                                    const dateConflict = checkSchoolYearDateConflict(
                                        val as string,
                                        endDate,
                                        existingSchoolYears,
                                        currentSchoolYearId,
                                        sourceSchoolYear
                                    );
                                    if (dateConflict) return dateConflict;
                                } else if (
                                    sourceSchoolYear &&
                                    val === sourceSchoolYear.start_date &&
                                    endDate === sourceSchoolYear.end_date
                                ) {
                                    return 'Dates must be changed from the duplicated year';
                                }
                                return true;
                            }
                        }}
                    />
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        <span>End Date <span className="text-red-500">*</span></span>
                        <CommonInfoTooltip content="Official concluding date of this academic year. Terms must end on or before this date." size={14} />
                    </label>
                    <ValidCommonDatePicker
                        control={control}
                        disabled={disabled}
                        name="end_date"
                        rules={{
                            required: 'End date is required',
                            validate: (val) => {
                                if (!val) return 'End date is required';
                                if (startDate) {
                                    if (new Date(val as string) <= new Date(startDate)) {
                                        return 'End date must be strictly after start date';
                                    }
                                    const dateConflict = checkSchoolYearDateConflict(
                                        startDate,
                                        val as string,
                                        existingSchoolYears,
                                        currentSchoolYearId,
                                        sourceSchoolYear
                                    );
                                    if (dateConflict) return dateConflict;
                                } else if (
                                    sourceSchoolYear &&
                                    startDate === sourceSchoolYear.start_date &&
                                    val === sourceSchoolYear.end_date
                                ) {
                                    return 'Dates must be changed from the duplicated year';
                                }
                                return true;
                            }
                        }}
                    />
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        <span>Academic Year Code <span className="text-red-500">*</span></span>
                        <CommonInfoTooltip content="Unique system identifier for this academic year (e.g. AY-2026-2027)." size={14} />
                    </label>
                    <ValidCommonInput
                        control={control}
                        disabled={disabled}
                        name="code"
                        placeholder="e.g. AY-2026-2027"
                        onChange={() => {
                            userEditedCodeRef.current = true;
                        }}
                        rules={{
                            required: 'Academic year code is required',
                            validate: (val) => {
                                if (!val || !(val as string).trim()) return 'Academic year code is required';
                                const codeConflict = checkSchoolYearCodeConflict(
                                    val as string,
                                    existingSchoolYears,
                                    currentSchoolYearId,
                                    sourceSchoolYear
                                );
                                if (codeConflict) return codeConflict;
                                return true;
                            }
                        }}
                    />
                    {sourceSchoolYear && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Required to change from: &quot;{sourceSchoolYear.code}&quot;
                        </p>
                    )}
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        <span>Academic Year Label <span className="text-red-500">*</span></span>
                        <CommonInfoTooltip content="Human-friendly title displayed on portal headers, report cards, and official transcripts." size={14} />
                    </label>
                    <ValidCommonInput
                        control={control}
                        disabled={disabled}
                        name="label"
                        placeholder="e.g. Academic Year 2026-2027"
                        onChange={() => {
                            userEditedLabelRef.current = true;
                        }}
                        rules={{
                            required: 'Academic year label is required',
                            validate: (val) => {
                                if (!val || !(val as string).trim()) return 'Academic year label is required';
                                const labelConflict = checkSchoolYearLabelConflict(
                                    val as string,
                                    existingSchoolYears,
                                    currentSchoolYearId,
                                    sourceSchoolYear
                                );
                                if (labelConflict) return labelConflict;
                                return true;
                            }
                        }}
                    />
                    {sourceSchoolYear && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Required to change from: &quot;{sourceSchoolYear.label}&quot;
                        </p>
                    )}
                </div>
            </div>

            {/* Active Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>Set as Active Academic Year</span>
                        <CommonInfoTooltip content="When active, new student enrollments, curriculum schedules, and faculty grade submissions default to this academic year." size={14} />
                    </span>
                </div>
                <ValidCommonCheckbox
                    control={control}
                    disabled={disabled}
                    name="is_active"
                />
            </div>
        </div>
    );
}
