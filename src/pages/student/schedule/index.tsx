import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonModal from '@components/modal/CommonModal';
import Tooltip from '@mui/material/Tooltip';
import {
    CalendarBlank, Check, Clock, MapPin, ShieldCheck, User
} from '@phosphor-icons/react';
import { getStudentSchedule, listMySectionColors, upsertSectionColor } from '@services/student-portal.service';
import { DayOfWeek, SectionScheduleSlot, StudentScheduleSection } from '@type/student-portal.type';
import {
    getContrastTextColor, isScheduleColorAllowed, normalizeHexColor, resolveScheduleColor, SCHEDULE_COLOR_PALETTE, SCHEDULE_COLOR_RULE_MESSAGE, shadeColor, withAlpha
} from '@utils/schedule-color.util';
import { ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT: Record<DayOfWeek, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
};

const HOUR_HEIGHT = 64;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const MIN_BLOCK_HEIGHT = 24;
const COMPACT_BLOCK_HEIGHT = 44;
const DETAILED_BLOCK_HEIGHT = 72;

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
    start: number;
    end: number;
    top: number;
    height: number;
    left: number;
    width: number;
}

interface GridRange {
    startHour: number;
    endHour: number;
}

function timeToMinutes(time: string): number {
    const [hour, minute] = time.slice(0, 5)
        .split(':')
        .map(Number);

    return hour * 60 + minute;
}

function formatTimeLabel(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12
        ? 'PM'
        : 'AM';
    const displayHour = hour % 12 === 0
        ? 12
        : hour % 12;

    return `${displayHour}:${String(minute)
        .padStart(2, '0')} ${suffix}`;
}

function formatRange(start: number, end: number): string {
    return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
}

function getTodayName(): DayOfWeek {
    return DAYS[(new Date()
        .getDay() + 6) % 7];
}

function getGridRange(sections: ScheduleSection[]): GridRange {
    let earliest = Number.POSITIVE_INFINITY;
    let latest = Number.NEGATIVE_INFINITY;

    for (const section of sections) {
        for (const schedule of section.schedules) {
            earliest = Math.min(earliest, timeToMinutes(schedule.time_start));
            latest = Math.max(latest, timeToMinutes(schedule.time_end));
        }
    }

    if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
        return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
    }

    const startHour = Math.max(Math.floor(earliest / 60) - 1, 0);
    const endHour = Math.min(Math.ceil(latest / 60) + 1, 24);

    return {
        startHour,
        endHour: Math.max(endHour, startHour + 4)
    };
}

function getActiveDays(sections: ScheduleSection[]): DayOfWeek[] {
    const scheduled = new Set<DayOfWeek>();

    for (const section of sections) {
        for (const schedule of section.schedules) {
            scheduled.add(schedule.day_of_week);
        }
    }

    return DAYS.filter((day) => WEEKDAYS.includes(day) || scheduled.has(day));
}

function buildDayLayout(day: DayOfWeek, sections: ScheduleSection[], startHour: number): PositionedBlock[] {
    const entries: DayEntry[] = [];
    const gridStart = startHour * 60;

    for (const section of sections) {
        for (const schedule of section.schedules) {
            if (schedule.day_of_week !== day) continue;

            entries.push({
                section,
                schedule,
                start: timeToMinutes(schedule.time_start),
                end: timeToMinutes(schedule.time_end)
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
                start: entry.start,
                end: entry.end,
                top: ((entry.start - gridStart) / 60) * HOUR_HEIGHT,
                height: Math.max(((entry.end - entry.start) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT),
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

function renderBlockTooltip(block: PositionedBlock): ReactNode {
    return (
        <div className="flex flex-col gap-1 py-1">
            <span className="font-semibold text-sm">
                {block.section.course_code}
                {' · '}
                {block.section.section_code}
            </span>
            <span className="opacity-90 text-xs">{block.section.course_title}</span>
            <span className="flex gap-1 items-center text-xs">
                <Clock size={12} weight="bold" />
                {formatRange(block.start, block.end)}
            </span>
            <span className="flex gap-1 items-center text-xs">
                <MapPin size={12} weight="bold" />
                {block.schedule.room ?? 'No room assigned'}
            </span>
            <span className="flex gap-1 items-center text-xs">
                <User size={12} weight="bold" />
                {block.section.faculty_name}
            </span>
            {block.section.is_conflict_authorized && (
                <span className="flex gap-1 items-center text-xs">
                    <ShieldCheck size={12} weight="fill" />
                    Authorized overlap
                    {block.section.conflict_reason
                        ? `: ${block.section.conflict_reason}`
                        : ''}
                </span>
            )}
        </div>
    );
}

export default function StudentSchedule() {
    const [sections, setSections] = useState<ScheduleSection[]>([]);
    const [hiddenSectionIds, setHiddenSectionIds] = useState<string[]>([]);
    const [colorTarget, setColorTarget] = useState<ScheduleSection | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [nowMinutes, setNowMinutes] = useState(() => {
        const now = new Date();

        return now.getHours() * 60 + now.getMinutes();
    });

    const colorMethods = useForm<ColorFormValues>({
        defaultValues: { color: SCHEDULE_COLOR_PALETTE[0] },
        mode: 'onChange'
    });

    const selectedColor = normalizeHexColor(colorMethods.watch('color')) ?? SCHEDULE_COLOR_PALETTE[0];

    useEffect(function() {
        async function fetchSchedule() {
            const [result, colorResult] = await Promise.all([
                getStudentSchedule(),
                listMySectionColors()
            ]);

            if (result.data) {
                const savedColors = new Map(
                    (colorResult.data ?? []).map((entry) => [entry.section_id, entry.color])
                );
                const colored = result.data.map((section, index) => ({
                    ...section,
                    color: resolveScheduleColor(savedColors.get(section.section_id), index)
                }));
                setSections(colored);
            }

            setHasLoaded(true);
        }

        fetchSchedule();
    }, []);

    useEffect(function() {
        const timer = window.setInterval(function() {
            const now = new Date();

            setNowMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60000);

        return function() {
            window.clearInterval(timer);
        };
    }, []);

    const visibleSections = sections.filter((section) => !hiddenSectionIds.includes(section.section_id));
    const authorizedCount = sections.filter((section) => section.is_conflict_authorized).length;
    const activeDays = getActiveDays(sections);
    const { startHour, endHour } = getGridRange(sections);
    const hours = Array.from({ length: endHour - startHour }, (unused, index) => startHour + index);
    const gridHeight = hours.length * HOUR_HEIGHT;
    const todayName = getTodayName();
    const nowOffset = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
    const isNowVisible = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60 && activeDays.includes(todayName);
    const weeklyHours = sections.reduce(
        (total, section) => total + section.schedules.reduce(
            (sum, schedule) => sum + (timeToMinutes(schedule.time_end) - timeToMinutes(schedule.time_start)),
            0
        ),
        0
    ) / 60;

    function handleToggleSection(sectionId: string) {
        setHiddenSectionIds((prev) => prev.includes(sectionId)
            ? prev.filter((id) => id !== sectionId)
            : [...prev, sectionId]);
    }

    function handleOpenColorPicker(section: ScheduleSection) {
        setColorTarget(section);
        colorMethods.reset({ color: section.color });
    }

    function handleSelectSwatch(swatch: string) {
        colorMethods.setValue('color', swatch, { shouldValidate: true });
    }

    async function handleSaveColor(values: ColorFormValues) {
        if (!colorTarget) return;

        const hex = normalizeHexColor(values.color);

        if (!hex || !isScheduleColorAllowed(hex)) {
            colorMethods.setError('color', { message: SCHEDULE_COLOR_RULE_MESSAGE });

            return;
        }

        const result = await upsertSectionColor(colorTarget.section_id, hex);

        if (!result.error) {
            setSections((prev) =>
                prev.map((section) => section.section_id === colorTarget.section_id
                    ? { ...section, color: hex }
                    : section));
            setColorTarget(null);
        }
    }

    return (
        <CommonCard className="flex flex-col h-full overflow-hidden w-full">
            <div className="border-(--mui-palette-divider) border-b flex flex-col gap-3 p-4">
                <div className="flex flex-wrap gap-2 items-start justify-between">
                    <div className="flex flex-col">
                        <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            My Schedule
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            Click a subject chip to show or hide it. Click a block to change its color.
                        </span>
                    </div>
                    {sections.length > 0 && (
                        <div className="flex gap-4 items-center">
                            <div className="flex flex-col items-end">
                                <span className="font-semibold text-(--mui-palette-text-primary) text-lg leading-none">
                                    {sections.length}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">Subjects</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="font-semibold text-(--mui-palette-text-primary) text-lg leading-none">
                                    {weeklyHours.toFixed(1)}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">Hours / week</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {sections.map((section) => {
                        const isHidden = hiddenSectionIds.includes(section.section_id);
                        const textColor = getContrastTextColor(section.color);

                        return (
                            <Tooltip
                                arrow
                                key={section.section_id}
                                title={`${section.course_title} · ${section.section_code}`}
                            >
                                <span>
                                    <CommonButton
                                        size="small"
                                        startIcon={section.is_conflict_authorized
                                            ? <ShieldCheck size={14} weight="fill" />
                                            : (
                                                <span
                                                    className="rounded-full size-2.5"
                                                    style={{ backgroundColor: isHidden
                                                        ? section.color
                                                        : textColor }}
                                                />
                                            )}
                                        sx={{
                                            backgroundColor: isHidden
                                                ? 'transparent'
                                                : section.color,
                                            borderColor: section.color,
                                            color: isHidden
                                                ? 'var(--mui-palette-text-secondary)'
                                                : textColor,
                                            opacity: isHidden
                                                ? 0.7
                                                : 1,
                                            textDecoration: isHidden
                                                ? 'line-through'
                                                : 'none',
                                            '&:hover': {
                                                backgroundColor: isHidden
                                                    ? 'transparent'
                                                    : shadeColor(section.color, -0.12),
                                                borderColor: section.color,
                                                opacity: 1
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
                                </span>
                            </Tooltip>
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
            {hasLoaded && sections.length === 0
                ? (
                    <div className="flex flex-1 flex-col gap-2 items-center justify-center p-8 text-center">
                        <CalendarBlank
                            className="text-(--mui-palette-text-disabled)"
                            size={48}
                        />
                        <span className="font-medium text-(--mui-palette-text-primary)">
                            No schedule yet
                        </span>
                        <span className="max-w-sm text-(--mui-palette-text-secondary) text-sm">
                            Your class schedule will appear here once your enrollment for the active term is processed.
                        </span>
                    </div>
                )
                : (
                    <div className="flex-1 min-h-0 overflow-auto">
                        <div className="min-w-3xl">
                            <div className="bg-(--mui-palette-background-paper) flex sticky top-0 z-30">
                                <div className="bg-(--mui-palette-background-paper) shrink-0 sticky left-0 w-16 z-40" />
                                {activeDays.map((day) => (
                                    <div
                                        className={`border-(--mui-palette-divider) border-b border-l flex-1 py-2 text-center ${day === todayName
                                            ? 'text-(--mui-palette-primary-main) font-semibold'
                                            : 'text-(--mui-palette-text-secondary) font-medium'}`}
                                        key={day}
                                    >
                                        <span className="text-xs uppercase tracking-wide">{DAY_SHORT[day]}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex">
                                <div
                                    className="bg-(--mui-palette-background-paper) shrink-0 sticky left-0 w-16 z-20"
                                    style={{ height: `${gridHeight}px` }}
                                >
                                    {hours.map((hour) => (
                                        <div
                                            className="flex justify-end pr-2 pt-1"
                                            key={hour}
                                            style={{ height: `${HOUR_HEIGHT}px` }}
                                        >
                                            <span className="text-(--mui-palette-text-disabled) text-[11px] leading-none">
                                                {formatTimeLabel(hour * 60)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-1">
                                    {activeDays.map((day) => (
                                        <div
                                            className={`border-(--mui-palette-divider) border-l flex-1 relative ${day === todayName
                                                ? 'bg-(--mui-palette-action-hover)'
                                                : ''}`}
                                            key={day}
                                            style={{ height: `${gridHeight}px` }}
                                        >
                                            {hours.map((hour) => (
                                                <div
                                                    className="border-(--mui-palette-divider) border-b"
                                                    key={hour}
                                                    style={{ height: `${HOUR_HEIGHT}px` }}
                                                >
                                                    <div
                                                        className="border-(--mui-palette-divider) border-b border-dashed opacity-50"
                                                        style={{ height: `${HOUR_HEIGHT / 2}px` }}
                                                    />
                                                </div>
                                            ))}
                                            {day === todayName && isNowVisible && (
                                                <div
                                                    className="absolute bg-(--mui-palette-error-main) h-0.5 left-0 right-0 z-20"
                                                    style={{ top: `${nowOffset}px` }}
                                                >
                                                    <span className="-left-1 -top-1 absolute bg-(--mui-palette-error-main) rounded-full size-2" />
                                                </div>
                                            )}
                                            {buildDayLayout(day, visibleSections, startHour)
                                                .map((block) => {
                                                    const textColor = getContrastTextColor(block.section.color);

                                                    return (
                                                        <Tooltip
                                                            arrow
                                                            key={block.schedule.id}
                                                            placement="top"
                                                            title={renderBlockTooltip(block)}
                                                        >
                                                            <div
                                                                className="absolute cursor-pointer duration-150 flex flex-col gap-0.5 justify-start overflow-hidden px-2 py-1 rounded-md transition-transform hover:z-20 hover:scale-[1.02] z-10"
                                                                role="button"
                                                                style={{
                                                                    backgroundColor: block.section.color,
                                                                    borderLeft: `3px solid ${shadeColor(block.section.color, -0.3)}`,
                                                                    boxShadow: `0 1px 3px ${withAlpha(shadeColor(block.section.color, -0.5), 0.35)}`,
                                                                    color: textColor,
                                                                    height: `${block.height}px`,
                                                                    left: `calc(${block.left}% + 2px)`,
                                                                    outline: block.section.is_conflict_authorized
                                                                        ? '2px solid var(--mui-palette-warning-main)'
                                                                        : 'none',
                                                                    top: `${block.top}px`,
                                                                    width: `calc(${block.width}% - 4px)`
                                                                }}
                                                                tabIndex={0}
                                                                onClick={function() {
                                                                    handleOpenColorPicker(block.section);
                                                                }}
                                                            >
                                                                <div className="flex gap-1 items-center">
                                                                    {block.section.is_conflict_authorized && (
                                                                        <ShieldCheck
                                                                            className="shrink-0"
                                                                            size={12}
                                                                            weight="fill"
                                                                        />
                                                                    )}
                                                                    <span className="font-semibold text-xs truncate">
                                                                        {block.section.course_code}
                                                                    </span>
                                                                </div>
                                                                {block.height >= COMPACT_BLOCK_HEIGHT && (
                                                                    <span className="opacity-90 text-[11px] truncate">
                                                                        {block.schedule.room ?? block.section.section_code}
                                                                    </span>
                                                                )}
                                                                {block.height >= DETAILED_BLOCK_HEIGHT && (
                                                                    <span className="opacity-80 text-[11px] truncate">
                                                                        {formatRange(block.start, block.end)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </Tooltip>
                                                    );
                                                })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: colorTarget
                            ? `${colorTarget.course_code} · ${colorTarget.section_code}`
                            : '',
                        title: 'Customize Color'
                    }
                }}
                open={colorTarget !== null}
                onClose={function() {
                    setColorTarget(null);
                }}
            >
                <div className="flex flex-col gap-4 w-80">
                    <div
                        className="flex flex-col gap-0.5 px-3 py-2 rounded-md"
                        style={{
                            backgroundColor: selectedColor,
                            borderLeft: `3px solid ${shadeColor(selectedColor, -0.3)}`,
                            color: getContrastTextColor(selectedColor)
                        }}
                    >
                        <span className="font-semibold text-xs">
                            {colorTarget?.course_code}
                        </span>
                        <span className="opacity-90 text-[11px]">
                            Preview of how this subject appears on the grid
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="font-medium text-(--mui-palette-text-secondary) text-xs">
                            Suggested colors
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {SCHEDULE_COLOR_PALETTE.map((swatch) => (
                                <button
                                    className="flex items-center justify-center rounded-full size-8"
                                    key={swatch}
                                    style={{
                                        backgroundColor: swatch,
                                        color: getContrastTextColor(swatch),
                                        outline: swatch === selectedColor
                                            ? '2px solid var(--mui-palette-text-primary)'
                                            : 'none',
                                        outlineOffset: '2px'
                                    }}
                                    type="button"
                                    onClick={function() {
                                        handleSelectSwatch(swatch);
                                    }}
                                >
                                    {swatch === selectedColor && (
                                        <Check
                                            size={14}
                                            weight="bold"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ValidCommonInput
                        control={colorMethods.control}
                        fullWidth
                        label="Custom color"
                        name="color"
                        rules={{
                            required: 'Color is required.',
                            validate: (value: string) => isScheduleColorAllowed(value) || SCHEDULE_COLOR_RULE_MESSAGE
                        }}
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