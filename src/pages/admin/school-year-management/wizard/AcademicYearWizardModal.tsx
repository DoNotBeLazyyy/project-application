import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    getAcademicYearCalendarDetails,
    saveAcademicYearCalendar
} from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import {
    AcademicYearWizardFormValues,
    SaveAcademicYearCalendarPayload
} from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Step1SchoolYearInfo from './Step1SchoolYearInfo';
import Step2TermsConfig from './Step2TermsConfig';
import Step3GradingPeriodsConfig from './Step3GradingPeriodsConfig';
import Step4TransmutationConfig from './Step4TransmutationConfig';
import {
    DEFAULT_GRADING_PERIODS,
    DEFAULT_TRANSMUTATION_ROWS,
    WIZARD_STEPS
} from './wizard.constants';

interface AcademicYearWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    schoolYearId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AcademicYearWizardModal({
    open,
    readOnly: initialReadOnly = false,
    schoolYearId,
    onClose,
    onSuccess
}: AcademicYearWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);

    const defaultValues: AcademicYearWizardFormValues = {
        code: '',
        end_date: '',
        id: null,
        is_active: false,
        label: '',
        start_date: '',
        terms: [],
        transmutation_rows: [...DEFAULT_TRANSMUTATION_ROWS]
    };

    const methods = useForm<AcademicYearWizardFormValues>({
        defaultValues
    });

    const { control, getValues, reset, setValue, watch } = methods;

    // Load existing school year calendar details when modal opens with schoolYearId
    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            reset(defaultValues);
            setIsReadOnly(initialReadOnly);
            return;
        }

        setIsReadOnly(initialReadOnly);

        if (schoolYearId) {
            setIsLoading(true);
            getAcademicYearCalendarDetails(schoolYearId)
                .then((res) => {
                    if (res.data) {
                        const data = res.data;
                        reset({
                            code: data.code || '',
                            end_date: data.end_date || '',
                            id: data.id,
                            is_active: Boolean(data.is_active),
                            label: data.label || '',
                            start_date: data.start_date || '',
                            terms: data.terms && data.terms.length > 0 ? data.terms : [],
                            transmutation_rows:
                                data.transmutation_rows && data.transmutation_rows.length > 0
                                    ? data.transmutation_rows
                                    : [...DEFAULT_TRANSMUTATION_ROWS]
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            reset({
                ...defaultValues,
                transmutation_rows: [...DEFAULT_TRANSMUTATION_ROWS]
            });
        }
    }, [open, schoolYearId, initialReadOnly]);

    // Validation for Step 1
    function validateStep1(): boolean {
        const values = getValues();
        if (!values.start_date) {
            useToastStore.getState().showToast('Please select a Start Date for the school year.', 'error');
            return false;
        }
        if (!values.end_date) {
            useToastStore.getState().showToast('Please select an End Date for the school year.', 'error');
            return false;
        }
        if (new Date(values.end_date) <= new Date(values.start_date)) {
            useToastStore.getState().showToast('End Date must be strictly after Start Date.', 'error');
            return false;
        }
        if (!values.code || !values.code.trim()) {
            useToastStore.getState().showToast('Academic Year Code is required.', 'error');
            return false;
        }
        if (!values.label || !values.label.trim()) {
            useToastStore.getState().showToast('Academic Year Label is required.', 'error');
            return false;
        }
        return true;
    }

    // Validation for Step 2
    function validateStep2(): boolean {
        const values = getValues();
        if (!values.terms || values.terms.length === 0) {
            useToastStore.getState().showToast('Please declare at least one Term for this academic year.', 'error');
            return false;
        }

        for (let i = 0; i < values.terms.length; i++) {
            const t = values.terms[i];
            const termName = t.term_type_label || `Term #${i + 1}`;
            if (!t.term_type_id) {
                useToastStore.getState().showToast(`Please select a Term Type for ${termName}.`, 'error');
                return false;
            }
            if (!t.start_date) {
                useToastStore.getState().showToast(`Please specify a Start Date for ${termName}.`, 'error');
                return false;
            }
            if (!t.end_date) {
                useToastStore.getState().showToast(`Please specify an End Date for ${termName}.`, 'error');
                return false;
            }
            if (new Date(t.end_date) < new Date(t.start_date)) {
                useToastStore.getState().showToast(`End Date cannot be before Start Date in ${termName}.`, 'error');
                return false;
            }
        }
        return true;
    }

    // Validation for Step 3
    function validateStep3(): boolean {
        const values = getValues();
        const terms = values.terms || [];

        for (let i = 0; i < terms.length; i++) {
            const t = terms[i];
            const termName = t.term_type_label || `Term #${i + 1}`;
            const periods = t.grading_periods || [];

            if (periods.length === 0) {
                useToastStore.getState().showToast(
                    `Please define at least one grading period for ${termName}.`,
                    'error'
                );
                return false;
            }

            for (const p of periods) {
                if (!p.name || !p.name.trim()) {
                    useToastStore.getState().showToast(
                        `All grading periods in ${termName} must have a name.`,
                        'error'
                    );
                    return false;
                }
            }

            const totalWeight = periods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
            if (totalWeight !== 100) {
                useToastStore.getState().showToast(
                    `Grading period weights for ${termName} equal ${totalWeight}%. The total weight must strictly sum to 100%.`,
                    'error'
                );
                return false;
            }
        }
        return true;
    }

    // Validation for Step 4
    function validateStep4(): boolean {
        const values = getValues();
        const rows = values.transmutation_rows || [];

        if (rows.length === 0) {
            useToastStore.getState().showToast(
                'Please configure at least one transmutation grade rung.',
                'error'
            );
            return false;
        }

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.label || !r.label.trim()) {
                useToastStore.getState().showToast(
                    `Row #${i + 1} must have a Grade Mark / Label (e.g. 1.00, 1.21, INC).`,
                    'error'
                );
                return false;
            }
        }
        return true;
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

        setCurrentStep(stepNumber);
    }

    async function handleSave() {
        if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
            return;
        }

        setIsSaving(true);
        const values = getValues();

        const payload: SaveAcademicYearCalendarPayload = {
            p_code: values.code.trim(),
            p_end_date: values.end_date,
            p_is_active: Boolean(values.is_active),
            p_label: values.label.trim(),
            p_school_year_id: values.id || null,
            p_start_date: values.start_date,
            p_terms: (values.terms || []).map((t) => ({
                id: t.id,
                term_type_id: t.term_type_id,
                start_date: t.start_date,
                end_date: t.end_date,
                enrollment_start_date: t.enrollment_start_date || null,
                enrollment_end_date: t.enrollment_end_date || null,
                grading_deadline: t.grading_deadline || null,
                status: t.status || 'Upcoming',
                grading_periods: (t.grading_periods || []).map((gp, idx) => ({
                    id: gp.id,
                    name: gp.name.trim(),
                    sequence: gp.sequence || (idx + 1),
                    start_date: gp.start_date || null,
                    end_date: gp.end_date || null,
                    weight: Number(gp.weight) || 0
                }))
            })),
            p_transmutation_rows: (values.transmutation_rows || []).map((r) => ({
                id: r.id,
                label: r.label.trim(),
                min_percentage: Number(r.min_percentage) || 0,
                max_percentage: Number(r.max_percentage) || 0,
                transmuted_grade:
                    r.transmuted_grade !== null &&
                    r.transmuted_grade !== undefined &&
                    r.transmuted_grade !== ''
                        ? Number(r.transmuted_grade)
                        : null,
                is_passing: Boolean(r.is_passing),
                special_code: r.special_code ? r.special_code.trim() : null,
                description: r.description ? r.description.trim() : null
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
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0">
                        <CalendarDotsIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                            {schoolYearId
                                ? isReadOnly
                                    ? 'Academic Year Calendar'
                                    : 'Edit Academic Year & Calendar'
                                : 'Academic Year & Calendar Wizard'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Unified setup for operational dates, terms, grading periods, and grade schema.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
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

            {/* Stepper Progress Bar */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 px-4 py-3 shrink-0">
                {/* Desktop Stepper (>= 768px) */}
                <div className="hidden md:grid grid-cols-4 gap-2">
                    {WIZARD_STEPS.map((s) => {
                        const isActive = currentStep === s.step;
                        const isDone = currentStep > s.step;

                        return (
                            <button
                                key={s.step}
                                className={`flex items-center gap-3 p-2 rounded-xl text-left transition-all ${
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
                                <div className="truncate">
                                    <p
                                        className={`text-xs font-semibold truncate ${
                                            isActive
                                                ? 'text-brand-600 dark:text-brand-400'
                                                : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {s.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">{s.subtitle}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Mobile Stepper Header (< 768px) */}
                <div className="block md:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                            Step {currentStep} of 4: {currentStepConfig?.title}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {Math.round((currentStep / 4) * 100)}%
                        </span>
                    </div>
                    {/* Progress Bar Line */}
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden flex">
                        <div
                            className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(currentStep / 4) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Step Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
                {isLoading ? (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-xs sm:text-sm text-slate-500">
                            Loading academic calendar details...
                        </p>
                    </div>
                ) : (
                    <>
                        {currentStep === 1 && (
                            <Step1SchoolYearInfo
                                control={control}
                                disabled={isReadOnly}
                                isNew={!schoolYearId}
                                setValue={setValue}
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
                    Step {currentStep} of 4 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 4 ? (
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
        </CommonModal>
    );
}
