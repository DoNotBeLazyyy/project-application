import CommonButton from '@components/button/CommonButton';
import { PrinterIcon } from '@phosphor-icons/react';
import { getStudentTranscript } from '@services/records.service';
import { StudentTranscript, TranscriptCourse } from '@type/records.type';
import { useEffect, useState } from 'react';

interface TranscriptViewProps {
    studentId?: string;
}

function formatNumber(value: number | null): string {
    return value !== null && value !== undefined
        ? String(Number(value))
        : '—';
}

function formatGrade(course: TranscriptCourse): string {
    if (course.special_grade) return course.special_grade;

    return course.grade !== null
        ? Number(course.grade)
            .toFixed(2)
        : '—';
}

function formatGwa(value: number | null): string {
    return value !== null && value !== undefined
        ? Number(value)
            .toFixed(2)
        : '—';
}

function formatDate(value: string): string {
    return new Date(value)
        .toLocaleDateString();
}

export default function TranscriptView({ studentId }: TranscriptViewProps) {
    const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchTranscript() {
            const result = await getStudentTranscript(studentId);
            if (result.data) setTranscript(result.data);
            setIsLoaded(true);
        }

        fetchTranscript();
    }, [studentId]);

    function handlePrint() {
        window.print();
    }

    if (!isLoaded) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Loading...
            </p>
        );
    }

    if (!transcript || !transcript.success) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {transcript?.message ?? 'Transcript is not available.'}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-start justify-between no-print">
                <div className="flex flex-col">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        {transcript.is_official
                            ? 'Official Transcript of Records'
                            : 'Grade Report'}
                    </h1>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        Released grades across all terms.
                    </span>
                </div>
                <CommonButton
                    size="small"
                    startIcon={<PrinterIcon size={16} />}
                    variant="outlined"
                    onClick={handlePrint}
                >
                    Print
                </CommonButton>
            </div>

            <div className="flex flex-col gap-4 print-area">
                <div className="border-b border-(--mui-palette-divider) flex flex-col gap-0.5 items-center pb-3 text-center">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-base uppercase">
                        {transcript.institution.name ?? 'Arellano University'}
                    </span>
                    {transcript.institution.address && (
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            {transcript.institution.address}
                        </span>
                    )}
                    <span className="font-medium mt-2 text-(--mui-palette-text-primary) text-sm uppercase">
                        {transcript.is_official
                            ? 'Transcript of Records'
                            : 'Unofficial Grade Report'}
                    </span>
                </div>

                <div className="gap-2 grid grid-cols-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                            Student
                        </span>
                        <span className="font-medium text-(--mui-palette-text-primary)">
                            {transcript.student.full_name}
                        </span>
                        <span className="text-(--mui-palette-text-secondary)">
                            {transcript.student.student_number}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                            Program
                        </span>
                        <span className="font-medium text-(--mui-palette-text-primary)">
                            {transcript.program?.name ?? '—'}
                        </span>
                        <span className="text-(--mui-palette-text-secondary)">
                            Generated {formatDate(transcript.generated_at)}
                        </span>
                    </div>
                </div>

                {transcript.terms.length === 0 && (
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No released grades on record yet.
                    </p>
                )}

                {transcript.terms.map(function(term) {
                    return (
                        <div
                            className="border border-(--mui-palette-divider) flex flex-col rounded-lg"
                            key={term.term_id}
                        >
                            <div className="bg-(--mui-palette-action-hover) flex items-center justify-between px-3 py-2 rounded-t-lg">
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {term.term_label}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    Term GWA {formatGwa(term.term_gwa)} · {formatNumber(term.earned_units)} units earned
                                </span>
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="min-w-[500px] text-sm w-full">
                                    <thead>
                                        <tr className="border-b border-(--mui-palette-divider) text-(--mui-palette-text-secondary) text-xs uppercase">
                                            <th className="font-medium px-3 py-2 text-left">Code</th>
                                            <th className="font-medium px-3 py-2 text-left">Course Title</th>
                                            <th className="font-medium px-3 py-2 text-right">Units</th>
                                            <th className="font-medium px-3 py-2 text-right">Grade</th>
                                            <th className="font-medium px-3 py-2 text-left">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {term.courses.map(function(course) {
                                            return (
                                                <tr
                                                    className="border-b border-(--mui-palette-divider) last:border-b-0"
                                                    key={course.enrollment_id}
                                                >
                                                    <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                                                        {course.course_code}
                                                    </td>
                                                    <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                                                        {course.course_title}
                                                    </td>
                                                    <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                                        {formatNumber(course.units)}
                                                    </td>
                                                    <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                                        {formatGrade(course)}
                                                    </td>
                                                    <td className="px-3 py-2 text-(--mui-palette-text-secondary)">
                                                        {course.is_passing === null
                                                            ? '—'
                                                            : course.is_passing
                                                                ? 'Passed'
                                                                : 'Failed'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}

                <div className="border border-(--mui-palette-divider) flex items-center justify-between p-3 rounded-lg">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Total Units Earned: {formatNumber(transcript.summary.total_units_earned)}
                    </span>
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Cumulative GWA: {formatGwa(transcript.summary.cumulative_gwa)}
                    </span>
                </div>

                {!transcript.is_official && (
                    <span className="italic text-(--mui-palette-text-secondary) text-xs">
                        This report is unofficial. Request an official transcript from the Registrar.
                    </span>
                )}
            </div>
        </div>
    );
}