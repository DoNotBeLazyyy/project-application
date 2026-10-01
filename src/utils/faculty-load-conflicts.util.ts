import { FacultyLoadSection, FacultyScheduleConflict } from '@type/faculty-load.type';

export function parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const trimmed = timeStr.trim();

    // Check for 12-hour format with AM/PM
    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
        let hours = parseInt(match12[1], 10);
        const minutes = parseInt(match12[2], 10);
        const meridiem = match12[3]?.toUpperCase();

        if (meridiem === 'PM' && hours < 12) {
            hours += 12;
        }
        else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }

        return hours * 60 + minutes;
    }

    // Default fallback 24-hour HH:MM
    const parts = trimmed.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

export function formatMinutesToTime(minutes: number): string {
    const h24 = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const meridiem = h24 >= 12
        ? 'PM'
        : 'AM';
    const h12 = h24 % 12 === 0
        ? 12
        : h24 % 12;
    const mStr = m.toString()
        .padStart(2, '0');
    return `${h12.toString()
        .padStart(2, '0')}:${mStr} ${meridiem}`;
}

/**
 * Evaluates schedule conflicts (faculty overlaps & room overlaps) among a set of sections
 */
export function evaluateSectionConflicts(
    sections: FacultyLoadSection[],
    facultyName?: string
): FacultyScheduleConflict[] {
    const conflicts: FacultyScheduleConflict[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < sections.length; i++) {
        const secA = sections[i];
        const schedsA = secA.schedules || [];

        for (let j = i + 1; j < sections.length; j++) {
            const secB = sections[j];
            const schedsB = secB.schedules || [];

            for (const schA of schedsA) {
                for (const schB of schedsB) {
                    if (schA.day_of_week !== schB.day_of_week) continue;

                    const startA = parseTimeToMinutes(schA.time_start);
                    const endA = parseTimeToMinutes(schA.time_end);
                    const startB = parseTimeToMinutes(schB.time_start);
                    const endB = parseTimeToMinutes(schB.time_end);

                    if (startA < endB && startB < endA) {
                        const overlapStartMin = Math.max(startA, startB);
                        const overlapEndMin = Math.min(endA, endB);

                        const conflictKey = `${secA.section_id}-${secB.section_id}-${schA.day_of_week}-${overlapStartMin}-${overlapEndMin}`;
                        if (!seen.has(conflictKey)) {
                            seen.add(conflictKey);

                            conflicts.push({
                                id: conflictKey,
                                conflict_type: 'Faculty',
                                faculty_name: facultyName || secA.faculty_name || 'Assigned Faculty',
                                subject_label: facultyName || secA.faculty_name || 'Faculty Overlap',
                                day_of_week: schA.day_of_week,
                                time_start: schA.time_start,
                                time_end: schA.time_end,
                                section_a_id: secA.section_id,
                                section_a: secA.section_code,
                                course_a: `${secA.course_code} - ${secA.course_title}`,
                                section_b_id: secB.section_id,
                                section_b: secB.section_code,
                                course_b: `${secB.course_code} - ${secB.course_title}`,
                                overlap_start: formatMinutesToTime(overlapStartMin),
                                overlap_end: formatMinutesToTime(overlapEndMin),
                                room: schA.room || secA.room || undefined
                            });
                        }
                    }
                }
            }
        }
    }

    return conflicts;
}