import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonButton from '@components/button/CommonButton';
import FormLabel from '@components/form/FormLabel';
import CommonInput from '@components/input/CommonInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import {
    CaretDownIcon,
    GearIcon,
    PlusIcon,
    SunIcon,
    TrashIcon
} from '@phosphor-icons/react';
import {
    AcademicYearWizardFormValues,
    CalendarExceptionType,
    ExceptionTypeOptionItem,
    WizardCalendarExceptionItem
} from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { Control, useFieldArray, useFormState, UseFormSetValue, useWatch } from 'react-hook-form';
import ManageExceptionTypesModal from './ManageExceptionTypesModal';

interface Step4HolidaysConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

const INITIAL_EXCEPTION_TYPE_ITEMS: ExceptionTypeOptionItem[] = [
    { is_active: true, is_default: true, label: 'Holiday' },
    { is_active: true, is_default: true, label: 'Break' },
    { is_active: true, is_default: true, label: 'Suspension' },
    { is_active: true, is_default: true, label: 'Special Class' },
    { is_active: true, is_default: true, label: 'Exam Day' }
];

export default function Step4HolidaysConfig({
    control,
    disabled = false,
    setValue
}: Step4HolidaysConfigProps) {
    const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
    const [exceptionTypeOptions, setExceptionTypeOptions] = useState<ExceptionTypeOptionItem[]>(INITIAL_EXCEPTION_TYPE_ITEMS);
    const [deleteExceptionTarget, setDeleteExceptionTarget] = useState<{ index: number; title: string } | null>(null);
    const [collapsedExceptions, setCollapsedExceptions] = useState<Record<number, boolean>>({});

    const { errors } = useFormState({ control });

    useEffect(() => {
        if (errors.holidays && Array.isArray(errors.holidays)) {
            errors.holidays.forEach((hErr, idx) => {
                if (hErr) {
                    setCollapsedExceptions((prev) => ({ ...prev, [idx]: false }));
                }
            });
        }
    }, [errors]);

    function toggleExceptionCollapse(index: number) {
        setCollapsedExceptions((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'holidays'
    });

    const holidays = useWatch({ control, name: 'holidays' }) || [];
    const syStartDate = useWatch({ control, name: 'start_date' });
    const syEndDate = useWatch({ control, name: 'end_date' });

    function handleAddHoliday() {
        const activeDefault = exceptionTypeOptions.find((t) => t.is_active)?.label || 'Holiday';
        const newHoliday: WizardCalendarExceptionItem = {
            title: '',
            exception_type: activeDefault as CalendarExceptionType,
            start_date: '',
            end_date: '',
            affects_attendance: true,
            description: ''
        };
        append(newHoliday);
    }

    const holidayCount = holidays.filter((h) => h.exception_type === 'Holiday').length;
    const breakCount = holidays.filter((h) => h.exception_type === 'Break').length;
    const suspensionCount = holidays.filter((h) => h.exception_type === 'Suspension').length;
    const otherCount = holidays.length - (holidayCount + breakCount + suspensionCount);

    return (
        <div className="space-y-6">
            {/* Top Toolbar / Action Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-xs space-y-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <SunIcon className="w-5 h-5 text-amber-500 shrink-0" />
                        <span>Calendar Exceptions & Holiday Overlays</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total Exceptions: <span className="font-bold text-slate-900 dark:text-slate-100">{holidays.length}</span>
                        {holidays.length > 0 && (
                            <span className="ml-2 text-slate-400">
                                ({holidayCount} Holidays, {breakCount} Breaks, {suspensionCount} Suspensions{otherCount > 0 ? `, ${otherCount} Other` : ''})
                            </span>
                        )}
                    </p>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-zinc-700/40">
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<GearIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            variant="outlined"
                            className="!bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40"
                            onClick={() => setIsManageTypesOpen(true)}
                        >
                            Configure Types
                        </CommonButton>

                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                            variant="contained"
                            onClick={handleAddHoliday}
                        >
                            Add Exception
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Holiday Exception Cards List (Full Width) */}
            {fields.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700/60 bg-slate-50/40 dark:bg-zinc-900/20 space-y-3">
                    <SunIcon className="w-8 h-8 text-amber-500/70 mx-auto" />
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            No calendar exceptions or holidays defined
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            Click &quot;Add Exception&quot; to declare national holidays, breaks, or suspensions.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {fields.map((item, idx) => {
                        const current = holidays[idx] || item;

                        const activeOptions = exceptionTypeOptions.filter((t) => t.is_active);
                        const currentTypeItem = exceptionTypeOptions.find(
                            (t) => t.label.toLowerCase() === (current.exception_type || '').toLowerCase()
                        );
                        const optionsToRender = [...activeOptions];
                        if (currentTypeItem && !currentTypeItem.is_active) {
                            optionsToRender.push(currentTypeItem);
                        }

                        return (
                            <div
                                key={item.id}
                                className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800/80 shadow-xs space-y-4 w-full"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-700/60 pb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                                            #{idx + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {current.title || `Exception #${idx + 1}`}
                                        </span>
                                        {current.exception_type && (
                                            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                {current.exception_type}
                                            </span>
                                        )}
                                        {current.start_date && (
                                            <span className="text-xs text-slate-400 shrink-0 hidden md:inline">
                                                • {current.start_date}{current.end_date && current.end_date !== current.start_date ? ` to ${current.end_date}` : ''}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {!disabled && (
                                            <CommonButton
                                                color="error"
                                                size="small"
                                                startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => {
                                                    setDeleteExceptionTarget({
                                                        index: idx,
                                                        title: current.title || `Exception #${idx + 1}`
                                                    });
                                                }}
                                                title="Remove Exception"
                                            >
                                                <span className="hidden sm:inline">Remove</span>
                                            </CommonButton>
                                        )}
                                        <button
                                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                            title={collapsedExceptions[idx] ? 'Expand exception' : 'Collapse exception'}
                                            type="button"
                                            aria-label={collapsedExceptions[idx] ? 'Expand exception' : 'Collapse exception'}
                                            onClick={() => toggleExceptionCollapse(idx)}
                                        >
                                            <CaretDownIcon
                                                className={`w-4 h-4 transition-transform duration-200 ${collapsedExceptions[idx] ? '-rotate-90' : 'rotate-0'}`}
                                                weight="bold"
                                            />
                                            <span className="text-xs hidden sm:inline">{collapsedExceptions[idx] ? 'Expand' : 'Collapse'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className={collapsedExceptions[idx] ? 'hidden' : 'space-y-4'}>
                                    <div>
                                        <CommonInput
                                            disabled={disabled}
                                            error={Boolean((errors.holidays as any)?.[idx]?.title)}
                                            fullWidth
                                            helperText={(errors.holidays as any)?.[idx]?.title?.message}
                                            isRequired
                                            label="Holiday / Exception Title"
                                            name={`holidays.${idx}.title`}
                                            placeholder="Holiday / Exception Title (e.g. Independence Day)"
                                            size="small"
                                            value={current.title || ''}
                                            onChange={(e) => {
                                                setValue(`holidays.${idx}.title`, e.target.value, { shouldDirty: true, shouldValidate: true });
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <FormLabel label="Exception Type" />
                                            <select
                                                aria-label="Select exception type"
                                                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer disabled:border-none disabled:bg-transparent disabled:appearance-none disabled:p-0 disabled:font-medium"
                                                disabled={disabled}
                                                value={current.exception_type || activeOptions[0]?.label || 'Holiday'}
                                                onChange={(e) => {
                                                    setValue(
                                                        `holidays.${idx}.exception_type`,
                                                        e.target.value as CalendarExceptionType,
                                                        { shouldDirty: true }
                                                    );
                                                }}
                                            >
                                                {optionsToRender.map((opt) => (
                                                    <option key={opt.label} value={opt.label}>
                                                        {opt.label} {!opt.is_active ? '(Deprecated)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <FormLabel label="Class Impact" />
                                            <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                                <input
                                                    checked={Boolean(current.affects_attendance)}
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                    disabled={disabled}
                                                    type="checkbox"
                                                    onChange={(e) => {
                                                        setValue(`holidays.${idx}.affects_attendance`, e.target.checked, { shouldDirty: true });
                                                    }}
                                                />
                                                <span className="font-medium">Class Suspended</span>
                                            </label>
                                        </div>

                                        <div>
                                            <CommonDatePicker
                                                disabled={disabled}
                                                error={Boolean((errors.holidays as any)?.[idx]?.start_date)}
                                                helperText={(errors.holidays as any)?.[idx]?.start_date?.message}
                                                isRequired
                                                label="Start Date"
                                                size="small"
                                                slotProps={{ textField: { name: `holidays.${idx}.start_date` } }}
                                                value={current.start_date || ''}
                                                onChange={(val) => {
                                                    setValue(`holidays.${idx}.start_date`, val, { shouldDirty: true, shouldValidate: true });
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <CommonDatePicker
                                                disabled={disabled}
                                                error={Boolean((errors.holidays as any)?.[idx]?.end_date)}
                                                helperText={(errors.holidays as any)?.[idx]?.end_date?.message}
                                                isRequired
                                                label="End Date"
                                                size="small"
                                                slotProps={{ textField: { name: `holidays.${idx}.end_date` } }}
                                                value={current.end_date || ''}
                                                onChange={(val) => {
                                                    setValue(`holidays.${idx}.end_date`, val, { shouldDirty: true, shouldValidate: true });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <CommonInput
                                            disabled={disabled}
                                            fullWidth
                                            label="Description / Note (Optional)"
                                            placeholder="e.g. Regular National Non-Working Holiday"
                                            size="small"
                                            value={current.description || ''}
                                            onChange={(e) => {
                                                setValue(`holidays.${idx}.description`, e.target.value, { shouldDirty: true });
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal to configure exception type options with soft deprecation */}
            <ManageExceptionTypesModal
                exceptionTypes={exceptionTypeOptions}
                open={isManageTypesOpen}
                usedTypes={Array.from(new Set(holidays.map((h) => h.exception_type).filter(Boolean)))}
                onClose={() => setIsManageTypesOpen(false)}
                onSave={(updated) => setExceptionTypeOptions(updated)}
            />

            {/* Delete Exception Prompt Modal */}
            <DeletePromptModal
                isOpen={Boolean(deleteExceptionTarget)}
                mainContent={{
                    title: 'Delete Exception?'
                }}
                subContent={{
                    title: `Are you sure you want to delete "${deleteExceptionTarget?.title}"?`
                }}
                open={Boolean(deleteExceptionTarget)}
                onClose={() => setDeleteExceptionTarget(null)}
                formButtonsProps={{
                    cancelProps: {
                        onClick: () => setDeleteExceptionTarget(null)
                    },
                    confirmProps: {
                        onClick: () => {
                            if (deleteExceptionTarget !== null) {
                                remove(deleteExceptionTarget.index);
                                setDeleteExceptionTarget(null);
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
