import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    EyeIcon,
    FastForwardIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    getAcademicYearCalendarDetails,
    getSchoolYears,
    saveAcademicYearCalendar
} from '@services/school-year.service';
import { createTermType, getTermTypes } from '@services/term/term-type.service';
import { useToastStore } from '@stores/toast.store';
import {
    AcademicYearWizardFormValues,
    SaveAcademicYearCalendarPayload,
    SchoolYearOption
} from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import AcademicYearHistoryModal from '../history/AcademicYearHistoryModal';
import AcademicYearSchedulePreviewModal from './AcademicYearSchedulePreviewModal';
import Step1SchoolYearInfo from './Step1SchoolYearInfo';
import Step2TermsConfig from './Step2TermsConfig';
import Step3GradingPeriodsConfig from './Step3GradingPeriodsConfig';
import Step4HolidaysConfig from './Step4HolidaysConfig';
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
    validateCalendarExceptions,
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
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

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

    // Validation for Step 4 (Holidays & Exceptions)
    function validateStep4(): boolean {
        const values = getValues();
        const holidays = values.holidays || [];
        const result = validateCalendarExceptions(holidays);
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 5 (Grade Schema)
    function validateStep5(): boolean {
        const values = getValues();
        const rows = values.transmutation_rows || [];
        const result = validateTransmutationRows(rows);
        if (!result.isValid && result.error) {
            useToastStore.getState().showToast(result.error, 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 6 (Academic Thresholds)
    function validateStep6(): boolean {
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
                end_date: gp.end_date ? shiftDateByOneYear(gp.end_date) : null,
                major_exam_start_date: gp.major_exam_start_date ? shiftDateByOneYear(gp.major_exam_start_date) : null,
                major_exam_end_date: gp.major_exam_end_date ? shiftDateByOneYear(gp.major_exam_end_date) : null,
                grade_encoding_start_date: gp.grade_encoding_start_date ? shiftDateByOneYear(gp.grade_encoding_start_date) : null,
                grade_encoding_end_date: gp.grade_encoding_end_date ? shiftDateByOneYear(gp.grade_encoding_end_date) : null
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
        } else if (currentStep === 5) {
            if (!validateStep5()) return;
            setCurrentStep(6);
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
        if (currentStep === 5 && !validateStep5()) return;

        setCurrentStep(stepNumber);
    }

    async function handleSave() {
        if (
            !validateStep1() ||
            !validateStep2() ||
            !validateStep3() ||
            !validateStep4() ||
            !validateStep5() ||
            !validateStep6()
        ) {
            return;
        }

        setIsSaving(true);
        const values = getValues();

        // Ensure all typed term types have a corresponding DB term_type_id
        const termTypesRes = await getTermTypes();
        const existingTermTypes = termTypesRes.data || [];
        const termTypeMap = new Map<string, string>();
        existingTermTypes.forEach((tt) => {
            termTypeMap.set(tt.label.trim().toLowerCase(), tt.id);
        });

        const mappedTerms = await Promise.all(
            (values.terms || []).map(async (t, tIdx) => {
                const cleanLabel = (t.term_type_label || `Term #${tIdx + 1}`).trim();
                let typeId = t.term_type_id || termTypeMap.get(cleanLabel.toLowerCase());

                if (!typeId) {
                    const cleanCode = (t.term_type_code || cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')).trim();
                    const createRes = await createTermType({
                        code: cleanCode,
                        description: '',
                        label: cleanLabel,
                        sequence: String(tIdx + 1)
                    });
                    if (createRes.data !== null || !createRes.error) {
                        const refreshed = await getTermTypes();
                        const matched = (refreshed.data || []).find(
                            (item) => item.label.trim().toLowerCase() === cleanLabel.toLowerCase()
                        );
                        if (matched) {
                            typeId = matched.id;
                        }
                    }
                }

                return {
                    ...t,
                    term_type_id: typeId || '00000000-0000-0000-0000-000000000000',
                    term_type_label: cleanLabel
                };
            })
        );

        const payload: SaveAcademicYearCalendarPayload = {
            p_code: values.code.trim(),
            p_end_date: values.end_date,
            p_evaluation_scope: values.evaluation_scope || 'Period',
            p_is_active: Boolean(values.is_active),
            p_label: values.label.trim(),
            p_max_units_per_term: values.max_units_per_term ? Number(values.max_units_per_term) : 24,
            p_school_year_id: values.id || null,
            p_start_date: values.start_date,
            p_terms: mappedTerms.map((t) => ({
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
                    weight: Number(gp.weight) || 0,
                    major_exam_start_date: gp.major_exam_start_date || null,
                    major_exam_end_date: gp.major_exam_end_date || null,
                    grade_encoding_start_date: gp.grade_encoding_start_date || null,
                    grade_encoding_end_date: gp.grade_encoding_end_date || null,
                    components: (gp.components || []).map((c) => ({
                        id: c.id,
                        name: (c.name || '').trim(),
                        weight: Number(c.weight) || 0
                    }))
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

    function handleRequestClose() {
        if (!isReadOnly && methods.formState.isDirty) {
            setIsConfirmCloseOpen(true);
        } else {
            onClose();
        }
    }

    const currentStepConfig = WIZARD_STEPS.find((s) => s.step === currentStep);

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleRequestClose}
        >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                                <CalendarDotsIcon className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                    {schoolYearId
                                        ? isReadOnly
                                            ? 'Academic Year Calendar & Criteria'
                                            : 'Edit Academic Year & Calendar'
                                        : sourceSchoolYear
                                        ? `Duplicate Academic Year: ${sourceSchoolYear.label}`
                                        : 'Create Academic Year & Calendar'}
                                </h2>
                                <CommonInfoTooltip
                                    content={
                                        sourceSchoolYear
                                            ? `Duplicating configuration from ${sourceSchoolYear.code}. Enter a new academic year identity and dates.`
                                            : 'Unified setup for operational dates, terms, grading periods, grade schema, and academic thresholds.'
                                    }
                                    size={16}
                                />
                            </div>
                        </div>

                        {/* Actions positioned below the title */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:pl-13">
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<EyeIcon className="w-4 h-4" />}
                                variant="outlined"
                                className="min-w-0 px-2.5 sm:px-3 text-xs"
                                title="Preview"
                                aria-label="Preview"
                                onClick={() => setIsPreviewModalOpen(true)}
                            >
                                <span>Preview</span>
                            </CommonButton>

                            {!isReadOnly && (
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    startIcon={<FastForwardIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    className="min-w-0 px-2.5 sm:px-3 text-xs"
                                    title="Roll Forward +1 Year"
                                    aria-label="Roll Forward +1 Year"
                                    onClick={handleRollForwardOneYear}
                                >
                                    <span>Roll Forward +1 Year</span>
                                </CommonButton>
                            )}

                            {schoolYearId && (
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    startIcon={<ClockCounterClockwiseIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    className="min-w-0 px-2.5 sm:px-3 text-xs"
                                    title="History"
                                    aria-label="History"
                                    onClick={() => setIsHistoryModalOpen(true)}
                                >
                                    <span>History</span>
                                </CommonButton>
                            )}

                            {isReadOnly && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    className="min-w-0 px-2.5 sm:px-3 text-xs"
                                    title="Edit"
                                    aria-label="Edit"
                                    onClick={() => setIsReadOnly(false)}
                                >
                                    <span>Edit</span>
                                </CommonButton>
                            )}
                        </div>
                    </div>

                    <button
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                        title="Close"
                        type="button"
                        onClick={handleRequestClose}
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                steps={WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                currentStep={currentStep}
                onStepClick={handleStepClick}
                readOnly={isReadOnly}
            />

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
                            <Step4HolidaysConfig
                                control={control}
                                disabled={isReadOnly}
                            />
                        )}

                        {currentStep === 5 && (
                            <Step4TransmutationConfig
                                control={control}
                                disabled={isReadOnly}
                            />
                        )}

                        {currentStep === 6 && (
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
                    Step {currentStep} of 6 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 6 ? (
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

            {/* Schedule & Holiday Overlay Preview Modal */}
            <AcademicYearSchedulePreviewModal
                endDate={watch('end_date')}
                holidays={watch('holidays')}
                open={isPreviewModalOpen}
                startDate={watch('start_date')}
                terms={watch('terms')}
                onClose={() => setIsPreviewModalOpen(false)}
            />

            {/* Unsaved Changes Confirmation Modal */}
            <CommonPromptModal
                isOpen={isConfirmCloseOpen}
                mainContent={{ title: 'Discard unsaved changes?' }}
                subContent={{ title: 'You have unsaved changes in this academic year calendar. Are you sure you want to discard your changes and close?' }}
                actionIconProps={{
                    icon: WarningIcon,
                    iconContainerClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }}
                formButtonsProps={{
                    cancelProps: {
                        children: 'Keep Editing',
                        onClick: () => setIsConfirmCloseOpen(false)
                    },
                    confirmProps: {
                        children: 'Discard Changes',
                        color: 'error',
                        onClick: () => {
                            setIsConfirmCloseOpen(false);
                            onClose();
                        }
                    }
                }}
                onClose={() => setIsConfirmCloseOpen(false)}
            />
        </CommonModal>
    );
}
