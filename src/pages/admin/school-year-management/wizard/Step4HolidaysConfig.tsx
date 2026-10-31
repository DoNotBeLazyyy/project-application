import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import FormLabel from '@components/form/FormLabel';
import ValidCommonInput from '@components/input/ValidCommonInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import ManageExceptionTypesModal from '@pages/admin/school-year-management/wizard/ManageExceptionTypesModal';
import { CALENDAR_EXCEPTION_TYPE_LABELS, CALENDAR_EXCEPTION_TYPES, toCalendarExceptionType } from '@pages/admin/school-year-management/wizard/wizard.constants';
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
import {
    Control, useFieldArray, useFormState, UseFormSetValue, useWatch
} from 'react-hook-form';

interface Step4HolidaysConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

// Option values must be calendar_exception_type enum values; the DB coerces anything else to 'Holiday'
const INITIAL_EXCEPTION_TYPE_ITEMS: ExceptionTypeOptionItem[] = CALENDAR_EXCEPTION_TYPES.map((type) => ({
    is_active: true,
    is_default: true,
    label: type
}));

function getExceptionTypeLabel(value: string): string {
    const type = toCalendarExceptionType(value);
    return type
        ? CALENDAR_EXCEPTION_TYPE_LABELS[type]
        : value;
}

export default function Step4HolidaysConfig({
    control,
    disabled = false
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

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'holidays'
    });

    const holidays = useWatch({ control, name: 'holidays' }) || [];

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

    return (
        <div className="space-y-6">
            {!disabled && (
                <div className="flex justify-end items-center gap-2 flex-wrap">
                    <CommonButton
                        className="!bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40"
                        color="primary"
                        size="small"
                        startIcon={<GearIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        variant="outlined"
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

            {/* Holiday Exception Cards List (Full Width) */}
            {fields.length === 0
                ? (
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
                )
                : (
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
                                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800/80 shadow-xs space-y-4 w-full"
                                    key={item.id}
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
                                                    {getExceptionTypeLabel(current.exception_type)}
                                                </span>
                                            )}
                                            {current.start_date && (
                                                <span className="text-xs text-slate-400 shrink-0 hidden md:inline">
                                                    • {current.start_date}{current.end_date && current.end_date !== current.start_date
                                                        ? ` to ${current.end_date}`
                                                        : ''}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!disabled && (
                                                <CommonButton
                                                    color="error"
                                                    size="small"
                                                    startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                    title="Remove Exception"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setDeleteExceptionTarget({
                                                            index: idx,
                                                            title: current.title || `Exception #${idx + 1}`
                                                        });
                                                    }}
                                                >
                                                    <span className="hidden sm:inline">Remove</span>
                                                </CommonButton>
                                            )}
                                            <button
                                                aria-label={collapsedExceptions[idx]
                                                    ? 'Expand exception'
                                                    : 'Collapse exception'}
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                title={collapsedExceptions[idx]
                                                    ? 'Expand exception'
                                                    : 'Collapse exception'}
                                                type="button"
                                                onClick={() => toggleExceptionCollapse(idx)}
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedExceptions[idx]
                                                        ? '-rotate-90'
                                                        : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">{collapsedExceptions[idx]
                                                    ? 'Expand'
                                                    : 'Collapse'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className={collapsedExceptions[idx]
                                            ? 'hidden'
                                            : 'space-y-4'}
                                    >
                                        {/* school_year_calendar_exceptions.title text NOT NULL */}
                                        <div>
                                            <ValidCommonInput
                                                control={control}
                                                disabled={disabled}
                                                fullWidth
                                                isRequired
                                                label="Holiday / Exception Title"
                                                name={`holidays.${idx}.title`}
                                                placeholder="Holiday / Exception Title (e.g. Independence Day)"
                                                rules={{
                                                    required: 'Title is required',
                                                    validate: (val) => Boolean(String(val || '')
                                                        .trim()) || 'Title is required'
                                                }}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {/* exception_type calendar_exception_type NOT NULL */}
                                            <div>
                                                <ValidCommonSelect
                                                    control={control}
                                                    disabled={disabled}
                                                    fullWidth
                                                    isRequired
                                                    label="Exception Type"
                                                    name={`holidays.${idx}.exception_type`}
                                                    options={optionsToRender.map((opt) => ({
                                                        label: `${getExceptionTypeLabel(opt.label)}${!opt.is_active
                                                            ? ' (Deprecated)'
                                                            : ''}`,
                                                        value: opt.label
                                                    }))}
                                                    rules={{
                                                        required: 'Exception type is required',
                                                        validate: (val) => Boolean(toCalendarExceptionType(val as string)) || 'Unsupported exception type'
                                                    }}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                                <FormLabel
                                                    className="tw_body_small_bold"
                                                    label="Class Impact"
                                                />
                                                <ValidCommonCheckbox
                                                    control={control}
                                                    disabled={disabled}
                                                    label="Class Suspended"
                                                    name={`holidays.${idx}.affects_attendance`}
                                                />
                                            </div>

                                            {/* start_date / end_date date NOT NULL */}
                                            <div>
                                                <ValidCommonDatePicker
                                                    control={control}
                                                    disabled={disabled}
                                                    isRequired
                                                    label="Start Date"
                                                    name={`holidays.${idx}.start_date`}
                                                    rules={{
                                                        required: 'Start date is required'
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <ValidCommonDatePicker
                                                    control={control}
                                                    disabled={disabled}
                                                    isRequired
                                                    label="End Date"
                                                    name={`holidays.${idx}.end_date`}
                                                    rules={{
                                                        required: 'End date is required',
                                                        validate: (val) => {
                                                            if (val && current.start_date && new Date(val as string) < new Date(current.start_date)) {
                                                                return 'End date cannot be before start date';
                                                            }
                                                            return true;
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <ValidCommonInput
                                                control={control}
                                                disabled={disabled}
                                                fullWidth
                                                label="Description / Note (Optional)"
                                                name={`holidays.${idx}.description`}
                                                placeholder="e.g. Regular National Non-Working Holiday"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {!disabled && fields.length > 0 && (
                            <div className="flex justify-start pt-1">
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
                )}

            {/* Modal to configure exception type options with soft deprecation */}
            <ManageExceptionTypesModal
                exceptionTypes={exceptionTypeOptions}
                open={isManageTypesOpen}
                usedTypes={Array.from(new Set(holidays.map((h) => h.exception_type)
                    .filter(Boolean)))}
                onClose={() => setIsManageTypesOpen(false)}
                onSave={(updated) => setExceptionTypeOptions(updated)}
            />

            {/* Delete Exception Prompt Modal */}
            <DeletePromptModal
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
                isOpen={Boolean(deleteExceptionTarget)}
                mainContent={{
                    title: 'Delete Exception?'
                }}
                open={Boolean(deleteExceptionTarget)}
                subContent={{
                    title: `Are you sure you want to delete "${deleteExceptionTarget?.title}"?`
                }}
                onClose={() => setDeleteExceptionTarget(null)}
            />
        </div>
    );
}