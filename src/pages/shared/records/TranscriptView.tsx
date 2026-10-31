import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import {
    CalendarDotsIcon,
    CertificateIcon,
    GraduationCapIcon,
    PrinterIcon,
    StudentIcon
} from '@phosphor-icons/react';
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
        .toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                Loading grade report…
            </div>
        );
    }

    if (!transcript || !transcript.success) {
        return (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {transcript?.message ?? 'Transcript is not available.'}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Action Bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between no-print pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-xl tracking-tight">
                            {transcript.is_official
                                ? 'Official Transcript of Records'
                                : 'Grade Report'}
                        </h1>
                        <CommonBadgeStatus
                            label={transcript.is_official
                                ? 'Official'
                                : 'Unofficial'}
                            variant={transcript.is_official
                                ? 'success'
                                : 'info'}
                        />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                        Released official grades across all enrolled terms.
                    </span>
                </div>
                <CommonButton
                    size="small"
                    startIcon={<PrinterIcon size={16} />}
                    variant="outlined"
                    onClick={handlePrint}
                >
                    Print Report
                </CommonButton>
            </div>

            <div className="flex flex-col gap-5 print-area">
                {/* Academic Header Banner */}
                <div className="bg-slate-50/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col items-center p-5 rounded-2xl text-center shadow-2xs gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mb-1">
                        <CertificateIcon
                            size={26}
                            weight="bold"
                        />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg uppercase tracking-wide">
                        {transcript.institution.name ?? 'Arellano University'}
                    </span>
                    {transcript.institution.address && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {transcript.institution.address}
                        </span>
                    )}
                    <span className="font-semibold text-xs tracking-wider uppercase text-blue-700 dark:text-blue-400 mt-1 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60">
                        {transcript.is_official
                            ? 'Official Transcript of Records'
                            : 'Student Grade Report'}
                    </span>
                </div>

                {/* Student & Program Metadata Grid */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl shadow-2xs">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 shrink-0">
                            <StudentIcon size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                Student Details
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                {transcript.student.full_name}
                            </span>
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                Student ID: {transcript.student.student_number}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 shrink-0">
                            <GraduationCapIcon size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                                Program Degree
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                                {transcript.program?.name ?? '—'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Generated: {formatDate(transcript.generated_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {transcript.terms.length === 0 && (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm italic">
                        No released grades on record yet.
                    </div>
                )}

                {/* Term Grade Breakdown Cards */}
                <div className="flex flex-col gap-4">
                    {transcript.terms.map(function(term) {
                        return (
                            <div
                                className="border border-slate-200/90 dark:border-zinc-800 flex flex-col rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs"
                                key={term.term_id}
                            >
                                <div className="bg-slate-50 dark:bg-zinc-800/60 flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <CalendarDotsIcon
                                            className="text-blue-600 dark:text-blue-400"
                                            size={16}
                                        />
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                            {term.term_label}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="font-medium px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                            Term GWA: {formatGwa(term.term_gwa)}
                                        </span>
                                        <span className="font-medium px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                                            {formatNumber(term.earned_units)} Units Earned
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto w-full">
                                    <table className="min-w-[500px] text-sm w-full">
                                        <thead>
                                            <tr className="border-b border-slate-200/70 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs uppercase bg-slate-50/40 dark:bg-zinc-900/40">
                                                <th className="font-semibold px-4 py-2.5 text-left">Code</th>
                                                <th className="font-semibold px-4 py-2.5 text-left">Course Title</th>
                                                <th className="font-semibold px-4 py-2.5 text-right">Units</th>
                                                <th className="font-semibold px-4 py-2.5 text-right">Grade</th>
                                                <th className="font-semibold px-4 py-2.5 text-left">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {term.courses.map(function(course) {
                                                const isPassed = course.is_passing === true;

                                                return (
                                                    <tr
                                                        className="border-b border-slate-100 dark:border-zinc-800/60 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                                        key={course.enrollment_id}
                                                    >
                                                        <td className="font-mono font-medium px-4 py-3 text-blue-700 dark:text-blue-400 text-xs sm:text-sm whitespace-nowrap">
                                                            {course.course_code}
                                                        </td>
                                                        <td className="font-medium px-4 py-3 text-slate-900 dark:text-slate-100">
                                                            {course.course_title}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right text-xs sm:text-sm">
                                                            {formatNumber(course.units)}
                                                        </td>
                                                        <td className="font-mono font-bold px-4 py-3 text-slate-900 dark:text-slate-100 text-right text-xs sm:text-sm">
                                                            {formatGrade(course)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {course.is_passing !== null
                                                                ? (
                                                                    <CommonBadgeStatus
                                                                        label={isPassed
                                                                            ? 'Passed'
                                                                            : 'Failed'}
                                                                        variant={isPassed
                                                                            ? 'success'
                                                                            : 'error'}
                                                                    />
                                                                )
                                                                : (
                                                                    <span className="text-slate-400">—</span>
                                                                )}
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
                </div>

                {/* Cumulative Totals Footer Card */}
                <div className="bg-slate-50/90 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between p-4 rounded-xl shadow-2xs gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Total Units Earned:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {formatNumber(transcript.summary.total_units_earned)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Cumulative Institutional GWA:</span>
                        <span className="font-bold text-purple-700 dark:text-purple-400 text-base">
                            {formatGwa(transcript.summary.cumulative_gwa)}
                        </span>
                    </div>
                </div>

                {!transcript.is_official && (
                    <span className="italic text-slate-400 dark:text-zinc-500 text-xs text-center">
                        This digital record is for academic advising purposes. Request an official stamped transcript from the Office of the Registrar.
                    </span>
                )}
            </div>
        </div>
    );
}