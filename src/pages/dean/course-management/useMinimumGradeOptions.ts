import { CommonSelectOption } from '@components/select/CommonSelect';
import { getTransmutationTable } from '@services/grading-config.service';
import { TransmutationRow } from '@type/grading-config.type';
import { useEffect, useState } from 'react';

// Highest institutional grade that still counts as a pass, so failing marks never
// become a prerequisite requirement.
const PASSING_GRADE_CEILING = 3;
const EMPTY_OPTION: CommonSelectOption = { label: '—', value: '' };
const FALLBACK_GRADES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];

/**
 * Normalises a stored or transmuted grade into the exact string used as the select
 * value. Without this, a grade saved as `1` and an option valued `1.00` never match
 * and the dropdown renders blank.
 *
 * @param value - Raw grade from the database or the form.
 * @returns
 */
export function normalizeMinimumGrade(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numeric = Number(value);

    return Number.isNaN(numeric)
        ? String(value)
        : numeric.toFixed(2);
}

/**
 * Builds the option label, pairing the institutional grade with the raw percentage
 * band it transmutes from - e.g. `1.00 (98-100%)`.
 *
 * @param row - One rung of the transmutation ladder.
 * @returns
 */
function buildLabel(row: TransmutationRow): string {
    const grade = normalizeMinimumGrade(row.transmuted_grade);
    const min = Number(row.min_percentage);
    const max = row.max_percentage === null || row.max_percentage === undefined
        ? null
        : Number(row.max_percentage);

    if (Number.isNaN(min)) {
        return grade;
    }

    if (max === null || Number.isNaN(max) || max === min) {
        return `${grade} (${min}%)`;
    }

    return `${grade} (${min}-${max}%)`;
}

/**
 * Grade choices for a course prerequisite, read from the admin transmutation ladder
 * so the percentages shown here always match how grades are actually computed.
 * Falls back to the plain grade ladder when the table cannot be read.
 */
export function useMinimumGradeOptions() {
    const [minimumGradeOptions, setMinimumGradeOptions] = useState<CommonSelectOption[]>([
        EMPTY_OPTION,
        ...FALLBACK_GRADES.map((grade) => ({
            label: normalizeMinimumGrade(grade),
            value: normalizeMinimumGrade(grade)
        }))
    ]);

    useEffect(function() {
        async function fetchTransmutationTable() {
            const result = await getTransmutationTable();
            const passingRows = (result.data ?? []).filter(
                (row) => Number(row.transmuted_grade) <= PASSING_GRADE_CEILING
            );

            if (passingRows.length > 0) {
                setMinimumGradeOptions([
                    EMPTY_OPTION,
                    ...passingRows.map((row) => ({
                        label: buildLabel(row),
                        value: normalizeMinimumGrade(row.transmuted_grade)
                    }))
                ]);
            }
        }

        fetchTransmutationTable();
    }, []);

    return { minimumGradeOptions };
}