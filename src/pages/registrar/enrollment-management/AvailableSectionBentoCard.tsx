import CommonButton from '@components/button/CommonButton';
import {
    CalendarBlankIcon,
    ChalkboardTeacherIcon,
    CheckIcon,
    MapPinIcon,
    PlusIcon,
    SparkleIcon,
    UsersThreeIcon,
    WarningCircleIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';
import { EligibleSectionRow } from '@type/enrollment.type';

export interface AvailableSectionBentoCardProps {
    section: EligibleSectionRow;
    isEnrolled: boolean;
    isStaged: boolean;
    onSelect: (section: EligibleSectionRow) => void;
    onUnstage: (sectionId: string) => void;
}

export default function AvailableSectionBentoCard({
    section,
    isEnrolled,
    isStaged,
    onSelect,
    onUnstage
}: AvailableSectionBentoCardProps) {
    const slotsRemaining = Math.max(0, section.max_slots - section.slots_taken);
    const isFull = section.is_full || slotsRemaining === 0;

    return (
        <div
            className={`border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all text-xs ${
                isEnrolled
                    ? 'bg-(--mui-palette-action-disabledBackground)/30 border-(--mui-palette-divider) opacity-65 cursor-default'
                    : isStaged
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-500/40 shadow-xs'
                        : isFull
                            ? 'bg-(--mui-palette-background-paper) border-(--mui-palette-divider) opacity-80 hover:border-amber-400 cursor-pointer'
                            : 'bg-(--mui-palette-background-paper) border-(--mui-palette-divider) hover:border-blue-500 hover:shadow-md cursor-pointer active:scale-[0.99]'
            }`}
            onClick={function() {
                if (isEnrolled) return;
                if (isStaged) {
                    onUnstage(section.section_id);
                } else {
                    onSelect(section);
                }
            }}
        >
            <div className="flex flex-col gap-1.5">
                {/* Header: Course Code, Recommended, Units */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-(--mui-palette-text-primary) text-sm tracking-tight">
                                {section.course_code}
                            </span>
                            <span className="bg-(--mui-palette-action-hover) text-(--mui-palette-text-primary) font-semibold px-1.5 py-0.2 rounded text-[11px]">
                                {section.section_code}
                            </span>
                            {section.is_recommended && (
                                <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-0.5">
                                    <SparkleIcon size={10} weight="fill" />
                                    <span>Prescribed</span>
                                </span>
                            )}
                        </div>
                        <span className="text-(--mui-palette-text-secondary) text-[11px] truncate mt-0.5" title={section.course_title}>
                            {section.course_title}
                        </span>
                    </div>

                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-(--mui-palette-action-hover) text-(--mui-palette-text-primary) shrink-0">
                        {Number(section.units).toFixed(1)} u
                    </span>
                </div>

                {/* Schedule, Room, Instructor */}
                <div className="flex flex-col gap-1 text-(--mui-palette-text-secondary) text-[11px] pt-1 border-t border-(--mui-palette-divider)/50">
                    <div className="flex items-center gap-1.5 truncate">
                        <CalendarBlankIcon size={13} className="shrink-0 text-(--mui-palette-primary-main)" />
                        <span className="truncate">{section.schedule_label || 'Schedule TBA'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                        <ChalkboardTeacherIcon size={13} className="shrink-0 text-(--mui-palette-info-main)" />
                        <span className="truncate">{section.faculty_name || 'Instructor TBA'}</span>
                    </div>
                    {section.room && (
                        <div className="flex items-center gap-1.5">
                            <MapPinIcon size={13} className="shrink-0 text-(--mui-palette-warning-main)" />
                            <span>Room: {section.room}</span>
                        </div>
                    )}
                </div>

                {/* Slots Counter */}
                <div className="flex items-center justify-between pt-1 border-t border-(--mui-palette-divider)/40 text-[11px]">
                    <div className="flex items-center gap-1">
                        <UsersThreeIcon size={13} className="text-(--mui-palette-text-secondary)" />
                        <span className="text-(--mui-palette-text-secondary)">Slots:</span>
                        <span className={isFull ? 'font-semibold text-(--mui-palette-error-main)' : 'font-medium text-(--mui-palette-text-primary)'}>
                            {section.slots_taken}/{section.max_slots}
                        </span>
                    </div>
                    {isFull ? (
                        <span className="bg-red-500/15 text-red-700 dark:text-red-400 font-semibold px-1.5 py-0.2 rounded text-[10px] uppercase">
                            Full
                        </span>
                    ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                            {slotsRemaining} open
                        </span>
                    )}
                </div>

                {/* Warnings: Schedule Overlap & Prerequisite Gap */}
                {(section.conflict_with || section.unmet_prerequisites) && (
                    <div className="flex flex-col gap-1 pt-1">
                        {section.conflict_with && (
                            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]">
                                <WarningIcon size={12} weight="fill" className="shrink-0 text-amber-500" />
                                <span className="truncate">Conflict: {section.conflict_with}</span>
                            </div>
                        )}
                        {section.unmet_prerequisites && (
                            <div className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]">
                                <WarningCircleIcon size={12} weight="fill" className="shrink-0 text-red-500" />
                                <span className="truncate">Prereq: {section.unmet_prerequisites}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action State / Button */}
            <div className="pt-1.5 border-t border-(--mui-palette-divider)/50 flex items-center justify-between flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {isEnrolled ? (
                    <div className="flex items-center gap-1 text-(--mui-palette-success-main) font-medium text-[11px]">
                        <CheckIcon size={14} weight="bold" />
                        <span>Already in schedule</span>
                    </div>
                ) : isStaged ? (
                    <>
                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-[11px] flex items-center gap-1">
                            <CheckIcon size={13} weight="bold" />
                            <span>Staged to add</span>
                        </span>
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<XIcon size={12} weight="bold" />}
                            variant="outlined"
                            onClick={() => onUnstage(section.section_id)}
                        >
                            Remove
                        </CommonButton>
                    </>
                ) : (
                    <>
                        <span className="text-[10px] text-(--mui-palette-text-disabled)">
                            {isFull ? 'Requires slot override' : 'Click card to stage'}
                        </span>
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon size={13} weight="bold" />}
                            variant="contained"
                            onClick={() => onSelect(section)}
                        >
                            Add Section
                        </CommonButton>
                    </>
                )}
            </div>
        </div>
    );
}
