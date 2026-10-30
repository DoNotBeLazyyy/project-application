import CommonButton from '@components/button/CommonButton';
import FormLabel from '@components/form/FormLabel';
import ValidCommonInput from '@components/input/ValidCommonInput';
import {
    CalendarDotsIcon, CaretDownIcon, CheckIcon, ClockIcon, PlusCircleIcon, TrashIcon
} from '@phosphor-icons/react';
import { DayOfWeek, SectionFormValues, SectionScheduleBlock } from '@type/section.type';
import { useEffect, useState } from 'react';
import { Control, useController, useFormContext, useFormState, useWatch } from 'react-hook-form';

const DAYS_OF_WEEK: { label: string; short: string; value: DayOfWeek }[] = [
    { label: 'Monday', short: 'Mon', value: 'Monday' },
    { label: 'Tuesday', short: 'Tue', value: 'Tuesday' },
    { label: 'Wednesday', short: 'Wed', value: 'Wednesday' },
    { label: 'Thursday', short: 'Thu', value: 'Thursday' },
    { label: 'Friday', short: 'Fri', value: 'Friday' },
    { label: 'Saturday', short: 'Sat', value: 'Saturday' },
    { label: 'Sunday', short: 'Sun', value: 'Sunday' }
];

interface SectionScheduleConfigProps {
    control: Control<SectionFormValues>;
    disabled?: boolean;
}

export default function SectionScheduleConfig({
    control,
    disabled = false
}: SectionScheduleConfigProps) {
    const {
        field: { onChange: onSchedulesChange }
    } = useController({
        control,
        defaultValue: [
            {
                days: ['Monday', 'Wednesday'],
                room: '',
                time_end: '10:00',
                time_start: '08:00'
            }
        ],
        name: 'schedules'
    });

    // Watched (not exact) so edits made by the per-slot time / room fields are reflected here
    const schedulesValue = useWatch({ control, name: 'schedules' });
    const formContext = useFormContext<SectionFormValues>();
    const { errors } = useFormState({ control });
    const scheduleErrors = errors.schedules as any;

    const [collapsedSlots, setCollapsedSlots] = useState<Record<number, boolean>>({});

    function toggleSlotCollapse(index: number) {
        setCollapsedSlots((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const blocks: SectionScheduleBlock[] = schedulesValue || [];

    useEffect(() => {
        if (!scheduleErrors) return;
        setCollapsedSlots((prev) => {
            const next = { ...prev };
            let changed = false;
            blocks.forEach((_, idx) => {
                if (scheduleErrors[idx] && next[idx]) {
                    next[idx] = false;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [scheduleErrors, blocks]);

    function handleAddSlot() {
        const newBlock: SectionScheduleBlock = {
            days: ['Tuesday', 'Thursday'],
            room: '',
            time_end: '15:00',
            time_start: '13:00'
        };
        onSchedulesChange([...blocks, newBlock]);
    }

    function handleRemoveSlot(index: number) {
        onSchedulesChange(blocks.filter((_, i) => i !== index));
    }

    function handleUpdateSlot(index: number, patch: Partial<SectionScheduleBlock>) {
        if (patch.time_start !== undefined) {
            formContext?.clearErrors?.(`schedules.${index}.time_start` as any);
        }
        if (patch.time_end !== undefined) {
            formContext?.clearErrors?.(`schedules.${index}.time_end` as any);
        }
        const updated = [...blocks];
        updated[index] = { ...updated[index], ...patch };
        onSchedulesChange(updated);
    }

    function handleToggleDay(index: number, day: DayOfWeek) {
        const target = blocks[index];
        if (!target) return;

        formContext?.clearErrors?.(`schedules.${index}.days` as any);

        const currentDays = target.days || [];
        const isSelected = currentDays.includes(day);

        const newDays = isSelected
            ? currentDays.filter((d) => d !== day)
            : [...currentDays, day];

        handleUpdateSlot(index, { days: newDays });
    }

    return (
        <div className="bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 flex flex-col gap-3 p-4 rounded-xl shadow-xs">
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-zinc-700/60 flex items-center justify-between pb-3">
                <div className="flex gap-2 items-center">
                    <CalendarDotsIcon className="size-5 shrink-0 text-brand-600 dark:text-brand-400" weight="bold" />
                    <div>
                        <h4 className="font-semibold text-slate-900 text-sm dark:text-slate-100">
                            Class Schedule Assignment
                        </h4>
                    </div>
                </div>

                {!disabled && (
                    <CommonButton
                        color="primary"
                        size="small"
                        startIcon={<PlusCircleIcon weight="bold" />}
                        variant="outlined"
                        onClick={handleAddSlot}
                    >
                        Add Schedule Slot
                    </CommonButton>
                )}
            </div>

            {/* Schedule Slot Cards */}
            {blocks.length === 0
                ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 dark:bg-zinc-900/50 dark:border-zinc-700 p-4 rounded-lg text-center text-slate-500 text-xs">
                        No schedule slots configured. Click &quot;Add Schedule Slot&quot; to assign class times.
                    </div>
                )
                : (
                    <div className="flex flex-col gap-3 pt-1">
                        {blocks.map((block, index) => {
                            const scheduleError = scheduleErrors?.[index];
                            const formattedDays = (block.days || []).length > 0
                                ? (block.days || []).map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.short || d).join(', ')
                                : 'No days';
                            const timeRange = `${block.time_start || '08:00'} - ${block.time_end || '10:00'}`;

                            return (
                                <div
                                    className="bg-slate-50/50 border border-slate-200 dark:bg-zinc-900/40 dark:border-zinc-700 flex flex-col gap-3 p-3.5 rounded-xl"
                                    // Remount on add/remove: the per-field controllers watch their exact
                                    // path and would otherwise keep a shifted slot's stale value
                                    key={`${blocks.length}-${index}`}
                                >
                                    <div className="border-b border-slate-200/60 dark:border-zinc-700/60 flex gap-2 items-center justify-between pb-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="flex font-bold gap-1.5 items-center text-brand-700 text-xs dark:text-brand-300 shrink-0">
                                                <ClockIcon className="size-3.5 text-brand-600" weight="bold" />
                                                Slot #{index + 1}
                                            </span>
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                                                {formattedDays} • {timeRange}
                                            </span>
                                            {block.room && (
                                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0 hidden sm:inline">
                                                    {block.room}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!disabled && blocks.length > 1 && (
                                                <CommonButton
                                                    aria-label="Remove schedule slot"
                                                    color="error"
                                                    size="xsmall"
                                                    startIcon={<TrashIcon weight="bold" />}
                                                    variant="text"
                                                    onClick={() => handleRemoveSlot(index)}
                                                >
                                                    Remove
                                                </CommonButton>
                                            )}
                                            <button
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                title={collapsedSlots[index] ? 'Expand schedule slot' : 'Collapse schedule slot'}
                                                type="button"
                                                aria-label={collapsedSlots[index] ? 'Expand schedule slot' : 'Collapse schedule slot'}
                                                onClick={() => toggleSlotCollapse(index)}
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedSlots[index] ? '-rotate-90' : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">{collapsedSlots[index] ? 'Expand' : 'Collapse'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className={collapsedSlots[index] ? 'hidden' : 'flex flex-col gap-3'}>
                                        {/* Time Range Inputs */}
                                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
                                            {/* Errors are set by the wizard's step validation and shown by the field */}
                                            <ValidCommonInput
                                                containerClassName="w-full"
                                                control={control}
                                                disabled={disabled}
                                                helperText="Class start time"
                                                isRequired
                                                label="Start Time"
                                                name={`schedules.${index}.time_start`}
                                                type="time"
                                            />
                                            <ValidCommonInput
                                                containerClassName="w-full"
                                                control={control}
                                                disabled={disabled}
                                                helperText="Class end time (must be after the start time)"
                                                isRequired
                                                label="End Time"
                                                name={`schedules.${index}.time_end`}
                                                type="time"
                                            />
                                            <ValidCommonInput
                                                containerClassName="w-full"
                                                control={control}
                                                disabled={disabled}
                                                helperText="Specific room override (optional)"
                                                label="Room"
                                                name={`schedules.${index}.room`}
                                                placeholder="e.g. Room 301"
                                                type="text"
                                            />
                                        </div>

                                        {/* Selectable Days (Mon to Sun) */}
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                <FormLabel
                                                    errorMessage={scheduleError?.days?.message}
                                                    isRequired
                                                    label="Days of Week"
                                                />
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    ({(block.days || []).length > 0
                                                        ? (block.days || []).join(', ')
                                                        : 'None selected'})
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {DAYS_OF_WEEK.map((d) => {
                                                    const isSelected = (block.days || []).includes(d.value);
                                                    return (
                                                        <button
                                                            aria-pressed={isSelected}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
                                                                isSelected
                                                                    ? 'bg-blue-600 dark:bg-blue-500 text-white font-bold shadow-xs border border-blue-700 dark:border-blue-400 ring-2 ring-blue-500/25'
                                                                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white'
                                                            } ${disabled
                                                                ? 'opacity-60 cursor-not-allowed'
                                                                : ''}`}
                                                            disabled={disabled}
                                                            key={d.value}
                                                            style={
                                                                isSelected
                                                                    ? {
                                                                        backgroundColor: 'var(--mui-tokens-color-brand-600, #2563EB)',
                                                                        borderColor: 'var(--mui-tokens-color-brand-700, #1D4ED8)',
                                                                        color: '#FFFFFF'
                                                                    }
                                                                    : undefined
                                                            }
                                                            type="button"
                                                            onClick={() => handleToggleDay(index, d.value)}
                                                        >
                                                            {isSelected && (
                                                                <CheckIcon className="size-3.5 text-white shrink-0" weight="bold" />
                                                            )}
                                                            <span>{d.short}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </div>
    );
}