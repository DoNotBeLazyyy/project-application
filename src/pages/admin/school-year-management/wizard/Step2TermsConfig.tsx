import CommonButton from '@components/button/CommonButton';
import CommonSelect from '@components/select/CommonSelect';
import {
    CalendarPlusIcon,
    ClockIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { getTermTypes } from '@services/term/term-type.service';
import { AcademicYearWizardFormValues, WizardTermItem } from '@type/school-year.type';
import { TermTypeOption } from '@type/term/term-type.type';
import { useEffect, useState } from 'react';
import { Control, useFieldArray, useWatch } from 'react-hook-form';
import { DEFAULT_GRADING_PERIODS } from './wizard.constants';

interface Step2TermsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
}

export default function Step2TermsConfig({
    control,
    disabled = false
}: Step2TermsConfigProps) {
    const [termTypes, setTermTypes] = useState<TermTypeOption[]>([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);

    const syStartDate = useWatch({ control, name: 'start_date' });
    const syEndDate = useWatch({ control, name: 'end_date' });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'terms'
    });

    const watchedTerms = useWatch({ control, name: 'terms' });

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

    // Helper to add a new default term
    function handleAddTerm(termTypeId?: string) {
        const selectedTypeId = termTypeId || (termTypes.length > 0 ? termTypes[0].id : '');
        const matchedType = termTypes.find((t) => t.id === selectedTypeId);

        const newTerm: WizardTermItem = {
            term_type_id: selectedTypeId,
            term_type_label: matchedType?.label || '',
            term_type_code: matchedType?.code || '',
            start_date: syStartDate || '',
            end_date: syEndDate || '',
            enrollment_start_date: '',
            enrollment_end_date: '',
            grading_deadline: '',
            status: 'Upcoming',
            grading_periods: [...DEFAULT_GRADING_PERIODS]
        };

        append(newTerm);
    }

    // Helper to auto-populate standard terms if list is empty
    function handleAutoPopulateSemesters() {
        if (termTypes.length === 0) return;

        // Try to find 1st Sem and 2nd Sem
        const sem1 = termTypes.find((t) => t.code.toLowerCase().includes('1') || t.label.toLowerCase().includes('1st'));
        const sem2 = termTypes.find((t) => t.code.toLowerCase().includes('2') || t.label.toLowerCase().includes('2nd'));

        const sYear = syStartDate ? new Date(syStartDate).getFullYear() : 2026;
        const eYear = syEndDate ? new Date(syEndDate).getFullYear() : 2027;

        const term1: WizardTermItem = {
            term_type_id: sem1 ? sem1.id : termTypes[0].id,
            term_type_label: sem1 ? sem1.label : termTypes[0].label,
            term_type_code: sem1 ? sem1.code : termTypes[0].code,
            start_date: syStartDate || `${sYear}-08-15`,
            end_date: `${sYear}-12-20`,
            enrollment_start_date: `${sYear}-08-01`,
            enrollment_end_date: `${sYear}-08-14`,
            grading_deadline: `${sYear}-12-23`,
            status: 'Upcoming',
            grading_periods: [...DEFAULT_GRADING_PERIODS]
        };

        const term2: WizardTermItem = {
            term_type_id: sem2 ? sem2.id : (termTypes[1]?.id || termTypes[0].id),
            term_type_label: sem2 ? sem2.label : (termTypes[1]?.label || termTypes[0].label),
            term_type_code: sem2 ? sem2.code : (termTypes[1]?.code || termTypes[0].code),
            start_date: `${eYear}-01-10`,
            end_date: syEndDate || `${eYear}-05-30`,
            enrollment_start_date: `${eYear}-01-02`,
            enrollment_end_date: `${eYear}-01-09`,
            grading_deadline: `${eYear}-06-05`,
            status: 'Upcoming',
            grading_periods: [...DEFAULT_GRADING_PERIODS]
        };

        // If currently empty, append both
        if (fields.length === 0) {
            append(term1);
            append(term2);
        } else {
            append(term1);
        }
    }

    const typeOptions = termTypes.map((tt) => ({
        label: `${tt.label} (${tt.code})`,
        value: tt.id
    }));

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                <div className="flex items-start gap-3 text-sm">
                    <InfoIcon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Academic Terms & Enrollment Windows
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Declare the terms running under this school year (e.g. 1st Semester, 2nd Semester, Summer). Each term holds its own enrollment window and grade submission deadline.
                        </p>
                    </div>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2 shrink-0">
                        {fields.length === 0 && (
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<CalendarPlusIcon className="w-4 h-4" />}
                                variant="outlined"
                                onClick={handleAutoPopulateSemesters}
                            >
                                Preset 2 Semesters
                            </CommonButton>
                        )}
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={() => handleAddTerm()}
                        >
                            Add Term
                        </CommonButton>
                    </div>
                )}
            </div>

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
                                onClick={() => handleAddTerm()}
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
                    const currentTerm = watchedTerms?.[index] || field;

                    return (
                        <div
                            key={field.id}
                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm space-y-4 transition-all"
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/40 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                        Term #{index + 1}
                                    </h4>
                                </div>

                                {!disabled && fields.length > 1 && (
                                    <button
                                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        title="Remove Term"
                                        type="button"
                                        onClick={() => remove(index)}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Remove</span>
                                    </button>
                                )}
                            </div>

                            {/* Term Inputs Responsive Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Term Type Selector */}
                                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Term Type <span className="text-red-500">*</span>
                                    </label>
                                    <CommonSelect
                                        disabled={disabled || isLoadingTypes}
                                        fullWidth
                                        options={typeOptions}
                                        size="medium"
                                        value={currentTerm.term_type_id || ''}
                                        onChange={(e) => {
                                            const selectedId = String(e.target.value);
                                            const matched = termTypes.find((t) => t.id === selectedId);
                                            update(index, {
                                                ...currentTerm,
                                                term_type_id: selectedId,
                                                term_type_label: matched?.label || '',
                                                term_type_code: matched?.code || ''
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        e.g. 1st Semester, 2nd Semester, Summer
                                    </p>
                                </div>

                                {/* Term Start Date */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Term Start Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        type="date"
                                        value={currentTerm.start_date || ''}
                                        onChange={(e) => {
                                            update(index, {
                                                ...currentTerm,
                                                start_date: e.target.value
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Classes officially begin</p>
                                </div>

                                {/* Term End Date */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Term End Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        type="date"
                                        value={currentTerm.end_date || ''}
                                        onChange={(e) => {
                                            update(index, {
                                                ...currentTerm,
                                                end_date: e.target.value
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Classes officially conclude</p>
                                </div>

                                {/* Enrollment Start Date */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Enrollment Opens
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        type="date"
                                        value={currentTerm.enrollment_start_date || ''}
                                        onChange={(e) => {
                                            update(index, {
                                                ...currentTerm,
                                                enrollment_start_date: e.target.value
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Portal opens for registration</p>
                                </div>

                                {/* Enrollment End Date */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Enrollment Closes
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        type="date"
                                        value={currentTerm.enrollment_end_date || ''}
                                        onChange={(e) => {
                                            update(index, {
                                                ...currentTerm,
                                                enrollment_end_date: e.target.value
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Last day of late enrollment/add-drop</p>
                                </div>

                                {/* Grading Submission Deadline */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Grading Deadline
                                    </label>
                                    <input
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        type="date"
                                        value={currentTerm.grading_deadline || ''}
                                        onChange={(e) => {
                                            update(index, {
                                                ...currentTerm,
                                                grading_deadline: e.target.value
                                            });
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Cut-off for final grade encoding</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
