import CommonButton from '@components/button/CommonButton';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CaretDownIcon,
    ClockIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getTermTypes } from '@services/term/term-type.service';
import { AcademicYearWizardFormValues, WizardTermItem } from '@type/school-year.type';
import { TermTypeOption } from '@type/term/term-type.type';
import { useEffect, useState } from 'react';
import { Control, useFieldArray, UseFormSetValue, useWatch } from 'react-hook-form';
import { DEFAULT_GRADING_PERIODS } from './wizard.constants';

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

    // Helper to add a new blank term
    function handleAddTerm() {
        const newTerm: WizardTermItem = {
            end_date: '',
            enrollment_end_date: '',
            enrollment_start_date: '',
            grading_deadline: '',
            grading_periods: DEFAULT_GRADING_PERIODS.map((gp) => ({
                ...gp,
                end_date: '',
                start_date: ''
            })),
            start_date: '',
            status: 'Upcoming',
            term_type_code: '',
            term_type_id: '',
            term_type_label: ''
        };

        append(newTerm);
    }

    function handleUpdateTermDate(index: number, field: 'start_date' | 'end_date', value: string) {
        setValue(`terms.${index}.${field}`, value, { shouldDirty: true });
    }

    return (
        <div className="flex flex-col gap-6">
            {!disabled && (
                <div className="flex justify-end items-center gap-2">
                    <CommonButton
                        color="primary"
                        size="small"
                        className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                        startIcon={<PlusIcon className="w-4 h-4" />}
                        variant="contained"
                        onClick={handleAddTerm}
                        title="Add Term"
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
                    const prevTerm = index > 0 ? watchedTerms[index - 1] : null;

                    // Check for duplicate term name selection across other terms
                    const otherTermsHaveThisType = watchedTerms.some(
                        (t, idx) =>
                            idx !== index &&
                            Boolean((currentTerm.term_type_label || '').trim()) &&
                            (t.term_type_label || '').trim().toLowerCase() === (currentTerm.term_type_label || '').trim().toLowerCase()
                    );

                    // Check date conflict with preceding term
                    const hasPrecedingConflict = Boolean(
                        prevTerm &&
                        currentTerm.start_date &&
                        prevTerm.end_date &&
                        new Date(currentTerm.start_date) < new Date(prevTerm.end_date)
                    );

                    // Check date order
                    const hasDateOrderError = Boolean(
                        currentTerm.start_date &&
                        currentTerm.end_date &&
                        new Date(currentTerm.end_date) <= new Date(currentTerm.start_date)
                    );

                    return (
                        <div
                            key={field.id}
                            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border shadow-sm space-y-4 transition-all ${
                                otherTermsHaveThisType || hasPrecedingConflict || hasDateOrderError
                                    ? 'border-amber-300 dark:border-amber-700/70'
                                    : 'border-slate-200 dark:border-zinc-700/60'
                            }`}
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
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                        title={collapsedTerms[index] ? 'Expand Term' : 'Collapse Term'}
                                        type="button"
                                        aria-label={collapsedTerms[index] ? 'Expand Term' : 'Collapse Term'}
                                        onClick={() => toggleCollapse(index)}
                                    >
                                        <CaretDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedTerms[index] ? '-rotate-90' : 'rotate-0'}`}
                                            weight="bold"
                                        />
                                        <span className="text-xs hidden sm:inline">{collapsedTerms[index] ? 'Expand' : 'Collapse'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className={collapsedTerms[index] ? 'hidden' : 'space-y-4'}>
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
                                {/* Term Type Input */}
                                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                    <CommonInput
                                        description="Declare the term name for this academic year (e.g. 1st Semester, 2nd Semester, Summer)."
                                        disabled={disabled}
                                        fullWidth
                                        isRequired
                                        label="Term Type / Name"
                                        placeholder="e.g. 1st Semester"
                                        size="small"
                                        value={currentTerm.term_type_label || ''}
                                        onChange={(e) => {
                                            const newLabel = e.target.value;
                                            const matched = termTypes.find((t) => t.label.toLowerCase() === newLabel.trim().toLowerCase());
                                            setValue(`terms.${index}.term_type_label`, newLabel, { shouldDirty: true });
                                            setValue(
                                                `terms.${index}.term_type_code`,
                                                matched?.code || newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                                                { shouldDirty: true }
                                            );
                                            setValue(`terms.${index}.term_type_id`, matched?.id || '', { shouldDirty: true });
                                        }}
                                    />
                                </div>

                                {/* Term Start Date */}
                                <div>
                                    <CommonDatePicker
                                        description="Official date when classes begin for this term."
                                        disabled={disabled}
                                        error={hasPrecedingConflict}
                                        isRequired
                                        label="Term Start Date"
                                        size="small"
                                        value={currentTerm.start_date || ''}
                                        onChange={(val) => handleUpdateTermDate(index, 'start_date', val)}
                                    />
                                </div>

                                {/* Term End Date */}
                                <div>
                                    <CommonDatePicker
                                        description="Official date when classes conclude for this term."
                                        disabled={disabled}
                                        error={hasDateOrderError}
                                        isRequired
                                        label="Term End Date"
                                        size="small"
                                        value={currentTerm.end_date || ''}
                                        onChange={(val) => handleUpdateTermDate(index, 'end_date', val)}
                                    />
                                </div>

                                {/* Max Credit Units for this term */}
                                <div>
                                    <CommonNumberInput
                                        description="Maximum credit units a student can register for in this term (1 - 60)."
                                        disabled={disabled}
                                        fullWidth
                                        isRequired
                                        label="Max Units"
                                        max={60}
                                        min={1}
                                        placeholder="24"
                                        size="small"
                                        value={currentTerm.max_units ?? ''}
                                        onChange={(val) => {
                                            setValue(`terms.${index}.max_units`, val ?? 0, { shouldDirty: true });
                                        }}
                                    />
                                </div>

                                {/* Enrollment Start Date */}
                                <div>
                                    <CommonDatePicker
                                        description="Date when student course registration and online enrollment opens."
                                        disabled={disabled}
                                        label="Enrollment Opens"
                                        size="small"
                                        value={currentTerm.enrollment_start_date || ''}
                                        onChange={(val) => {
                                            setValue(`terms.${index}.enrollment_start_date`, val, { shouldDirty: true });
                                        }}
                                    />
                                </div>

                                {/* Enrollment End Date */}
                                <div>
                                    <CommonDatePicker
                                        description="Final date for student course registration, late enrollment, and add-drop requests."
                                        disabled={disabled}
                                        label="Enrollment Closes"
                                        size="small"
                                        value={currentTerm.enrollment_end_date || ''}
                                        onChange={(val) => {
                                            setValue(`terms.${index}.enrollment_end_date`, val, { shouldDirty: true });
                                        }}
                                    />
                                </div>

                                {/* Grading Submission Deadline */}
                                <div>
                                    <CommonDatePicker
                                        description="Final deadline for faculty to encode and submit final grades."
                                        disabled={disabled}
                                        label="Grading Deadline"
                                        size="small"
                                        value={currentTerm.grading_deadline || ''}
                                        onChange={(val) => {
                                            setValue(`terms.${index}.grading_deadline`, val, { shouldDirty: true });
                                        }}
                                    />
                                </div>

                                {/* Evaluation Scope for this term */}
                                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                    <CommonSelect
                                        description="Determines whether student evaluation of faculty is conducted per period or per term for this specific term."
                                        disabled={disabled}
                                        fullWidth
                                        label="Faculty Evaluation Scope"
                                        options={[
                                            { label: 'Per Grading Period', value: 'Period' },
                                            { label: 'Per Term', value: 'Term' }
                                        ]}
                                        size="small"
                                        value={currentTerm.evaluation_scope || 'Period'}
                                        onChange={(e) => {
                                            setValue(`terms.${index}.evaluation_scope`, (e.target.value as any) || 'Period', { shouldDirty: true });
                                        }}
                                    />
                                </div>
                            </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Delete Term Prompt */}
            <DeletePromptModal
                isOpen={Boolean(deleteTermTarget)}
                mainContent={{
                    title: 'Delete Term?'
                }}
                subContent={{
                    title: `Are you sure you want to delete "${deleteTermTarget?.name}"? All grading periods and configurations in this term will also be removed.`
                }}
                open={Boolean(deleteTermTarget)}
                onClose={() => setDeleteTermTarget(null)}
                formButtonsProps={{
                    confirmProps: {
                        onClick: () => {
                            if (deleteTermTarget !== null) {
                                remove(deleteTermTarget.index);
                                setDeleteTermTarget(null);
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
