import { GradeSheetRow } from '@type/faculty.type';

export interface GradeSheetCsvExportOptions {
    sectionCode?: string;
    courseCode?: string;
    courseTitle?: string;
    periodName?: string;
    gradeSheet: GradeSheetRow[];
}

export function escapeCsvField(val: string | number | null | undefined): string {
    if (val === null || val === undefined) {
        return '""';
    }
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
}

export function generateGradeSheetCsv({
    sectionCode,
    courseCode,
    courseTitle,
    periodName,
    gradeSheet
}: GradeSheetCsvExportOptions): string {
    const lines: string[] = [];

    if (courseCode || sectionCode) {
        lines.push(`${escapeCsvField('Course / Section')},${escapeCsvField(`${courseCode ?? ''} — ${sectionCode ?? ''}`)}`);
    }
    if (courseTitle) {
        lines.push(`${escapeCsvField('Course Title')},${escapeCsvField(courseTitle)}`);
    }
    if (periodName) {
        lines.push(`${escapeCsvField('Grading Period')},${escapeCsvField(periodName)}`);
    }
    lines.push(`${escapeCsvField('Export Date')},${escapeCsvField(new Date()
        .toLocaleDateString('en-PH'))}`);
    lines.push('');

    const headers = ['Student No.', 'Full Name', 'Raw Grade', 'Transmuted Grade', 'Special Grade', 'Status'];
    lines.push(headers.map(escapeCsvField)
        .join(','));

    for (const row of gradeSheet) {
        const rawGradeStr = row.raw_grade != null
            ? `${row.raw_grade}%`
            : '—';
        const transmutedStr = row.transmuted_grade != null
            ? String(row.transmuted_grade)
            : '—';
        const specialGradeStr = row.special_grade ?? '—';
        const statusStr = row.status ?? 'Draft';

        lines.push([
            escapeCsvField(row.student_number),
            escapeCsvField(row.full_name),
            escapeCsvField(rawGradeStr),
            escapeCsvField(transmutedStr),
            escapeCsvField(specialGradeStr),
            escapeCsvField(statusStr)
        ].join(','));
    }

    return lines.join('\r\n');
}