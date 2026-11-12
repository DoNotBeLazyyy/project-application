import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { useFormDraft } from '@hooks/use-form-draft';
import AcademicYearHistoryModal from '@pages/admin/school-year-management/history/AcademicYearHistoryModal';
import { buildAcademicYearCalendarPayload, ResolvedWizardTerm } from '@pages/admin/school-year-management/wizard/academic-year-payload';
import AcademicYearSchedulePreviewModal from '@pages/admin/school-year-management/wizard/AcademicYearSchedulePreviewModal';
import Step1SchoolYearInfo from '@pages/admin/school-year-management/wizard/Step1SchoolYearInfo';
import Step2TermsConfig from '@pages/admin/school-year-management/wizard/Step2TermsConfig';
import Step3GradingPeriodsConfig from '@pages/admin/school-year-management/wizard/Step3GradingPeriodsConfig';
import Step4HolidaysConfig from '@pages/admin/school-year-management/wizard/Step4HolidaysConfig';
import Step4TransmutationConfig from '@pages/admin/school-year-management/wizard/Step4TransmutationConfig';
import Step5ThresholdsConfig from '@pages/admin/school-year-management/wizard/Step5ThresholdsConfig';
import {
    cloneSchoolYearForDuplication,
    DEFAULT_ACADEMIC_THRESHOLDS,
    DEFAULT_TRANSMUTATION_ROWS,
    ExistingSchoolYearComparison,
    isSpecialGradeRow,
    parseYearFromDate,
    shiftCalendarDatesByYears,
    SourceSchoolYearInfo,
    toCalendarExceptionType,
    validateCalendarExceptions,
    validateGradingPeriods,
    validateStep1SchoolYear,
    validateTerms,
    validateThresholds,
    validateTransmutationRows,
    WIZARD_STEPS
} from '@pages/admin/school-year-management/wizard/wizard.constants';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDotsIcon,
    ClockCounterClockwiseIcon,
    EyeIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    discardUnusedTermTypes,
    getAcademicYearCalendarDetails,
    getSchoolYears,
    saveAcademicYearCalendar
} from '@services/school-year.service';
import { createTermType, getTermTypes } from '@services/term/term-type.service';
import { useToastStore } from '@stores/toast.store';
import { AcademicYearWizardFormValues, SchoolYearOption } from '@type/school-year.type';
import {
    announceFormError, DEFAULT_FORM_OPTIONS, ensureSubmitValidationMode, focusAndOpenFirstErrorField, validateStepFields
} from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { Path, useForm } from 'react-hook-form';

interface AcademicYearWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    schoolYearId?: string | null;
    duplicateSchoolYearId?: string | null;
    onClose: VoidFunction;
    onSuccess: VoidFunction;
}

const DEFAULT_WIZARD_FORM_VALUES: AcademicYearWizardFormValues = {
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
    thresholds: DEFAULT_ACADEMIC_THRESHOLDS,
    transmutation_rows: DEFAULT_TRANSMUTATION_ROWS
};

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
    // Years already added to copied dates in a duplicate, so a later change only moves them by the difference
    const appliedYearOffsetRef = useRef(0);

    const defaultValues = DEFAULT_WIZARD_FORM_VALUES;

    const methods = useForm<AcademicYearWizardFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues
    });

    if (methods.control) {
        const patchableControl = methods.control as unknown as { _clearErrors?: unknown; clearErrors?: unknown };
        patchableControl._clearErrors = methods.clearErrors;
        patchableControl.clearErrors = methods.clearErrors;
        ensureSubmitValidationMode(methods.control);
    }

    const {
        control,
        getValues,
        reset,
        setValue,
        watch
    } = methods;

    const draftGuard = useFormDraft({
        control,
        enabled: open && !isReadOnly && !isLoading,
        // Create and Duplicate keep separate drafts so one never restores into the other
        formId: schoolYearId
            ? `academic-year-wizard-${schoolYearId}`
            : duplicateSchoolYearId
                ? `academic-year-wizard-duplicate-${duplicateSchoolYearId}`
                : 'academic-year-wizard-new'
    });

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
                appliedYearOffsetRef.current = 0;
                reset({
                    ...defaultValues,
                    ...cloned
                });
                useToastStore.getState()
                    .showToast(
                        `Duplicated configuration from ${data.label}. Please specify a new Academic Year Code, Label, and Dates; copied dates will move to the new year.`,
                        'info'
                    );
            }
        }
        finally {
            setIsLoading(false);
        }
    }

    function handleClearDuplication() {
        setSourceSchoolYear(null);
        appliedYearOffsetRef.current = 0;
        reset(defaultValues);
    }

    // Fetch existing school years list for in-wizard duplication dropdown and uniqueness validation
    useEffect(() => {
        if (open) {
            getSchoolYears()
                .then((res) => {
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
            setIsPreviewModalOpen(false);
            setIsConfirmCloseOpen(false);
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
                            holidays: (data.holidays || []).map((h) => ({
                                ...h,
                                exception_type: toCalendarExceptionType(h.exception_type) || 'Holiday'
                            })),
                            id: data.id,
                            is_active: Boolean(data.is_active),
                            label: data.label || '',
                            max_units_per_term: data.max_units_per_term ?? 24,
                            start_date: data.start_date || '',
                            terms: (data.terms && data.terms.length > 0
                                ? data.terms
                                : []).map((t) => ({
                                ...t,
                                evaluation_scope: t.evaluation_scope || data.evaluation_scope || 'Period'
                            })),
                            thresholds: data.thresholds || [],
                            transmutation_rows: (data.transmutation_rows || []).map((r) => {
                                const isSpecial = isSpecialGradeRow(r);
                                return {
                                    ...r,
                                    max_percentage: isSpecial
                                        ? null
                                        : r.max_percentage,
                                    min_percentage: isSpecial
                                        ? null
                                        : r.min_percentage,
                                    transmuted_grade: isSpecial
                                        ? null
                                        : r.transmuted_grade
                                };
                            })
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
        else if (duplicateSchoolYearId) {
            loadAndDuplicateSchoolYear(duplicateSchoolYearId);
        }
        else {
            setSourceSchoolYear(null);
            reset(defaultValues);
        }
    }, [open, schoolYearId, duplicateSchoolYearId, initialReadOnly]);

    // Applies a pure step validator result: marks every invalid field, then focuses the first one
    function applyValidationResult(result: {
        isValid: boolean;
        error?: string;
        fieldPath?: string;
        isToastOnly?: boolean;
        errors?: { fieldPath: string; message: string }[];
    }): boolean {
        if (result.isValid) return true;

        const errorsList = result.errors && result.errors.length > 0
            ? result.errors
            : (result.fieldPath && result.error && !result.isToastOnly
                ? [{ fieldPath: result.fieldPath, message: result.error }]
                : []);

        if (errorsList.length === 0) {
            if (result.error) {
                useToastStore.getState()
                    .showToast(result.error, 'error');
                announceFormError({
                    count: 1,
                    message: result.error
                });
            }
            return false;
        }

        errorsList.forEach((err) => {
            methods.setError(err.fieldPath as Path<AcademicYearWizardFormValues>, { type: 'manual', message: err.message });
        });
        const first = errorsList[0];
        focusAndOpenFirstErrorField(first.fieldPath, methods);
        announceFormError({
            count: errorsList.length,
            message: first.message,
            firstErrorField: first.fieldPath
        });
        return false;
    }

    // Validation for Step 1 (Identity & Dates)
    async function validateStep1(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['start_date', 'end_date', 'code', 'label', 'max_units_per_term', 'is_active']);
        if (!isValid) return false;
        const result = validateStep1SchoolYear(
            getValues(),
            sourceSchoolYear,
            existingSchoolYears,
            schoolYearId
        );
        const isStepValid = applyValidationResult({ ...result, fieldPath: result.field });
        if (isStepValid) {
            moveDuplicatedDatesToNewYear();
        }
        return isStepValid;
    }

    /**
     * In a duplicate, copied term, grading period and holiday dates still belong to the source year.
     * Move them by the year difference (same month and day) once the new start date is known.
     */
    function moveDuplicatedDatesToNewYear() {
        if (!sourceSchoolYear || schoolYearId) {
            return;
        }
        const sourceYear = parseYearFromDate(sourceSchoolYear.start_date);
        const newYear = parseYearFromDate(getValues('start_date'));
        if (sourceYear === null || newYear === null) {
            return;
        }
        const yearOffset = newYear - sourceYear;
        const yearsToMove = yearOffset - appliedYearOffsetRef.current;
        if (yearsToMove === 0) {
            return;
        }
        const shifted = shiftCalendarDatesByYears(getValues('terms') || [], getValues('holidays') || [], yearsToMove);
        setValue('terms', shifted.terms, { shouldDirty: true });
        setValue('holidays', shifted.holidays, { shouldDirty: true });
        appliedYearOffsetRef.current = yearOffset;
        useToastStore.getState()
            .showToast(
                `Copied term, grading period, and holiday dates were moved to ${newYear}. Please review them.`,
                'info'
            );
    }

    // Validation for Step 2 (Terms & Windows)
    async function validateStep2(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['terms']);
        if (!isValid) return false;
        const values = getValues();
        return applyValidationResult(validateTerms(values.terms || [], values.start_date, values.end_date));
    }

    // Validation for Step 3 (Grading Periods)
    async function validateStep3(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['terms']);
        if (!isValid) return false;
        return applyValidationResult(validateGradingPeriods(getValues().terms || []));
    }

    // Validation for Step 4 (Holidays & Exceptions)
    async function validateStep4(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['holidays']);
        if (!isValid) return false;
        return applyValidationResult(validateCalendarExceptions(getValues().holidays || []));
    }

    // Validation for Step 5 (Grade Schema)
    async function validateStep5(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['transmutation_rows']);
        if (!isValid) return false;
        return applyValidationResult(validateTransmutationRows(getValues().transmutation_rows || []));
    }

    // Validation for Step 6 (Academic Thresholds)
    async function validateStep6(): Promise<boolean> {
        const isValid = await validateStepFields(methods, ['thresholds']);
        if (!isValid) return false;
        return applyValidationResult(validateThresholds(getValues().thresholds || []));
    }

    const STEP_VALIDATORS: Record<number, () => Promise<boolean>> = {
        1: validateStep1,
        2: validateStep2,
        3: validateStep3,
        4: validateStep4,
        5: validateStep5,
        6: validateStep6
    };

    async function handleNext() {
        if (currentStep >= WIZARD_STEPS.length) {
            return;
        }
        // Viewing is read-only, so there is nothing to check before moving on
        if (isReadOnly || await STEP_VALIDATORS[currentStep]()) {
            setCurrentStep(currentStep + 1);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    async function handleStepClick(stepNumber: number) {
        if (isReadOnly) {
            setCurrentStep(stepNumber);
            return;
        }

        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }

        // Validate sequentially
        if (!(await STEP_VALIDATORS[currentStep]())) return;

        setCurrentStep(stepNumber);
    }

    async function handleSave() {
        // Only the current step's inputs are mounted, so the pure validators re-check every step;
        // jump to the first failing step so its invalid field is rendered and focused.
        for (const step of WIZARD_STEPS) {
            if (!(await STEP_VALIDATORS[step.step]())) {
                setCurrentStep(step.step);
                return;
            }
        }

        setIsSaving(true);
        const values = getValues();

        // Ensure all typed term types have a corresponding DB term_type_id
        const termTypesRes = await getTermTypes();
        let existingTermTypes = termTypesRes.data || [];
        const termTypeMap = new Map<string, string>();
        existingTermTypes.forEach((tt) => {
            termTypeMap.set(tt.label.trim()
                .toLowerCase(), tt.id);
            if (tt.code) {
                termTypeMap.set(tt.code.trim()
                    .toLowerCase(), tt.id);
            }
        });

        let nextSequence = existingTermTypes.reduce((max, tt) => Math.max(max, Number(tt.sequence) || 0), 0) + 1;
        const createdTypeIds: Record<string, string> = {};
        const mappedTerms: ResolvedWizardTerm[] = [];

        // New term types must exist before the save; remove them again if the save does not finish
        async function stopSaving(message?: string) {
            const newTypeIds = Object.values(createdTypeIds);
            if (newTypeIds.length > 0) {
                await discardUnusedTermTypes(newTypeIds);
            }
            setIsSaving(false);
            if (message) {
                useToastStore.getState()
                    .showToast(message, 'error');
            }
        }

        for (let tIdx = 0; tIdx < (values.terms || []).length; tIdx++) {
            const t = values.terms[tIdx];
            const cleanLabel = (t.term_type_label || `Term #${tIdx + 1}`).trim();
            const lowerLabel = cleanLabel.toLowerCase();
            let typeId = (t.term_type_id && t.term_type_id !== '00000000-0000-0000-0000-000000000000')
                ? t.term_type_id
                : termTypeMap.get(lowerLabel) || createdTypeIds[lowerLabel];

            if (!typeId) {
                const cleanCode = (t.term_type_code || cleanLabel.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')).trim();
                const createRes = await createTermType({
                    code: cleanCode,
                    description: '',
                    label: cleanLabel,
                    sequence: String(nextSequence++)
                });

                // createTermType already shows its own error message
                if (createRes.error) {
                    await stopSaving();
                    return;
                }

                const refreshed = await getTermTypes();
                existingTermTypes = refreshed.data || [];
                const matched = existingTermTypes.find(
                    (item) => item.label.trim()
                        .toLowerCase() === lowerLabel
                );
                if (!matched) {
                    await stopSaving(`Could not resolve Term Type "${cleanLabel}". Please select an existing term type.`);
                    return;
                }
                typeId = matched.id;
                createdTypeIds[lowerLabel] = matched.id;
                termTypeMap.set(lowerLabel, matched.id);
            }

            if (!typeId || typeId === '00000000-0000-0000-0000-000000000000') {
                await stopSaving(`Term #${tIdx + 1} (${cleanLabel}) is missing a valid term type. Please select a valid term type.`);
                return;
            }

            mappedTerms.push({
                ...t,
                term_type_id: typeId,
                term_type_label: cleanLabel
            });
        }

        const payload = buildAcademicYearCalendarPayload(values, mappedTerms);

        const res = await saveAcademicYearCalendar(payload);

        if (res.error) {
            await stopSaving();
            return;
        }

        setIsSaving(false);
        draftGuard.clearDraft();
        onSuccess();
        onClose();
    }

    function handleRequestClose() {
        if (isSaving) return;
        if (!isReadOnly && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
        }
        else {
            draftGuard.clearDraft();
            onClose();
        }
    }

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
            <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                                <CalendarDotsIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                    {schoolYearId
                                        ? isReadOnly
                                            ? 'Academic Year Calendar & Criteria'
                                            : 'Edit Academic Year & Calendar'
                                        : sourceSchoolYear
                                            ? `Duplicate Academic Year: ${sourceSchoolYear.label}`
                                            : 'Create Academic Year & Calendar'}
                                    <span className="inline-flex align-middle ml-1.5 whitespace-nowrap">
                                        <CommonInfoTooltip
                                            content={
                                                sourceSchoolYear
                                                    ? `Duplicating configuration from ${sourceSchoolYear.code}. Enter a new academic year identity and dates.`
                                                    : 'Unified setup for operational dates, terms, grading periods, grade schema, and academic thresholds.'
                                            }
                                            size={16}
                                        />
                                    </span>
                                </h2>
                            </div>
                        </div>

                        {/* Actions: on desktop (sm:) sits alongside the title; on mobile (< sm) enters a new line as icon-only */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <CommonButton
                                aria-label="Preview"
                                className="min-w-0 px-2 sm:px-3 text-xs !bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-1.5"
                                color="primary"
                                size="small"
                                startIcon={<EyeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                title="Preview"
                                variant="outlined"
                                onClick={() => setIsPreviewModalOpen(true)}
                            >
                                <span className="hidden sm:inline">Preview</span>
                            </CommonButton>

                            {schoolYearId && (
                                <CommonButton
                                    aria-label="History"
                                    className="min-w-0 px-2 sm:px-3 text-xs !bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-1.5"
                                    color="primary"
                                    size="small"
                                    startIcon={<ClockCounterClockwiseIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                    title="History"
                                    variant="outlined"
                                    onClick={() => setIsHistoryModalOpen(true)}
                                >
                                    <span className="hidden sm:inline">History</span>
                                </CommonButton>
                            )}

                            {isReadOnly && (
                                <CommonButton
                                    aria-label="Edit"
                                    className="min-w-0 px-2 sm:px-3 text-xs !bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-1.5"
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                    title="Edit"
                                    variant="outlined"
                                    onClick={() => setIsReadOnly(false)}
                                >
                                    <span className="hidden sm:inline">Edit</span>
                                </CommonButton>
                            )}
                        </div>
                    </div>

                    <button
                        aria-label="Close"
                        className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
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
                currentStep={currentStep}
                readOnly={isReadOnly}
                steps={WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                onStepClick={handleStepClick}
            />

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {isLoading
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-500">Loading academic year calendar details...</p>
                        </div>
                    )
                    : (
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
                                    setValue={setValue}
                                />
                            )}

                            {currentStep === 3 && (
                                <Step3GradingPeriodsConfig
                                    control={control}
                                    disabled={isReadOnly}
                                    setValue={setValue}
                                    onChangeTerms={(updated) => setValue('terms', updated, { shouldDirty: true })}
                                />
                            )}

                            {currentStep === 4 && (
                                <Step4HolidaysConfig
                                    control={control}
                                    disabled={isReadOnly}
                                    setValue={setValue}
                                />
                            )}

                            {currentStep === 5 && (
                                <Step4TransmutationConfig
                                    control={control}
                                    disabled={isReadOnly}
                                    setValue={setValue}
                                />
                            )}

                            {currentStep === 6 && (
                                <Step5ThresholdsConfig
                                    control={control}
                                    disabled={isReadOnly}
                                    setValue={setValue}
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

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 6
                        ? (
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
                        )
                        : isReadOnly
                            ? (
                                <CommonButton
                                    color="primary"
                                    size="medium"
                                    variant="contained"
                                    onClick={onClose}
                                >
                            Close
                                </CommonButton>
                            )
                            : (
                                <CommonButton
                                    color="primary"
                                    disabled={isLoading || isSaving || (Boolean(schoolYearId) && !draftGuard.hasRealChanges)}
                                    loading={isSaving}
                                    size="medium"
                                    startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleSave}
                                >
                                    {isSaving
                                        ? 'Saving Calendar...'
                                        : 'Save Calendar'}
                                </CommonButton>
                            )}
                </div>
            </div>

            {/* History Modal */}
            <AcademicYearHistoryModal
                hasUnsavedChanges={!isReadOnly && draftGuard.hasRealChanges}
                open={isHistoryModalOpen}
                schoolYearId={schoolYearId}
                schoolYearLabel={watch('label')}
                onClose={() => setIsHistoryModalOpen(false)}
                onReverted={() => {
                    draftGuard.clearDraft();
                    onSuccess();
                    onClose();
                }}
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
                            draftGuard.clearDraft();
                            onClose();
                        }
                    }
                }}
                mainContent={{ title: 'Discard unsaved changes?' }}
                open={isConfirmCloseOpen}
                subContent={{ title: 'You have unsaved changes in this academic year calendar. Are you sure you want to discard your changes and close?' }}
                onClose={() => setIsConfirmCloseOpen(false)}
            />
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
        </CommonModal>
    );
}