import CommonCard from '@components/card/CommonCard';
import { WarningIcon } from '@phosphor-icons/react';
import { listScheduleConflicts } from '@services/faculty-load.service';
import { ScheduleConflict, ScheduleConflictReport } from '@type/faculty-load.type';
import { useEffect, useState } from 'react';

interface ScheduleConflictsPanelProps {
    termId: string;
}

function ConflictRow({ conflict }: { conflict: ScheduleConflict }) {
    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 rounded-lg p-3">
            <div className="flex gap-2 items-center">
                <WarningIcon
                    className="text-(--mui-palette-error-main)"
                    size={16}
                />
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {conflict.subject_label}
                </span>
            </div>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {conflict.section_a} overlaps {conflict.section_b} on {conflict.day_of_week},{' '}
                {conflict.overlap_start} – {conflict.overlap_end}
            </span>
            {conflict.conflict_type === 'Room' && (
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Assigned faculty: {conflict.faculty_name}
                </span>
            )}
        </div>
    );
}

export default function ScheduleConflictsPanel({ termId }: ScheduleConflictsPanelProps) {
    const [report, setReport] = useState<ScheduleConflictReport | null>(null);

    useEffect(function() {
        async function loadConflicts() {
            const result = await listScheduleConflicts(termId || null);

            if (result.data) {
                setReport(result.data);
            }
        }

        loadConflicts();
    }, [termId]);

    const facultyConflicts = report?.faculty_conflicts ?? [];
    const roomConflicts = report?.room_conflicts ?? [];
    const hasConflicts = facultyConflicts.length > 0 || roomConflicts.length > 0;

    return (
        <CommonCard className="h-full">
            <div className="flex flex-col gap-6 h-full overflow-y-auto">
                <div className="flex flex-col gap-1">
                    <h2 className="font-medium text-(--mui-palette-text-primary) text-base">
                        Schedule Conflicts
                    </h2>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Overlapping meeting times detected across sections in the selected term.
                    </p>
                </div>

                {!hasConflicts && (
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        No schedule conflicts were found.
                    </span>
                )}

                {facultyConflicts.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Faculty double-booking ({facultyConflicts.length})
                        </h3>
                        <div className="flex flex-col gap-2">
                            {facultyConflicts.map(function(conflict, index) {
                                return (
                                    <ConflictRow
                                        conflict={conflict}
                                        key={`faculty-${index}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {roomConflicts.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Room double-booking ({roomConflicts.length})
                        </h3>
                        <div className="flex flex-col gap-2">
                            {roomConflicts.map(function(conflict, index) {
                                return (
                                    <ConflictRow
                                        conflict={conflict}
                                        key={`room-${index}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </CommonCard>
    );
}