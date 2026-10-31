import CommonButton from '@components/button/CommonButton';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ValidCommonInput from '@components/input/ValidCommonInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import {
    CaretDownIcon,
    ClockIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getTermTypes } from '@services/term/term-type.service';
import { AcademicYearWizardFormValues, WizardTermItem } from '@type/school-year.type';
import { TermTypeOption } from '@type/term/term-type.type';
import { useEffect, useState } from 'react';
import {
    Control, useFieldArray, useFormState, UseFormSetValue, useWatch
} from 'react-hook-form';

const EVALUATION_SCOPE_OPTIONS = [
    { label: 'Per Grading Period', value: 'Period' },
    { label: 'Per Term', value: 'Term' }
];

interface Step2TermsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

export default function Step2TermsConfig({
    control,
    disabled = false,
    setValue
}: Step2TermsConfigProps) {
    const [termTypes, setTermTypes] = useState<TermTypeOption[]>([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    const [deleteTermTarget, setDeleteTermTarget] = useState<{ index: number; name: string } | null>(null);
    const [collapsedTerms, setCollapsedTerms] = useState<Record<number, boolean>>({});

    function toggleCollapse(index: number) {
        setCollapsedTerms((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const { errors } = useFormState({ control });

    useEffect(() => {
        if (errors.terms && Array.isArray(errors.terms)) {
            errors.terms.forEach((tErr, idx) => {
                if (tErr) {
                    setCollapsedTerms((prev) => ({ ...prev, [idx]: false }));
                }
            });
        }
    }, [errors]);

    const syEvaluationScope = useWatch({ control, name: 'evaluation_scope' }) || 'Period';

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'terms'
    });

    const watchedTerms = useWatch({ control, name: 'terms' }) || [];

    useEffect(() => {
        let isMounted = true;
        async function fetchTypes() {
            setIsLoadingTypes(true);
            const res = await getTermTypes();
            if (isMounted && res.data) {
                setTermTypes(res.data);
            }
            if (isMounted) {
                setIsLoadingTypes(false);
            }
        }
        fetchTypes();
        return () => {
            isMounted = false;
        };
    }, []);

    // Sync any existing terms with termTypes on load if term_type_id is not yet set
    useEffect(() => {
        if (termTypes.length > 0 && watchedTerms.length > 0) {
            watchedTerms.forEach((term, idx) => {
                if (!term.term_type_id && term.term_type_label) {
                    const matched = termTypes.find(
                        (tt) => tt.label.trim()
                            .toLowerCase() === term.term_type_label?.trim()
                            .toLowerCase()
                    );
                    if (matched) {
                        setValue(`terms.${idx}.term_type_id`, matched.id, { shouldDirty: false });
                        setValue(`terms.${idx}.term_type_code`, matched.code, { shouldDirty: false });
                    }
                }
            });
        }
    }, [termTypes, setValue]);

    // Helper to add a new term (pre-filling with next available term type if present)
    function handleAddTerm() {
        const nextIdx = fields.length;
        const defaultType = termTypes[nextIdx];
        const newTerm: WizardTermItem = {
            end_date: '',
            enrollment_end_date: '',
            enrollment_start_date: '',
            evaluation_scope: syEvaluationScope,
            grading_deadline: '',
            grading_periods: [],
            start_date: '',
            status: 'Upcoming',
            term_type_code: defaultType?.code || '',
            term_type_id: defaultType?.id || '',
            term_type_label: defaultType?.label || ''
        };

        append(newTerm);
    }

    return (
        <div className="flex flex-col gap-6">
            {!disabled && (
                <div className="flex justify-end items-center gap-2">
                    <CommonButton
                        className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                        color="primary"
                        size="small"
                        startIcon={<PlusIcon className="w-4 h-4" />}
                        title="Add Term"
                        variant="contained"
                        onClick={handleAddTerm}
                    >
                        <span className="hidden sm:inline">Add Term</span>
                    </CommonButton>
                </div>
            )}

            {/* Empty State if no terms */}
            {fields.length === 0 && (
                <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
                    <ClockIcon className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                        No terms added for this Academic Year yet.
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Add at least one term (such as 1st Semester) to schedule class offerings, enrollments, and grading periods.
                    </p>
                    {!disabled && (
                        <div className="pt-2 flex justify-center gap-3">
                            <CommonButton
                                color="primary"
                                size="medium"
                                startIcon={<PlusIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={handleAddTerm}
                            >
                                Add First Term
                            </CommonButton>
                        </div>
                    )}
                </div>
            )}

            {/* Terms List Cards */}
            <div className="space-y-4">
                {fields.map((field, index) => {
                    const currentTerm = watchedTerms[index] || field;
                    const prevTerm = index > 0
                        ? watchedTerms[index - 1]
                        : null;

                    // Check for duplicate term name selection across other terms
                    const otherTermsHaveThisType = watchedTerms.some(
                        (t, idx) =>
                            idx !== index
                            && Boolean((currentTerm.term_type_label || '').trim())
                            && (t.term_type_label || '').trim()
                                .toLowerCase() === (currentTerm.term_type_label || '').trim()
                                .toLowerCase()
                    );

                    // Check date conflict with preceding term
                    const hasPrecedingConflict = Boolean(
                        prevTerm
                        && currentTerm.start_date
                        && prevTerm.end_date
                        && new Date(currentTerm.start_date) < new Date(prevTerm.end_date)
                    );

                    // Check date order
                    const hasDateOrderError = Boolean(
                        currentTerm.start_date
                        && currentTerm.end_date
                        && new Date(currentTerm.end_date) <= new Date(currentTerm.start_date)
                    );

                    return (
                        <div
                            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border shadow-sm space-y-4 transition-all ${
                                otherTermsHaveThisType || hasPrecedingConflict || hasDateOrderError
                                    ? 'border-amber-300 dark:border-amber-700/70'
                                    : 'border-slate-200 dark:border-zinc-700/60'
                            }`}
                            key={field.id}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/40 pb-3">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                                        #{index + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {currentTerm.term_type_label || `Term #${index + 1}`}
                                    </span>
                                    {currentTerm.start_date && currentTerm.end_date && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            ({currentTerm.start_date} to {currentTerm.end_date})
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!disabled && fields.length > 1 && (
                                        <button
                                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                            title="Remove Term"
                                            type="button"
                                            onClick={() => {
                                                setDeleteTermTarget({
                                                    index,
                                                    name: currentTerm.term_type_label || `Term #${index + 1}`
                                                });
                                            }}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            <span className="hidden sm:inline">Remove</span>
                                        </button>
                                    )}
                                    <button
                                        aria-label={collapsedTerms[index]
                                            ? 'Expand Term'
                                            : 'Collapse Term'}
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                        title={collapsedTerms[index]
                                            ? 'Expand Term'
                                            : 'Collapse Term'}
                                        type="button"
                                        onClick={() => toggleCollapse(index)}
                                    >
                                        <CaretDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedTerms[index]
                                                ? '-rotate-90'
                                                : 'rotate-0'}`}
                                            weight="bold"
                                        />
                                        <span className="text-xs hidden sm:inline">{collapsedTerms[index]
                                            ? 'Expand'
                                            : 'Collapse'}</span>
                                    </button>
                                </div>
                            </div>

                            <div
                                className={collapsedTerms[index]
                                    ? 'hidden'
                                    : 'space-y-4'}
                            >
                                {/* Warnings/Conflict Alerts */}
                                {otherTermsHaveThisType && (
                                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                                        <WarningCircleIcon className="w-4 h-4 shrink-0" />
                                        <span>
                                        Duplicate Term Type: &quot;{currentTerm.term_type_label || 'This term'}&quot; is already declared in another term. Each term in an academic year must have a unique name.
                                        </span>
                                    </div>
                                )}

                                {hasPrecedingConflict && (
                                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                                        <WarningCircleIcon className="w-4 h-4 shrink-0" />
                                        <span>
                                        Date Conflict: Term Start Date ({currentTerm.start_date}) cannot be earlier than preceding term&apos;s End Date ({prevTerm?.end_date}).
                                        </span>
                                    </div>
                                )}

                                {hasDateOrderError && (
                                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                                        <WarningCircleIcon className="w-4 h-4 shrink-0" />
                                        <span>
                                        End Date must be strictly after Start Date.
                                        </span>
                                    </div>
                                )}

                                {/* Term Inputs Responsive Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {/* Term Type Input: resolved to terms.term_type_id (NOT NULL, unique per school year) on save */}
                                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                        <ValidCommonInput
                                            control={control}
                                            description="Declare the term name for this academic year (e.g. 1st Semester, 2nd Semester, Summer)."
                                            disabled={disabled}
                                            fullWidth
                                            inputProps={{ list: 'term-types-datalist' }}
                                            isRequired
                                            label="Term Type / Name"
                                            name={`terms.${index}.term_type_label`}
                                            placeholder="e.g. 1st Semester"
                                            rules={{
                                                required: 'Term type / name is required',
                                                validate: (val) => {
                                                    const clean = String(val || '')
                                                        .trim()
                                                        .toLowerCase();
                                                    if (!clean) return 'Term type / name is required';
                                                    const isDuplicate = watchedTerms.some(
                                                        (t, idx) => idx !== index && (t.term_type_label || '').trim()
                                                            .toLowerCase() === clean
                                                    );
                                                    return !isDuplicate || 'Duplicate term name';
                                                }
                                            }}
                                            onChange={(e) => {
                                                const newLabel = e.target.value;
                                                const matched = termTypes.find((t) => t.label.toLowerCase() === newLabel.trim()
                                                    .toLowerCase());
                                                setValue(
                                                    `terms.${index}.term_type_code`,
                                                    matched?.code || newLabel.trim()
                                                        .toLowerCase()
                                                        .replace(/[^a-z0-9]+/g, '_'),
                                                    { shouldDirty: true }
                                                );
                                                setValue(`terms.${index}.term_type_id`, matched?.id || '', { shouldDirty: true });
                                            }}
                                        />
                                        <datalist id="term-types-datalist">
                                            {termTypes.map((tt) => (
                                                <option
                                                    key={tt.id}
                                                    value={tt.label}
                                                />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* Term Start Date (terms.start_date NOT NULL) */}
                                    <div>
                                        <ValidCommonDatePicker
                                            control={control}
                                            description="Official date when classes begin for this term."
                                            disabled={disabled}
                                            isRequired
                                            label="Term Start Date"
                                            name={`terms.${index}.start_date`}
                                            rules={{
                                                required: 'Term start date is required'
                                            }}
                                        />
                                    </div>

                                    {/* Term End Date (terms.end_date NOT NULL, CHECK end_date > start_date) */}
                                    <div>
                                        <ValidCommonDatePicker
                                            control={control}
                                            description="Official date when classes conclude for this term."
                                            disabled={disabled}
                                            isRequired
                                            label="Term End Date"
                                            name={`terms.${index}.end_date`}
                                            rules={{
                                                required: 'Term end date is required',
                                                validate: (val) => {
                                                    const start = watchedTerms[index]?.start_date;
                                                    if (val && start && new Date(val as string) <= new Date(start)) {
                                                        return 'End date must be after start date';
                                                    }
                                                    return true;
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Enrollment Start Date */}
                                    <div>
                                        <ValidCommonDatePicker
                                            control={control}
                                            description="Date when student course registration and online enrollment opens."
                                            disabled={disabled}
                                            label="Enrollment Opens"
                                            name={`terms.${index}.enrollment_start_date`}
                                        />
                                    </div>

                                    {/* Enrollment End Date */}
                                    <div>
                                        <ValidCommonDatePicker
                                            control={control}
                                            description="Final date for student course registration, late enrollment, and add-drop requests."
                                            disabled={disabled}
                                            label="Enrollment Closes"
                                            name={`terms.${index}.enrollment_end_date`}
                                            rules={{
                                                validate: (val) => {
                                                    const start = watchedTerms[index]?.enrollment_start_date;
                                                    if (val && start && new Date(val as string) < new Date(start)) {
                                                        return 'Enrollment end date cannot be before enrollment start date';
                                                    }
                                                    return true;
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Grading Submission Deadline */}
                                    <div>
                                        <ValidCommonDatePicker
                                            control={control}
                                            description="Final deadline for faculty to encode and submit final grades."
                                            disabled={disabled}
                                            label="Grading Deadline"
                                            name={`terms.${index}.grading_deadline`}
                                        />
                                    </div>

                                    {/* Evaluation Scope for this term (terms.evaluation_scope evaluation_scope_type) */}
                                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                        <ValidCommonSelect
                                            control={control}
                                            description="Determines whether student evaluation of faculty is conducted per period or per term for this specific term."
                                            disabled={disabled}
                                            fullWidth
                                            isRequired
                                            label="Faculty Evaluation Scope"
                                            name={`terms.${index}.evaluation_scope`}
                                            options={EVALUATION_SCOPE_OPTIONS}
                                            rules={{
                                                required: 'Faculty evaluation scope is required'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!disabled && fields.length > 0 && (
                <div className="flex justify-end pt-2">
                    <CommonButton
                        color="primary"
                        size="small"
                        startIcon={<PlusIcon className="w-4 h-4" />}
                        title="Add Term"
                        variant="contained"
                        onClick={handleAddTerm}
                    >
                        Add Term
                    </CommonButton>
                </div>
            )}

            {/* Delete Term Prompt */}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: () => setDeleteTermTarget(null)
                    },
                    confirmProps: {
                        onClick: () => {
                            if (deleteTermTarget !== null) {
                                remove(deleteTermTarget.index);
                                setDeleteTermTarget(null);
                            }
                        }
                    }
                }}
                isOpen={Boolean(deleteTermTarget)}
                mainContent={{
                    title: 'Delete Term?'
                }}
                open={Boolean(deleteTermTarget)}
                subContent={{
                    title: `Are you sure you want to delete "${deleteTermTarget?.name}"? All grading periods and configurations in this term will also be removed.`
                }}
                onClose={() => setDeleteTermTarget(null)}
            />
        </div>
    );
}