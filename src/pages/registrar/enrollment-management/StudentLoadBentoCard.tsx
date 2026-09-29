import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import {
    ArrowUUpLeftIcon,
    CalendarBlankIcon,
    ChalkboardTeacherIcon,
    MapPinIcon,
    TrashSimpleIcon,
    WarningCircleIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';

export interface StudentLoadCardItem {
    id: string;
    section_id: string;
    course_code: string;
    course_title: string;
    section_code: string;
    units: number;
    schedule_label: string;
    faculty_name: string;
    room?: string | null;
    status?: string;
    conflict_with?: string | null;
    unmet_prerequisites?: string | null;
}

export type StudentLoadCardState = 'enrolled' | 'new' | 'dropped';

export interface StudentLoadBentoCardProps {
    item: StudentLoadCardItem;
    state: StudentLoadCardState;
    onDrop?: () => void;
    onUndoDrop?: () => void;
    onRemoveNew?: () => void;
}

export default function StudentLoadBentoCard({
    item,
    state,
    onDrop,
    onUndoDrop,
    onRemoveNew
}: StudentLoadBentoCardProps) {
    const isNew = state === 'new';
    const isDropped = state === 'dropped';
    const isNormalEnrolled = state === 'enrolled';

    return (
        <div
            className={`border rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all relative overflow-hidden ${
                isNew
                    ? 'bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/70 ring-1 ring-blue-500/40'
                    : isDropped
                        ? 'bg-red-500/5 dark:bg-red-950/20 border-red-500/70 ring-1 ring-red-500/40'
                        : 'bg-(--mui-palette-background-paper) border-(--mui-palette-divider) hover:border-(--mui-palette-text-secondary)/40'
            }`}
        >
            {/* Color accent left indicator bar */}
            <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isNew
                        ? 'bg-blue-500'
                        : isDropped
                            ? 'bg-red-500'
                            : 'bg-(--mui-palette-divider)'
                }`}
            />

            <div className="flex flex-col gap-2 pl-1.5">
                {/* Header: Course Code, Status Badge, Units */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-(--mui-palette-text-primary) text-base tracking-tight">
                                {item.course_code}
                            </span>
                            <span className="bg-(--mui-palette-action-hover) text-(--mui-palette-text-primary) font-semibold px-2 py-0.5 rounded text-xs">
                                {item.section_code}
                            </span>
                        </div>
                        <span
                            className={`text-xs mt-0.5 truncate ${
                                isDropped
                                    ? 'line-through text-(--mui-palette-text-secondary) opacity-70'
                                    : 'text-(--mui-palette-text-secondary)'
                            }`}
                            title={item.course_title}
                        >
                            {item.course_title}
                        </span>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                            className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isNew
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                    : isDropped
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                                        : 'bg-(--mui-palette-action-hover) text-(--mui-palette-text-secondary)'
                            }`}
                        >
                            {isNew ? `+${Number(item.units).toFixed(1)} u` : isDropped ? `-${Number(item.units).toFixed(1)} u` : `${Number(item.units).toFixed(1)} u`}
                        </span>

                        {isNew ? (
                            <span className="bg-blue-600 text-white font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                New (Staged)
                            </span>
                        ) : isDropped ? (
                            <span className="bg-red-600 text-white font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                Marked for Drop
                            </span>
                        ) : (
                            <CommonBadgeStatus
                                label={item.status || 'Enrolled'}
                                variant={item.status === 'Enrolled' || !item.status ? 'success' : 'info'}
                            />
                        )}
                    </div>
                </div>

                {/* Details: Schedule, Faculty, Room */}
                <div className="flex flex-col gap-1 text-xs text-(--mui-palette-text-secondary) pt-1 border-t border-(--mui-palette-divider)/60">
                    <div className="flex items-center gap-1.5 truncate">
                        <CalendarBlankIcon size={14} className="shrink-0 text-(--mui-palette-primary-main)" />
                        <span className="truncate">{item.schedule_label || 'Schedule TBA'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                        <ChalkboardTeacherIcon size={14} className="shrink-0 text-(--mui-palette-info-main)" />
                        <span className="truncate">{item.faculty_name || 'Instructor TBA'}</span>
                    </div>
                    {item.room && (
                        <div className="flex items-center gap-1.5">
                            <MapPinIcon size={14} className="shrink-0 text-(--mui-palette-warning-main)" />
                            <span>Room: {item.room}</span>
                        </div>
                    )}
                </div>

                {/* Warnings if New */}
                {isNew && (
                    <div className="flex flex-col gap-1 pt-1">
                        {item.conflict_with && (
                            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 px-2 py-1 rounded text-[11px]">
                                <WarningIcon size={14} weight="fill" className="shrink-0 text-amber-500" />
                                <span className="truncate">Schedule overlap with {item.conflict_with}</span>
                            </div>
                        )}
                        {item.unmet_prerequisites && (
                            <div className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30 flex items-center gap-1.5 px-2 py-1 rounded text-[11px]">
                                <WarningCircleIcon size={14} weight="fill" className="shrink-0 text-red-500" />
                                <span className="truncate">Prerequisite: {item.unmet_prerequisites}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between pt-2 border-t border-(--mui-palette-divider)/60 pl-1.5 flex-wrap gap-2">
                <span className="text-[11px] text-(--mui-palette-text-disabled)">
                    {isNew
                        ? 'Will be enrolled upon saving'
                        : isDropped
                            ? 'Will be removed upon saving'
                            : 'Currently enrolled'}
                </span>

                {isNew && (
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<XIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={onRemoveNew}
                    >
                        Remove
                    </CommonButton>
                )}

                {isDropped && (
                    <CommonButton
                        color="success"
                        size="small"
                        startIcon={<ArrowUUpLeftIcon size={14} weight="bold" />}
                        variant="contained"
                        onClick={onUndoDrop}
                    >
                        Undo Drop
                    </CommonButton>
                )}

                {isNormalEnrolled && (
                    <CommonButton
                        color="error"
                        size="small"
                        startIcon={<TrashSimpleIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={onDrop}
                    >
                        Drop
                    </CommonButton>
                )}
            </div>
        </div>
    );
}
