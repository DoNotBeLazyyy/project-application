import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import { CalendarDotsIcon, ClockIcon, PlusCircleIcon, TrashIcon } from '@phosphor-icons/react';
import { DayOfWeek, SectionScheduleBlock } from '@type/section.type';
import { Control, useController } from 'react-hook-form';

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
    control: Control<any>;
    disabled?: boolean;
}

export default function SectionScheduleConfig({
    control,
    disabled = false
}: SectionScheduleConfigProps) {
    const {
        field: { value: schedulesValue, onChange: onSchedulesChange }
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

    const blocks: SectionScheduleBlock[] = schedulesValue || [];

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
        const updated = [...blocks];
        updated[index] = { ...updated[index], ...patch };
        onSchedulesChange(updated);
    }

    function handleToggleDay(index: number, day: DayOfWeek) {
        const target = blocks[index];
        if (!target) return;

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
                        <p className="text-slate-500 text-xs">
                            Select time ranges and active days (Monday – Sunday) for class sessions.
                        </p>
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
            {blocks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 dark:bg-zinc-900/50 dark:border-zinc-700 p-4 rounded-lg text-center text-slate-500 text-xs">
                    No schedule slots configured. Click "Add Schedule Slot" to assign class times.
                </div>
            ) : (
                <div className="flex flex-col gap-3 pt-1">
                    {blocks.map((block, index) => {
                        return (
                            <div
                                className="bg-slate-50/50 border border-slate-200 dark:bg-zinc-900/40 dark:border-zinc-700 flex flex-col gap-3 p-3.5 rounded-xl"
                                key={index}
                            >
                                <div className="border-b border-slate-200/60 dark:border-zinc-700/60 flex gap-2 items-center justify-between pb-2">
                                    <span className="flex font-bold gap-1.5 items-center text-brand-700 text-xs dark:text-brand-300">
                                        <ClockIcon className="size-3.5 text-brand-600" weight="bold" />
                                        Slot #{index + 1}
                                    </span>

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
                                </div>

                                {/* Time Range Inputs */}
                                <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
                                    <CommonInput
                                        containerClassName="w-full"
                                        disabled={disabled}
                                        helperText="Class start time"
                                        label="Start Time"
                                        size="small"
                                        type="time"
                                        value={block.time_start || '08:00'}
                                        onChange={(e) => handleUpdateSlot(index, { time_start: e.target.value })}
                                    />
                                    <CommonInput
                                        containerClassName="w-full"
                                        disabled={disabled}
                                        helperText="Class end time"
                                        label="End Time"
                                        size="small"
                                        type="time"
                                        value={block.time_end || '10:00'}
                                        onChange={(e) => handleUpdateSlot(index, { time_end: e.target.value })}
                                    />
                                    <CommonInput
                                        containerClassName="w-full"
                                        disabled={disabled}
                                        helperText="Specific room override (optional)"
                                        label="Room"
                                        placeholder="e.g. Room 301"
                                        size="small"
                                        type="text"
                                        value={block.room || ''}
                                        onChange={(e) => handleUpdateSlot(index, { room: e.target.value })}
                                    />
                                </div>

                                {/* Selectable Days (Mon to Sun) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-medium text-slate-700 text-xs dark:text-slate-300">
                                        Days of Week (Monday – Sunday)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DAYS_OF_WEEK.map((d) => {
                                            const isSelected = (block.days || []).includes(d.value);
                                            return (
                                                <button
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                        isSelected
                                                            ? 'bg-brand-600 text-white shadow-xs border border-brand-600'
                                                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 opacity-80'
                                                    }`}
                                                    disabled={disabled}
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => handleToggleDay(index, d.value)}
                                                >
                                                    {d.short}
                                                </button>
                                            );
                                        })}
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
