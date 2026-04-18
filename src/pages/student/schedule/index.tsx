import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonModal from '@components/modal/CommonModal';
import { getStudentSchedule, upsertSectionColor } from '@services/student-portal.service';
import { DayOfWeek, SectionScheduleSlot, StudentScheduleSection } from '@type/student-portal.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<DayOfWeek, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
};

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
    TIME_SLOTS.push(`${String(h)
        .padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${String(h)
        .padStart(2, '0')}:30`);
}

const FALLBACK_COLORS = [
    '#4F86C6', '#E07B54', '#6BAE75', '#B07FD4',
    '#E0B44A', '#5BB8C5', '#D46B8A', '#7FAE9E'
];

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':')
        .map(Number);
    return h * 60 + m;
}

function slotToMinutes(slot: string): number {
    return timeToMinutes(slot);
}

interface ColorFormValues {
    color: string;
}

interface ScheduleSection extends StudentScheduleSection {
    color: string;
}

export default function StudentSchedule() {
    const [sections, setSections] = useState<ScheduleSection[]>([]);
    const [colorTarget, setColorTarget] = useState<ScheduleSection | null>(null);

    const colorMethods = useForm<ColorFormValues>({
        defaultValues: { color: '#4F86C6' }
    });

    useEffect(function() {
        async function fetchSchedule() {
            const result = await getStudentSchedule();

            if (result.data) {
                const colored = result.data.map((section, index) => ({
                    ...section,
                    color: FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                }));
                setSections(colored);
            }
        }

        fetchSchedule();
    }, []);

    function handleOpenColorPicker(section: ScheduleSection) {
        setColorTarget(section);
        colorMethods.reset({ color: section.color });
    }

    async function handleSaveColor(values: ColorFormValues) {
        if (!colorTarget) return;

        const result = await upsertSectionColor(colorTarget.section_id, values.color);

        if (!result.error) {
            setSections((prev) =>
                prev.map((s) => s.section_id === colorTarget.section_id
                    ? { ...s, color: values.color }
                    : s));
            setColorTarget(null);
        }
    }

    function getBlocksForDayAndSlot(day: DayOfWeek, slot: string): { section: ScheduleSection; schedule: SectionScheduleSlot } | null {
        const slotMinutes = slotToMinutes(slot);

        for (const section of sections) {
            for (const schedule of section.schedules) {
                if (schedule.day_of_week !== day) continue;

                const start = timeToMinutes(schedule.time_start.slice(0, 5));
                const end = timeToMinutes(schedule.time_end.slice(0, 5));

                if (slotMinutes >= start && slotMinutes < end) {
                    return { section, schedule };
                }
            }
        }

        return null;
    }

    function isBlockStart(day: DayOfWeek, slot: string): boolean {
        const slotMinutes = slotToMinutes(slot);

        for (const section of sections) {
            for (const schedule of section.schedules) {
                if (schedule.day_of_week !== day) continue;

                const start = timeToMinutes(schedule.time_start.slice(0, 5));
                if (slotMinutes === start) return true;
            }
        }

        return false;
    }

    function getBlockHeight(schedule: SectionScheduleSlot): number {
        const start = timeToMinutes(schedule.time_start.slice(0, 5));
        const end = timeToMinutes(schedule.time_end.slice(0, 5));
        return (end - start) / 30;
    }

    return (
        <CommonCard className="flex flex-col h-full overflow-hidden w-full">
            <div className="flex items-center justify-between p-4 pb-0">
                <div className="flex flex-col">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        My Schedule
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        Click any subject block to customize its color.
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {sections.map((section) => (
                        <CommonButton
                            key={section.section_id}
                            size="small"
                            sx={{
                                backgroundColor: section.color,
                                color: '#fff',
                                '&:hover': { backgroundColor: section.color, opacity: 0.85 }
                            }}
                            variant="contained"
                            onClick={function() {
                                handleOpenColorPicker(section);
                            }}
                        >
                            {section.course_code}
                        </CommonButton>
                    ))}
                </div>
            </div>
            <div className="flex flex-1 min-h-0 overflow-auto p-4">
                <div className="flex flex-col min-w-0 w-full">
                    <div className="flex">
                        <div className="flex-shrink-0 w-16" />
                        {DAYS.map((day) => (
                            <div
                                className="flex-1 font-medium pb-2 text-(--mui-palette-text-secondary) text-center text-xs"
                                key={day}
                            >
                                {DAY_SHORT[day]}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-1">
                        <div className="flex flex-col flex-shrink-0 w-16">
                            {TIME_SLOTS.map((slot) => (
                                <div
                                    className="flex h-8 items-start justify-end pr-2"
                                    key={slot}
                                >
                                    {slot.endsWith(':00') && (
                                        <span className="text-(--mui-palette-text-disabled) text-xs">
                                            {slot}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-1">
                            {DAYS.map((day) => (
                                <div
                                    className="border-(--mui-palette-divider) border-l flex flex-1 flex-col relative"
                                    key={day}
                                >
                                    {TIME_SLOTS.map((slot) => {
                                        const block = getBlocksForDayAndSlot(day, slot);
                                        const blockStart = isBlockStart(day, slot);

                                        return (
                                            <div
                                                className="border-(--mui-palette-divider) border-b h-8 relative"
                                                key={slot}
                                            >
                                                {block && blockStart && (
                                                    <div
                                                        className="absolute cursor-pointer flex flex-col inset-x-0.5 justify-center overflow-hidden px-1 rounded top-0 z-10"
                                                        style={{
                                                            backgroundColor: block.section.color,
                                                            height: `${getBlockHeight(block.schedule) * 32}px`,
                                                            opacity: 0.9
                                                        }}
                                                        onClick={function() {
                                                            handleOpenColorPicker(block.section);
                                                        }}
                                                    >
                                                        <span className="font-medium text-white text-xs truncate">
                                                            {block.section.course_code}
                                                        </span>
                                                        <span className="opacity-80 text-white text-xs truncate">
                                                            {block.schedule.room ?? block.section.section_code}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: `Choose a color for ${colorTarget?.course_code ?? ''}`,
                        title: 'Customize Color'
                    }
                }}
                open={colorTarget !== null}
                onClose={function() {
                    setColorTarget(null);
                }}
            >
                <div className="flex flex-col gap-4 w-72">
                    <ValidCommonInput
                        control={colorMethods.control}
                        fullWidth
                        label="Color"
                        name="color"
                        type="color"
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={function() {
                                setColorTarget(null);
                            }}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            size="small"
                            variant="contained"
                            onClick={colorMethods.handleSubmit(handleSaveColor)}
                        >
                            Save Color
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </CommonCard>
    );
}