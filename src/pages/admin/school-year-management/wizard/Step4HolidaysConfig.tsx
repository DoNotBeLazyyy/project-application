import CommonButton from '@components/button/CommonButton';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowCounterClockwiseIcon,
    PlusIcon,
    SparkleIcon,
    SunIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, CalendarExceptionType, WizardCalendarExceptionItem } from '@type/school-year.type';
import { Control, useFieldArray, useWatch } from 'react-hook-form';
import { generatePresetHolidays } from './wizard.constants';

interface Step4HolidaysConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
}

export default function Step4HolidaysConfig({
    control,
    disabled = false
}: Step4HolidaysConfigProps) {
    const { fields, append, remove, replace, update } = useFieldArray({
        control,
        name: 'holidays'
    });

    const holidays = useWatch({ control, name: 'holidays' }) || [];
    const syStartDate = useWatch({ control, name: 'start_date' });
    const syEndDate = useWatch({ control, name: 'end_date' });

    function handleAddHoliday() {
        const newHoliday: WizardCalendarExceptionItem = {
            title: '',
            exception_type: 'Holiday',
            start_date: syStartDate || '',
            end_date: syStartDate || '',
            affects_attendance: true,
            description: ''
        };
        append(newHoliday);
    }

    function handleLoadPresetHolidays() {
        const presets = generatePresetHolidays(syStartDate, syEndDate);
        replace(presets);
    }

    function handleResetBlank() {
        replace([]);
    }

    function handleResetRowBlank(index: number) {
        const current = holidays[index];
        if (!current) return;
        update(index, {
            ...current,
            title: '',
            start_date: '',
            end_date: '',
            description: ''
        });
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
                        <CommonInfoTooltip content="Declare national holidays, academic breaks, emergency suspensions, and special class days. These exceptions overlay onto the academic year schedule and adjust attendance expectations." size={15} />
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
                            color="inherit"
                            size="small"
                            startIcon={<SparkleIcon className="w-3.5 h-3.5 text-amber-500" />}
                            variant="outlined"
                            onClick={handleLoadPresetHolidays}
                        >
                            Load Preset Holidays
                        </CommonButton>

                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                            variant="outlined"
                            onClick={handleResetBlank}
                        >
                            Reset to Blank
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
                            Click &quot;Load Preset Holidays&quot; to auto-populate standard national holidays and academic year-end breaks, or click &quot;Add Exception&quot; to create a custom entry.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {fields.map((item, idx) => {
                        const current = holidays[idx] || item;
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
                                        <input
                                            className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-brand-500 hover:border-slate-300 dark:hover:border-zinc-700 focus:outline-none px-1 py-0.5 w-full transition-colors"
                                            disabled={disabled}
                                            placeholder="Holiday / Exception Title (e.g. Independence Day)"
                                            type="text"
                                            value={current.title || ''}
                                            onChange={(e) => {
                                                update(idx, { ...current, title: e.target.value });
                                            }}
                                        />
                                    </div>

                                    {!disabled && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <CommonButton
                                                color="inherit"
                                                size="small"
                                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => handleResetRowBlank(idx)}
                                                title="Reset row to blank"
                                            >
                                                <span className="hidden sm:inline">Clear</span>
                                            </CommonButton>
                                            <CommonButton
                                                color="error"
                                                size="small"
                                                startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => remove(idx)}
                                                title="Remove Exception"
                                            >
                                                <span className="hidden sm:inline">Remove</span>
                                            </CommonButton>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                            Exception Type
                                        </label>
                                        <select
                                            aria-label="Select exception type"
                                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                                            disabled={disabled}
                                            value={current.exception_type || 'Holiday'}
                                            onChange={(e) => {
                                                update(idx, {
                                                    ...current,
                                                    exception_type: e.target.value as CalendarExceptionType
                                                });
                                            }}
                                        >
                                            <option value="Holiday">Holiday</option>
                                            <option value="Break">Break</option>
                                            <option value="Suspension">Suspension</option>
                                            <option value="Special Class">Special Class</option>
                                            <option value="Exam Day">Exam Day</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                            Class Impact
                                        </label>
                                        <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                                            <input
                                                checked={Boolean(current.affects_attendance)}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                disabled={disabled}
                                                type="checkbox"
                                                onChange={(e) => {
                                                    update(idx, {
                                                        ...current,
                                                        affects_attendance: e.target.checked
                                                    });
                                                }}
                                            />
                                            <span className="font-medium">Class Suspended</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            disabled={disabled}
                                            type="date"
                                            value={current.start_date || ''}
                                            onChange={(e) => {
                                                update(idx, { ...current, start_date: e.target.value });
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                            End Date
                                        </label>
                                        <input
                                            className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                            disabled={disabled}
                                            type="date"
                                            value={current.end_date || ''}
                                            onChange={(e) => {
                                                update(idx, { ...current, end_date: e.target.value });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                        Description / Note (Optional)
                                    </label>
                                    <input
                                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                        disabled={disabled}
                                        placeholder="e.g. Regular National Non-Working Holiday"
                                        type="text"
                                        value={current.description || ''}
                                        onChange={(e) => {
                                            update(idx, { ...current, description: e.target.value });
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
