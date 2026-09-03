import { AuditLogRow } from '@type/audit-log.type';

interface AuditLogDetailContentProps {
    row: AuditLogRow;
}

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
    return new Date(value)
        .toLocaleString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
}

function formatPeriodLabel(raw: string): string {
    if (!raw) return '';
    return raw
        .replace(/\bAY\s*(\d{2})-(\d{2})\b/i, (_, y1, y2) => `(A.Y. 20${y1} - 20${y2})`)
        .replace(/\bSem\b/i, 'Sem');
}

export default function AuditLogDetailContent({ row }: AuditLogDetailContentProps) {
    const periodLabel = row.grading_period_name
        ? formatPeriodLabel(row.grading_period_name)
        : '—';

    return (
        <div className="flex flex-col gap-4 text-slate-800">
            {/* Top Summary Grid */}
            <div className="gap-2.5 grid grid-cols-1 lg:grid-cols-4 sm:grid-cols-2">
                <div className="bg-slate-50/90 border border-slate-100 flex flex-col justify-between p-3 rounded-xl">
                    <span className="font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                        Action
                    </span>
                    <span className="font-bold mt-1 text-slate-800 text-sm">
                        {row.action}
                    </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-100 flex flex-col justify-between p-3 rounded-xl">
                    <span className="font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                        Changed By
                    </span>
                    <span className="font-bold mt-1 text-slate-800 text-sm">
                        {row.changed_by_name || 'System'}
                    </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-100 flex flex-col justify-between p-3 rounded-xl">
                    <span className="font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                        Table
                    </span>
                    <span className="font-bold mt-1 text-slate-800 text-sm">
                        {row.table_name
                            ? toTitleCase(row.table_name)
                            : '—'}
                    </span>
                </div>

                <div className="bg-slate-50/90 border border-slate-100 flex flex-col justify-between p-3 rounded-xl">
                    <span className="font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                        Field Changed
                    </span>
                    <span className="font-bold mt-1 text-slate-800 text-sm">
                        {row.field_changed
                            ? toTitleCase(row.field_changed)
                            : '—'}
                    </span>
                </div>
            </div>

            {/* Date & Time */}
            <div className="bg-slate-50/90 border border-slate-100 p-3 rounded-xl">
                <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                    Timestamp
                </span>
                <span className="block font-medium mt-1 text-slate-700 text-sm">
                    {row.changed_at
                        ? formatDate(row.changed_at)
                        : '—'}
                </span>
            </div>

            {/* Value Changes (Before vs After) */}
            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-700 text-xs tracking-wider uppercase">
                    Value Comparison
                </span>
                <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                    <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                        <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                            Old Value (Before)
                        </span>
                        <div className="font-mono mt-1 text-slate-700 text-sm">
                            {row.old_value != null && row.old_value !== ''
                                ? (
                                    <span className="break-all font-medium line-through text-slate-600">
                                        {row.old_value}
                                    </span>
                                )
                                : (
                                    <span className="font-normal italic text-slate-400">None (Initial entry)</span>
                                )}
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                        <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                            New Value (After)
                        </span>
                        <div className="font-mono mt-1 text-slate-800 text-sm">
                            {row.new_value != null && row.new_value !== ''
                                ? (
                                    <span className="break-all font-semibold text-slate-800">
                                        {row.new_value}
                                    </span>
                                )
                                : (
                                    <span className="font-normal italic text-slate-400">None (Deleted)</span>
                                )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Reason */}
            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-700 text-xs tracking-wider uppercase">
                    Change Justification / Reason
                </span>
                <div className="bg-slate-50/90 border border-slate-100 p-3.5 rounded-xl">
                    <p className="font-medium leading-relaxed text-slate-700 text-sm">
                        {row.change_reason || <span className="italic text-slate-400">No reason provided</span>}
                    </p>
                </div>
            </div>

            {/* Academic Context (Student, Section, Grading Period) */}
            <div className="flex flex-col gap-1.5">
                <span className="font-bold text-slate-700 text-xs tracking-wider uppercase">
                    Academic Context
                </span>
                <div className="gap-2.5 grid grid-cols-1 sm:grid-cols-3">
                    <div className="bg-slate-50/90 border border-slate-100 p-3 rounded-xl">
                        <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                            Student
                        </span>
                        <span className="block font-medium mt-1 text-slate-800 text-sm truncate">
                            {row.student_name || <span className="italic text-slate-400">N/A</span>}
                        </span>
                    </div>

                    <div className="bg-slate-50/90 border border-slate-100 p-3 rounded-xl">
                        <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                            Section
                        </span>
                        <span className="block font-medium mt-1 text-slate-800 text-sm truncate">
                            {row.section_code || <span className="italic text-slate-400">N/A</span>}
                        </span>
                    </div>

                    <div className="bg-slate-50/90 border border-slate-100 p-3 rounded-xl">
                        <span className="block font-semibold text-[11px] text-slate-400 tracking-wider uppercase">
                            Grading Period
                        </span>
                        <span className="block font-medium mt-1 text-slate-800 text-sm truncate">
                            {periodLabel || <span className="italic text-slate-400">N/A</span>}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}