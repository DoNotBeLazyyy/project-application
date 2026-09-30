import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    FastForwardIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    getAcademicYearCalendarDetails,
    getSchoolYears,
    saveAcademicYearCalendar
} from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import {
    AcademicYearWizardFormValues,
    SaveAcademicYearCalendarPayload,
    SchoolYearOption
} from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import AcademicYearHistoryModal from '../history/AcademicYearHistoryModal';
import Step1SchoolYearInfo from './Step1SchoolYearInfo';
import Step2TermsConfig from './Step2TermsConfig';
import Step3GradingPeriodsConfig from './Step3GradingPeriodsConfig';
import Step4TransmutationConfig from './Step4TransmutationConfig';
import Step5ThresholdsConfig from './Step5ThresholdsConfig';
import {
    cloneSchoolYearForDuplication,
    DEFAULT_ACADEMIC_THRESHOLDS,
    DEFAULT_TRANSMUTATION_ROWS,
    ExistingSchoolYearComparison,
    generateAcademicYearCode,
    generateAcademicYearLabel,
    isSpecialGradeRow,
    shiftDateByOneYear,
    SourceSchoolYearInfo,
    validateGradingPeriods,
    validateStep1SchoolYear,
    validateTerms,
    validateTransmutationRows,
    WIZARD_STEPS
} from './wizard.constants';

interface AcademicYearWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    schoolYearId?: string | null;
    duplicateSchoolYearId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AcademicYearWizardModal({
    open,
    readOnly: initialReadOnly = false,
    schoolYearId,
    duplicateSchoolYearId,
    onClose,
    onSuccess
}: AcademicYearWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const [sourceSchoolYear, setSourceSchoolYear] = useState<SourceSchoolYearInfo | null>(null);
    const [availableSourceYears, setAvailableSourceYears] = useState<SchoolYearOption[]>([]);
    const [existingSchoolYears, setExistingSchoolYears] = useState<ExistingSchoolYearComparison[]>([]);

    const defaultValues: AcademicYearWizardFormValues = {
        code: '',
        end_date: '',
        evaluation_scope: 'Period',
        holidays: [],
        id: null,
        is_active: false,
        label: '',
        max_units_per_term: 24,
        start_date: '',
        terms: [],
        thresholds: [],
        transmutation_rows: []
    };

    const methods = useForm<AcademicYearWizardFormValues>({
        defaultValues
    });

    const { control, getValues, reset, setValue, watch } = methods;

    async function loadAndDuplicateSchoolYear(sourceId: string) {
        setIsLoading(true);
        try {
            const res = await getAcademicYearCalendarDetails(sourceId);
            if (res.data) {
                const data = res.data;
                setSourceSchoolYear({
                    id: data.id,
                    code: data.code,
                    label: data.label,
                    start_date: data.start_date,
                    end_date: data.end_date
                });
                const cloned = cloneSchoolYearForDuplication(data);
                reset({
                    ...defaultValues,
                    ...cloned
                });
                useToastStore.getState().showToast(
                    `Duplicated configuration from ${data.label}. Please specify a new Academic Year Code, Label, and Dates.`,
                    'info'
                );
            }
        } finally {
            setIsLoading(false);
        }
    }

    function handleClearDuplication() {
        setSourceSchoolYear(null);
        reset(defaultValues);
    }

    // Fetch existing school years list for in-wizard duplication dropdown and uniqueness validation
    useEffect(() => {
        if (open) {
            getSchoolYears().then((res) => {
                if (res.data) {
                    setExistingSchoolYears(res.data);
                    setAvailableSourceYears(res.data);
                }
            });
        }
    }, [open]);

    // Load existing school year calendar details when modal opens with schoolYearId or duplicateSchoolYearId
    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            reset(defaultValues);
            setIsReadOnly(initialReadOnly);
            setIsHistoryModalOpen(false);
            setSourceSchoolYear(null);
            return;
        }

        setIsReadOnly(initialReadOnly);

        if (schoolYearId) {
            setSourceSchoolYear(null);
            setIsLoading(true);
            getAcademicYearCalendarDetails(schoolYearId)
                .then((res) => {
                    if (res.data) {
                        const data = res.data;
                        reset({
                            code: data.code || '',
                            end_date: data.end_date || '',
                            evaluation_scope: data.evaluation_scope || 'Period',
                            holidays: data.holidays || [],
                            id: data.id,
                            is_active: Boolean(data.is_active),
                            label: data.label || '',
                            max_units_per_term: data.max_units_per_term ?? 24,
                            start_date: data.start_date || '',
                            terms: (data.terms && data.terms.length > 0 ? data.terms : []).map((t) => ({
                                ...t,
                                max_units: t.max_units ?? 24,
                                evaluation_scope: t.evaluation_scope || data.evaluation_scope || 'Period'
                            })),
                            thresholds: data.thresholds || [],
                            transmutation_rows: (data.transmutation_rows || []).map((r) => {
                                const isSpecial = isSpecialGradeRow(r);
                                return {
                                    ...r,
                                    max_percentage: isSpecial ? null : r.max_percentage,
                                    min_percentage: isSpecial ? null : r.min_percentage,
                                    transmuted_grade: isSpecial ? null : r.transmuted_grade
                                };
                            })
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else if (duplicateSchoolYearId) {
            loadAndDuplicateSchoolYear(duplicateSchoolYearId);
        } else {
            setSourceSchoolYear(null);
            reset(defaultValues);
        }
    }, [open, schoolYearId, duplicateSchoolYearId, initialReadOnly]);

    // Validation for Step 1
    function validateStep1(): boolean {
        const values = getValues();
        const result = validateStep1SchoolYear(
            values,
            sourceSchoolYear,
            existingSchoolYears,
            schoolYearId
        );
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 2
    function validateStep2(): boolean {
        const values = getValues();
        const result = validateTerms(values.terms || [], values.start_date, values.end_date);
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 3
    function validateStep3(): boolean {
        const values = getValues();
        const terms = values.terms || [];
        const result = validateGradingPeriods(terms);
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 4
    function validateStep4(): boolean {
        const values = getValues();
        const rows = values.transmutation_rows || [];
        const result = validateTransmutationRows(rows);
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 5
    function validateStep5(): boolean {
        const values = getValues();
        const thresholds = values.thresholds || [];

        for (let i = 0; i < thresholds.length; i++) {
            const t = thresholds[i];
            if (!t.label || !t.label.trim()) {
                useToastStore.getState().showToast(
                    `Threshold #${i + 1} must have a Name / Label (e.g. Summa Cum Laude).`,
                    'error'
                );
                return false;
            }
            if (t.max_gwa === '' || t.max_gwa === null || t.max_gwa === undefined) {
                useToastStore.getState().showToast(
                    `Threshold "${t.label}" must specify a Max GWA cutoff.`,
                    'error'
                );
                return false;
            }
        }
        return true;
    }

    function handleRollForwardOneYear() {
        const values = getValues();
        const newStart = shiftDateByOneYear(values.start_date);
        const newEnd = shiftDateByOneYear(values.end_date);

        let newCode = values.code;
        let newLabel = values.label;
        if (newStart && newEnd) {
            const autoCode = generateAcademicYearCode(newStart, newEnd);
            const autoLabel = generateAcademicYearLabel(newStart, newEnd);
            if (autoCode) newCode = autoCode;
            if (autoLabel) newLabel = autoLabel;
        }

        const updatedTerms = (values.terms || []).map((t) => ({
            ...t,
            start_date: shiftDateByOneYear(t.start_date),
            end_date: shiftDateByOneYear(t.end_date),
            enrollment_start_date: t.enrollment_start_date ? shiftDateByOneYear(t.enrollment_start_date) : null,
            enrollment_end_date: t.enrollment_end_date ? shiftDateByOneYear(t.enrollment_end_date) : null,
            grading_deadline: t.grading_deadline ? shiftDateByOneYear(t.grading_deadline) : null,
            grading_periods: (t.grading_periods || []).map((gp) => ({
                ...gp,
                start_date: gp.start_date ? shiftDateByOneYear(gp.start_date) : null,
                end_date: gp.end_date ? shiftDateByOneYear(gp.end_date) : null
            }))
        }));

        const updatedHolidays = (values.holidays || []).map((h) => ({
            ...h,
            start_date: shiftDateByOneYear(h.start_date),
            end_date: shiftDateByOneYear(h.end_date)
        }));

        setValue('start_date', newStart, { shouldDirty: true });
        setValue('end_date', newEnd, { shouldDirty: true });
        setValue('code', newCode, { shouldDirty: true });
        setValue('label', newLabel, { shouldDirty: true });
        setValue('terms', updatedTerms, { shouldDirty: true });
        setValue('holidays', updatedHolidays, { shouldDirty: true });

        useToastStore.getState().showToast(
            'Rolled forward all dates (School Year, Terms, Enrollment Windows, Grading Periods, Holidays & Exceptions) by +1 Year.',
            'success'
        );
    }

    function handleNext() {
        if (currentStep === 1) {
            if (!validateStep1()) return;
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!validateStep2()) return;
            setCurrentStep(3);
        } else if (currentStep === 3) {
            if (!validateStep3()) return;
            setCurrentStep(4);
        } else if (currentStep === 4) {
            if (!validateStep4()) return;
            setCurrentStep(5);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    function handleStepClick(stepNumber: number) {
        if (isReadOnly) {
            setCurrentStep(stepNumber);
            return;
        }

        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }

        // Validate sequentially
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        if (currentStep === 3 && !validateStep3()) return;
        if (currentStep === 4 && !validateStep4()) return;

        setCurrentStep(stepNumber);
    }

    async function handleSave() {
        if (
            !validateStep1() ||
            !validateStep2() ||
            !validateStep3() ||
            !validateStep4() ||
            !validateStep5()
        ) {
            return;
        }

        setIsSaving(true);
        const values = getValues();

        const payload: SaveAcademicYearCalendarPayload = {
            p_code: values.code.trim(),
            p_end_date: values.end_date,
            p_evaluation_scope: values.evaluation_scope || 'Period',
            p_is_active: Boolean(values.is_active),
            p_label: values.label.trim(),
            p_max_units_per_term: values.max_units_per_term ? Number(values.max_units_per_term) : 24,
            p_school_year_id: values.id || null,
            p_start_date: values.start_date,
            p_terms: (values.terms || []).map((t) => ({
                id: t.id,
                term_type_id: t.term_type_id,
                start_date: t.start_date,
                end_date: t.end_date,
                max_units: t.max_units ? Number(t.max_units) : 24,
                enrollment_start_date: t.enrollment_start_date || null,
                enrollment_end_date: t.enrollment_end_date || null,
                grading_deadline: t.grading_deadline || null,
                status: t.status || 'Upcoming',
                evaluation_scope: t.evaluation_scope || values.evaluation_scope || 'Period',
                grading_periods: (t.grading_periods || []).map((gp, idx) => ({
                    id: gp.id,
                    name: gp.name.trim(),
                    sequence: gp.sequence || (idx + 1),
                    start_date: gp.start_date || null,
                    end_date: gp.end_date || null,
                    weight: Number(gp.weight) || 0
                }))
            })),
            p_thresholds: (values.thresholds || []).map((th, idx) => {
                const labelTrimmed = (th.label || '').trim() || `Threshold #${idx + 1}`;
                const autoCode = labelTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                return {
                    id: th.id,
                    category: th.category || 'Honor',
                    code: (th.code || '').trim() || autoCode || `threshold_${idx + 1}`,
                    label: labelTrimmed,
                    min_gwa:
                        th.min_gwa !== null && th.min_gwa !== undefined && th.min_gwa !== ''
                            ? Number(th.min_gwa)
                            : null,
                    max_gwa: Number(th.max_gwa) || 1.75,
                    min_subject_grade:
                        th.min_subject_grade !== null &&
                        th.min_subject_grade !== undefined &&
                        th.min_subject_grade !== ''
                            ? Number(th.min_subject_grade)
                            : null,
                    requires_no_failing: Boolean(th.requires_no_failing),
                    scholarship_discount_pct:
                        th.scholarship_discount_pct !== null &&
                        th.scholarship_discount_pct !== undefined &&
                        th.scholarship_discount_pct !== ''
                            ? Number(th.scholarship_discount_pct)
                            : null,
                    sort_order: th.sort_order || idx + 1,
                    is_active: Boolean(th.is_active)
                };
            }),
            p_transmutation_rows: (values.transmutation_rows || []).map((r, idx) => {
                const isSpecial = isSpecialGradeRow(r);
                return {
                    id: r.id,
                    label: (r.label || '').trim() || `Row #${idx + 1}`,
                    min_percentage: isSpecial
                        ? 0
                        : (r.min_percentage !== null && r.min_percentage !== undefined && r.min_percentage !== ''
                            ? Number(r.min_percentage)
                            : 0),
                    max_percentage: isSpecial
                        ? 0
                        : (r.max_percentage !== null && r.max_percentage !== undefined && r.max_percentage !== ''
                            ? Number(r.max_percentage)
                            : 0),
                    transmuted_grade:
                        !isSpecial &&
                        r.transmuted_grade !== null &&
                        r.transmuted_grade !== undefined &&
                        r.transmuted_grade !== ''
                            ? Number(r.transmuted_grade)
                            : null,
                    is_passing: Boolean(r.is_passing),
                    special_code: r.special_code ? r.special_code.trim() : null,
                    description: r.description ? r.description.trim() : null
                };
            }),
            p_holidays: (values.holidays || []).map((h) => ({
                id: h.id,
                title: (h.title || '').trim(),
                exception_type: h.exception_type || 'Holiday',
                start_date: h.start_date,
                end_date: h.end_date,
                affects_attendance: Boolean(h.affects_attendance),
                description: h.description ? h.description.trim() : null
            }))
        };

        const res = await saveAcademicYearCalendar(payload);
        setIsSaving(false);

        if (!res.error) {
            onSuccess();
            onClose();
        }
    }

    const currentStepConfig = WIZARD_STEPS.find((s) => s.step === currentStep);

    return (
        <CommonModal
            cardProps={{
                className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={onClose}
        >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <CalendarDotsIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {schoolYearId
                                    ? isReadOnly
                                        ? 'Academic Year Calendar & Criteria'
                                        : 'Edit Academic Year & Calendar'
                                    : sourceSchoolYear
                                    ? `Duplicate Academic Year: ${sourceSchoolYear.label}`
                                    : 'Create Academic Year & Calendar'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {sourceSchoolYear
                                    ? `Duplicating configuration from ${sourceSchoolYear.code}. Enter a new academic year identity and dates.`
                                    : 'Unified setup for operational dates, terms, grading periods, grade schema, and academic thresholds.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop Actions (Roll Forward, History, Edit) */}
                        <div className="hidden sm:flex items-center gap-2">
                            {!isReadOnly && (
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    startIcon={<FastForwardIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={handleRollForwardOneYear}
                                >
                                    Roll Forward +1 Year
                                </CommonButton>
                            )}

                            {schoolYearId && (
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    startIcon={<ClockCounterClockwiseIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={() => setIsHistoryModalOpen(true)}
                                >
                                    History
                                </CommonButton>
                            )}

                            {isReadOnly && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={() => setIsReadOnly(false)}
                                >
                                    Edit
                                </CommonButton>
                            )}
                        </div>

                        <button
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Close"
                            type="button"
                            onClick={onClose}
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Actions: placed below label and description to prevent vertical narrowing */}
                {(!isReadOnly || schoolYearId) && (
                    <div className="flex sm:hidden items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 overflow-x-auto">
                        {!isReadOnly && (
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<FastForwardIcon className="w-4 h-4" />}
                                variant="outlined"
                                onClick={handleRollForwardOneYear}
                            >
                                Roll Forward +1 Year
                            </CommonButton>
                        )}

                        {schoolYearId && (
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<ClockCounterClockwiseIcon className="w-4 h-4" />}
                                variant="outlined"
                                onClick={() => setIsHistoryModalOpen(true)}
                            >
                                History
                            </CommonButton>
                        )}

                        {isReadOnly && (
                            <CommonButton
                                color="primary"
                                size="small"
                                startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                variant="outlined"
                                onClick={() => setIsReadOnly(false)}
                            >
                                Edit
                            </CommonButton>
                        )}
                    </div>
                )}
            </div>

            {/* Stepper Progress Bar */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 px-4 py-3 shrink-0">
                {/* Desktop Stepper (>= 768px) */}
                <div className="hidden md:grid grid-cols-5 gap-2">
                    {WIZARD_STEPS.map((s) => {
                        const isActive = currentStep === s.step;
                        const isDone = currentStep > s.step;

                        return (
                            <button
                                key={s.step}
                                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                                    isActive
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm border border-brand-300 dark:border-brand-700/60'
                                        : 'hover:bg-white/60 dark:hover:bg-zinc-800/40 opacity-80'
                                }`}
                                type="button"
                                onClick={() => handleStepClick(s.step)}
                            >
                                <span
                                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                        isActive
                                            ? 'bg-brand-600 text-white'
                                            : isDone
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {isDone ? <CheckCircleIcon className="w-4 h-4" /> : s.step}
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        className={`text-xs font-semibold truncate ${
                                            isActive
                                                ? 'text-brand-600 dark:text-brand-400'
                                                : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {s.title}
                                    </span>
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <CommonInfoTooltip content={s.subtitle} size={14} />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Mobile Stepper Header (< 768px) */}
                <div className="block md:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span>Step {currentStep} of 5: {currentStepConfig?.title}</span>
                            {currentStepConfig?.subtitle && (
                                <CommonInfoTooltip content={currentStepConfig.subtitle} size={14} />
                            )}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {Math.round((currentStep / 5) * 100)}%
                        </span>
                    </div>
                    {/* Progress Bar Line */}
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden flex">
                        <div
                            className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(currentStep / 5) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading academic year calendar details...</p>
                    </div>
                ) : (
                    <>
                        {currentStep === 1 && (
                            <Step1SchoolYearInfo
                                availableSourceYears={availableSourceYears}
                                control={control}
                                currentSchoolYearId={schoolYearId}
                                disabled={isReadOnly}
                                existingSchoolYears={existingSchoolYears}
                                isNew={!schoolYearId}
                                setValue={setValue}
                                sourceSchoolYear={sourceSchoolYear}
                                onClearSourceYear={handleClearDuplication}
                                onSelectSourceYear={(id) => loadAndDuplicateSchoolYear(id)}
                            />
                        )}

                        {currentStep === 2 && (
                            <Step2TermsConfig
                                control={control}
                                disabled={isReadOnly}
                            />
                        )}

                        {currentStep === 3 && (
                            <Step3GradingPeriodsConfig
                                control={control}
                                disabled={isReadOnly}
                                onChangeTerms={(updated) => setValue('terms', updated, { shouldDirty: true })}
                            />
                        )}

                        {currentStep === 4 && (
                            <Step4TransmutationConfig
                                control={control}
                                disabled={isReadOnly}
                            />
                        )}

                        {currentStep === 5 && (
                            <Step5ThresholdsConfig
                                control={control}
                                disabled={isReadOnly}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                {/* Back Button */}
                <CommonButton
                    color="inherit"
                    disabled={currentStep === 1 || isLoading || isSaving}
                    size="medium"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    variant="outlined"
                    onClick={handleBack}
                >
                    Back
                </CommonButton>

                {/* Step indicator on desktop */}
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                    Step {currentStep} of 5 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 5 ? (
                        <CommonButton
                            color="primary"
                            disabled={isLoading}
                            endIcon={<ArrowRightIcon className="w-4 h-4" />}
                            size="medium"
                            variant="contained"
                            onClick={handleNext}
                        >
                            Next Step
                        </CommonButton>
                    ) : isReadOnly ? (
                        <CommonButton
                            color="primary"
                            size="medium"
                            variant="contained"
                            onClick={onClose}
                        >
                            Close
                        </CommonButton>
                    ) : (
                        <CommonButton
                            color="primary"
                            disabled={isLoading || isSaving}
                            size="medium"
                            startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={handleSave}
                        >
                            {isSaving ? 'Saving Calendar...' : 'Save Calendar'}
                        </CommonButton>
                    )}
                </div>
            </div>

            {/* History Modal */}
            <AcademicYearHistoryModal
                open={isHistoryModalOpen}
                schoolYearId={schoolYearId}
                schoolYearLabel={watch('label')}
                onClose={() => setIsHistoryModalOpen(false)}
            />
        </CommonModal>
    );
}
