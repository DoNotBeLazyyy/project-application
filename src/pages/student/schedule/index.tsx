import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonModal from '@components/modal/CommonModal';
import Tooltip from '@mui/material/Tooltip';
import { ShieldCheck } from '@phosphor-icons/react';
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

const ROW_HEIGHT = 32;
const SLOT_MINUTES = 30;
const DAY_START_MINUTES = 7 * 60;
const GRID_HEIGHT = TIME_SLOTS.length * ROW_HEIGHT;

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':')
        .map(Number);
    return h * 60 + m;
}

interface ColorFormValues {
    color: string;
}

interface ScheduleSection extends StudentScheduleSection {
    color: string;
}

interface DayEntry {
    section: ScheduleSection;
    schedule: SectionScheduleSlot;
    start: number;
    end: number;
}

interface PositionedBlock {
    section: ScheduleSection;
    schedule: SectionScheduleSlot;
    top: number;
    height: number;
    left: number;
    width: number;
}

function buildDayLayout(day: DayOfWeek, sections: ScheduleSection[]): PositionedBlock[] {
    const entries: DayEntry[] = [];

    for (const section of sections) {
        for (const schedule of section.schedules) {
            if (schedule.day_of_week !== day) continue;

            entries.push({
                section,
                schedule,
                start: timeToMinutes(schedule.time_start.slice(0, 5)),
                end: timeToMinutes(schedule.time_end.slice(0, 5))
            });
        }
    }

    entries.sort((a, b) => a.start - b.start || b.end - a.end);

    const blocks: PositionedBlock[] = [];
    let cluster: DayEntry[] = [];
    let clusterEnd = -1;

    function flushCluster() {
        if (cluster.length === 0) return;

        const columnEnds: number[] = [];
        const assignedColumns: number[] = [];

        for (const entry of cluster) {
            let column = columnEnds.findIndex((end) => end <= entry.start);

            if (column === -1) {
                column = columnEnds.length;
                columnEnds.push(entry.end);
            }
            else {
                columnEnds[column] = entry.end;
            }

            assignedColumns.push(column);
        }

        const total = columnEnds.length;

        cluster.forEach((entry, index) => {
            blocks.push({
                section: entry.section,
                schedule: entry.schedule,
                top: ((entry.start - DAY_START_MINUTES) / SLOT_MINUTES) * ROW_HEIGHT,
                height: ((entry.end - entry.start) / SLOT_MINUTES) * ROW_HEIGHT,
                left: (assignedColumns[index] / total) * 100,
                width: (1 / total) * 100
            });
        });

        cluster = [];
    }

    for (const entry of entries) {
        if (cluster.length > 0 && entry.start >= clusterEnd) {
            flushCluster();
            clusterEnd = -1;
        }

        cluster.push(entry);
        clusterEnd = Math.max(clusterEnd, entry.end);
    }

    flushCluster();

    return blocks;
}

function buildBlockTooltip(block: PositionedBlock): string {
    const range = `${block.schedule.time_start.slice(0, 5)} - ${block.schedule.time_end.slice(0, 5)}`;
    const room = block.schedule.room ?? 'No room assigned';
    const base = `${block.section.course_code} · ${block.section.section_code} · ${range} · ${room}`;

    if (!block.section.is_conflict_authorized) return base;

    return `${base} — Authorized overlap${block.section.conflict_reason
        ? `: ${block.section.conflict_reason}`
        : ''}`;
}

export default function StudentSchedule() {
    const [sections, setSections] = useState<ScheduleSection[]>([]);
    const [hiddenSectionIds, setHiddenSectionIds] = useState<string[]>([]);
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

    const visibleSections = sections.filter((section) => !hiddenSectionIds.includes(section.section_id));
    const authorizedCount = sections.filter((section) => section.is_conflict_authorized).length;

    function handleToggleSection(sectionId: string) {
        setHiddenSectionIds((prev) => prev.includes(sectionId)
            ? prev.filter((id) => id !== sectionId)
            : [...prev, sectionId]);
    }

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

    return (
        <CommonCard className="flex flex-col h-full overflow-hidden w-full">
            <div className="flex flex-col gap-3 p-4 pb-0">
                <div className="flex flex-col">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        My Schedule
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        Click a subject below to show or hide it. Click a schedule block to customize its color.
                    </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {sections.map((section) => {
                        const isHidden = hiddenSectionIds.includes(section.section_id);

                        return (
                            <CommonButton
                                key={section.section_id}
                                size="small"
                                startIcon={section.is_conflict_authorized
                                    ? <ShieldCheck size={16} weight="fill" />
                                    : undefined}
                                sx={{
                                    backgroundColor: isHidden
                                        ? 'transparent'
                                        : section.color,
                                    borderColor: section.color,
                                    color: isHidden
                                        ? section.color
                                        : '#fff',
                                    '&:hover': {
                                        backgroundColor: isHidden
                                            ? 'transparent'
                                            : section.color,
                                        borderColor: section.color,
                                        opacity: 0.85
                                    }
                                }}
                                variant={isHidden
                                    ? 'outlined'
                                    : 'contained'}
                                onClick={function() {
                                    handleToggleSection(section.section_id);
                                }}
                            >
                                {section.course_code}
                            </CommonButton>
                        );
                    })}
                    {hiddenSectionIds.length > 0 && (
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="text"
                            onClick={function() {
                                setHiddenSectionIds([]);
                            }}
                        >
                            Show all
                        </CommonButton>
                    )}
                </div>
                {authorizedCount > 0 && (
                    <div className="flex gap-2 items-center text-(--mui-palette-warning-main) text-xs">
                        <ShieldCheck size={16} weight="fill" />
                        <span>
                            {authorizedCount === 1
                                ? '1 subject has an authorized schedule overlap.'
                                : `${authorizedCount} subjects have an authorized schedule overlap.`}
                            {' '}
                            Overlapping blocks are shown side by side.
                        </span>
                    </div>
                )}
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
                                    className="border-(--mui-palette-divider) border-l flex-1 relative"
                                    key={day}
                                    style={{ height: `${GRID_HEIGHT}px` }}
                                >
                                    {TIME_SLOTS.map((slot) => (
                                        <div
                                            className="border-(--mui-palette-divider) border-b h-8"
                                            key={slot}
                                        />
                                    ))}
                                    {buildDayLayout(day, visibleSections)
                                        .map((block) => (
                                            <Tooltip
                                                arrow
                                                key={block.schedule.id}
                                                title={buildBlockTooltip(block)}
                                            >
                                                <div
                                                    className="absolute cursor-pointer flex flex-col justify-center overflow-hidden px-1 rounded z-10"
                                                    style={{
                                                        backgroundColor: block.section.color,
                                                        height: `${block.height}px`,
                                                        left: `calc(${block.left}% + 2px)`,
                                                        opacity: 0.9,
                                                        outline: block.section.is_conflict_authorized
                                                            ? '2px solid var(--mui-palette-warning-main)'
                                                            : 'none',
                                                        top: `${block.top}px`,
                                                        width: `calc(${block.width}% - 4px)`
                                                    }}
                                                    onClick={function() {
                                                        handleOpenColorPicker(block.section);
                                                    }}
                                                >
                                                    <div className="flex gap-1 items-center">
                                                        {block.section.is_conflict_authorized && (
                                                            <ShieldCheck
                                                                className="flex-shrink-0 text-white"
                                                                size={12}
                                                                weight="fill"
                                                            />
                                                        )}
                                                        <span className="font-medium text-white text-xs truncate">
                                                            {block.section.course_code}
                                                        </span>
                                                    </div>
                                                    <span className="opacity-80 text-white text-xs truncate">
                                                        {block.schedule.room ?? block.section.section_code}
                                                    </span>
                                                </div>
                                            </Tooltip>
                                        ))}
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