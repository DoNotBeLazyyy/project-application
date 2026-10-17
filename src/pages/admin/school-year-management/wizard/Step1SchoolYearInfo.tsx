import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { CopySimpleIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, SchoolYearOption } from '@type/school-year.type';
import { useEffect, useMemo, useRef } from 'react';
import { Control, useFormState, UseFormSetValue, useWatch } from 'react-hook-form';
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

    const { errors } = useFormState({ control });
    const firstErrorField = useMemo(() => {
        const step1Fields: (keyof AcademicYearWizardFormValues)[] = ['start_date', 'end_date', 'code', 'label'];
        return step1Fields.find((f) => Boolean(errors[f]));
    }, [errors]);

    const userEditedCodeRef = useRef(false);
    const userEditedLabelRef = useRef(false);
    const prevDatesRef = useRef({ end: '', start: '' });

    useEffect(() => {
        userEditedCodeRef.current = false;
        userEditedLabelRef.current = false;
        prevDatesRef.current = { end: '', start: '' };
    }, [sourceSchoolYear]);

    useEffect(() => {
        if (!startDate || !endDate) {
            const hadPreviousDates = Boolean(prevDatesRef.current.start && prevDatesRef.current.end);
            prevDatesRef.current = { end: endDate || '', start: startDate || '' };
            if (isNew && !sourceSchoolYear && hadPreviousDates && !startDate && !endDate) {
                if (!userEditedCodeRef.current) {
                    setValue('code', '', { shouldValidate: false, shouldDirty: false });
                }
                if (!userEditedLabelRef.current) {
                    setValue('label', '', { shouldValidate: false, shouldDirty: false });
                }
            }
            return;
        }

        const datesChanged =
            prevDatesRef.current.start !== startDate ||
            prevDatesRef.current.end !== endDate;

        prevDatesRef.current = { end: endDate, start: startDate };

        if (!datesChanged && !sourceSchoolYear) {
            return;
        }

        const autoCode = generateAcademicYearCode(startDate, endDate);
        const autoLabel = generateAcademicYearLabel(startDate, endDate);

        if (!autoCode || !autoLabel) {
            return;
        }

        // In pure edit mode (existing school year not being duplicated), do not overwrite user-cleared fields
        if (!isNew && !sourceSchoolYear) {
            return;
        }

        // When creating fresh or duplicating from another school year:
        const isDuplicatedSourceCode = Boolean(
            sourceSchoolYear &&
            code &&
            code.trim().toLowerCase() === sourceSchoolYear.code.trim().toLowerCase()
        );

        const shouldPopulateCode =
            !userEditedCodeRef.current &&
            (!code || /^AY-\d{4}-\d{4}$/i.test(code.trim()) || isDuplicatedSourceCode);

        if (shouldPopulateCode && code !== autoCode) {
            setValue('code', autoCode, { shouldValidate: true });
        }

        const isDuplicatedSourceLabel = Boolean(
            sourceSchoolYear &&
            label &&
            label.trim().toLowerCase() === sourceSchoolYear.label.trim().toLowerCase()
        );

        const shouldPopulateLabel =
            !userEditedLabelRef.current &&
            (!label || /^Academic Year \d{4}-\d{4}$/i.test(label.trim()) || isDuplicatedSourceLabel);

        if (shouldPopulateLabel && label !== autoLabel) {
            setValue('label', autoLabel, { shouldValidate: true });
        }
    }, [startDate, endDate, isNew, sourceSchoolYear, setValue]);

    return (
        <div className="flex flex-col gap-6">

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

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                    <ValidCommonDatePicker
                        control={control}
                        description="Official start date of the academic calendar. Terms must begin on or after this date."
                        disabled={disabled}
                        isFirstError={firstErrorField === 'start_date'}
                        isRequired
                        label="Start Date"
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
                    <ValidCommonDatePicker
                        control={control}
                        description="Official concluding date of this academic year. Terms must end on or before this date."
                        disabled={disabled}
                        isFirstError={firstErrorField === 'end_date'}
                        isRequired
                        label="End Date"
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
                    <ValidCommonInput
                        control={control}
                        description="Auto-generated unique system identifier for this academic year based on Start and End dates (e.g. AY-2026-2027)."
                        disabled={true}
                        isFirstError={firstErrorField === 'code'}
                        isRequired
                        label="Academic Year Code"
                        name="code"
                        placeholder="e.g. AY-2026-2027"
                        rules={{
                            required: 'Academic year code is required'
                        }}
                        onChange={() => {
                            userEditedCodeRef.current = true;
                        }}
                    />
                    {sourceSchoolYear && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Auto-updated from duplicated year: &quot;{sourceSchoolYear.code}&quot;
                        </p>
                    )}
                </div>

                <div>
                    <ValidCommonInput
                        control={control}
                        description="Auto-generated title displayed on portal headers, report cards, and official transcripts based on Start and End dates."
                        disabled={true}
                        isFirstError={firstErrorField === 'label'}
                        isRequired
                        label="Academic Year Label"
                        name="label"
                        placeholder="e.g. Academic Year 2026-2027"
                        rules={{
                            required: 'Academic year label is required'
                        }}
                        onChange={() => {
                            userEditedLabelRef.current = true;
                        }}
                    />
                    {sourceSchoolYear && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Auto-updated from duplicated year: &quot;{sourceSchoolYear.label}&quot;
                        </p>
                    )}
                </div>
            </div>

            {/* Active Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Set as Active Academic Year
                        <span className="inline-flex align-middle ml-1.5 whitespace-nowrap">
                            <CommonInfoTooltip content="When active, new student enrollments, curriculum schedules, and faculty grade submissions default to this academic year." size={14} />
                        </span>
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
