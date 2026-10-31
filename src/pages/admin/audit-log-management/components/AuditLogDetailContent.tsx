import { CheckIcon, CopyIcon, EyeIcon } from '@phosphor-icons/react';
import { AuditLogRow } from '@type/audit-log.type';
import { useMemo, useState } from 'react';

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
            second: '2-digit',
            hour12: true
        });
}

function formatJsonValue(val: unknown): string {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

export default function AuditLogDetailContent({ row }: AuditLogDetailContentProps) {
    const [viewMode, setViewMode] = useState<'diff' | 'json'>('diff');
    const [copiedBefore, setCopiedBefore] = useState(false);
    const [copiedAfter, setCopiedAfter] = useState(false);

    const oldData = row.old_data || (row.old_value !== undefined && row.field_changed
        ? { [row.field_changed]: row.old_value }
        : null);
    const newData = row.new_data || (row.new_value !== undefined && row.field_changed
        ? { [row.field_changed]: row.new_value }
        : null);

    // Compute field-by-field diff
    const diffEntries = useMemo(() => {
        const allKeys = new Set<string>();
        if (oldData && typeof oldData === 'object') {
            Object.keys(oldData)
                .forEach((k) => allKeys.add(k));
        }
        if (newData && typeof newData === 'object') {
            Object.keys(newData)
                .forEach((k) => allKeys.add(k));
        }

        const entries: {
            field: string;
            oldVal: unknown;
            newVal: unknown;
            isChanged: boolean;
            isAdded: boolean;
            isRemoved: boolean;
        }[] = [];

        Array.from(allKeys)
            .sort()
            .forEach((key) => {
                const hasOld = oldData && Object.prototype.hasOwnProperty.call(oldData, key);
                const hasNew = newData && Object.prototype.hasOwnProperty.call(newData, key);
                const oldVal = hasOld
                    ? oldData[key]
                    : undefined;
                const newVal = hasNew
                    ? newData[key]
                    : undefined;

                const isAdded = Boolean(!hasOld && hasNew);
                const isRemoved = Boolean(hasOld && !hasNew);
                const isChanged = Boolean(hasOld && hasNew && JSON.stringify(oldVal) !== JSON.stringify(newVal));

                if (isAdded || isRemoved || isChanged || row.action === 'INSERT') {
                    entries.push({
                        field: key,
                        oldVal,
                        newVal,
                        isChanged,
                        isAdded,
                        isRemoved
                    });
                }
            });

        return entries;
    }, [oldData, newData, row.action]);

    function handleCopyBefore() {
        if (!oldData) return;
        navigator.clipboard.writeText(JSON.stringify(oldData, null, 2));
        setCopiedBefore(true);
        setTimeout(() => setCopiedBefore(false), 2000);
    }

    function handleCopyAfter() {
        if (!newData) return;
        navigator.clipboard.writeText(JSON.stringify(newData, null, 2));
        setCopiedAfter(true);
        setTimeout(() => setCopiedAfter(false), 2000);
    }

    const actionBadgeClass = row.action === 'INSERT'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
        : row.action === 'DELETE'
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
            : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';

    return (
        <div className="flex flex-col gap-4 text-slate-800 dark:text-slate-200">
            {/* Transaction Header Banner */}
            <div className="bg-slate-50/90 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider ${actionBadgeClass}`}>
                            {row.action}
                        </span>
                        <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100 bg-slate-200/80 dark:bg-zinc-700 px-2.5 py-0.5 rounded border border-slate-300 dark:border-zinc-600">
                            {row.event_name || 'SYSTEM_TRANSACTION'}
                        </span>
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {row.changed_at
                            ? formatDate(row.changed_at)
                            : '—'}
                    </div>
                </div>

                {row.description && (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {row.description}
                    </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700/60 text-xs">
                    <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold text-[10px]">
                            Entity / Table
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {row.table_name
                                ? toTitleCase(row.table_name)
                                : '—'}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold text-[10px]">
                            Operator / Performed By
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                            {row.changed_by_name || 'System'}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold text-[10px]">
                            Target Record ID
                        </span>
                        <span
                            className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block truncate"
                            title={row.record_id || undefined}
                        >
                            {row.record_id
                                ? `${row.record_id.slice(0, 8)}...`
                                : '—'}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold text-[10px]">
                            Fields Mutated
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                            {row.action === 'INSERT'
                                ? `${diffEntries.length} field(s) inserted`
                                : row.action === 'DELETE'
                                    ? 'Record deleted'
                                    : `${diffEntries.length} field(s) changed`}
                        </span>
                    </div>
                </div>
            </div>

            {/* View Mode Switcher (Visual Diff vs Raw JSON) */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 pb-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            viewMode === 'diff'
                                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => setViewMode('diff')}
                    >
                        State Diff (Before / After)
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            viewMode === 'json'
                                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => setViewMode('json')}
                    >
                        Raw JSON Payload
                    </button>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Forensic Immutable Record
                </div>
            </div>

            {/* TAB 1: Visual State Diff */}
            {viewMode === 'diff' && (
                <div className="flex flex-col gap-3">
                    {diffEntries.length === 0
                        ? (
                            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 p-6 rounded-xl text-center text-sm text-slate-500">
                            No field modifications detected in this record.
                            </div>
                        )
                        : (
                            <div className="border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-2xs">
                                <div className="overflow-x-auto max-h-[380px]">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-100/80 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200 dark:border-zinc-700">
                                            <tr>
                                                <th className="py-2.5 px-3 w-1/3">Field Name</th>
                                                <th className="py-2.5 px-3 w-1/3">State Before (OLD)</th>
                                                <th className="py-2.5 px-3 w-1/3">State After (NEW)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-mono">
                                            {diffEntries.map((entry) => {
                                                const isInserted = row.action === 'INSERT' || entry.isAdded;
                                                const isDeleted = row.action === 'DELETE' || entry.isRemoved;

                                                return (
                                                    <tr
                                                        className={`hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                                                            entry.isChanged
                                                                ? 'bg-amber-50/30 dark:bg-amber-950/20'
                                                                : ''
                                                        }`}
                                                        key={entry.field}
                                                    >
                                                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 break-all">
                                                            {entry.field}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 break-all">
                                                            {isInserted
                                                                ? (
                                                                    <span className="italic font-sans text-slate-400 text-[11px]">
                                                                (None — initial creation)
                                                                    </span>
                                                                )
                                                                : (
                                                                    <span
                                                                        className={entry.isChanged || isDeleted
                                                                            ? 'line-through text-rose-600 dark:text-rose-400 font-medium'
                                                                            : ''}
                                                                    >
                                                                        {formatJsonValue(entry.oldVal)}
                                                                    </span>
                                                                )}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200 break-all">
                                                            {isDeleted
                                                                ? (
                                                                    <span className="italic font-sans text-slate-400 text-[11px]">
                                                                (None — record deleted)
                                                                    </span>
                                                                )
                                                                : (
                                                                    <span
                                                                        className={isInserted || entry.isChanged
                                                                            ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                                                            : ''}
                                                                    >
                                                                        {formatJsonValue(entry.newVal)}
                                                                    </span>
                                                                )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                </div>
            )}

            {/* TAB 2: Raw JSON Payloads */}
            {viewMode === 'json' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Before State Payload */}
                    <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 bg-slate-50/70 dark:bg-zinc-900/60">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-700/60">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Payload Before (OLD)
                            </span>
                            {oldData && (
                                <button
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                                    type="button"
                                    onClick={handleCopyBefore}
                                >
                                    {copiedBefore
                                        ? (
                                            <CheckIcon
                                                className="text-emerald-600"
                                                size={13}
                                            />
                                        )
                                        : <CopyIcon size={13} />}
                                    {copiedBefore
                                        ? 'Copied'
                                        : 'Copy JSON'}
                                </button>
                            )}
                        </div>
                        <div className="overflow-auto max-h-[300px]">
                            {oldData
                                ? (
                                    <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {JSON.stringify(oldData, null, 2)}
                                    </pre>
                                )
                                : (
                                    <div className="py-8 text-center italic text-xs text-slate-400">
                                    None (Initial creation — no previous state)
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* After State Payload */}
                    <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 bg-slate-50/70 dark:bg-zinc-900/60">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-zinc-700/60">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Payload After (NEW)
                            </span>
                            {newData && (
                                <button
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                                    type="button"
                                    onClick={handleCopyAfter}
                                >
                                    {copiedAfter
                                        ? (
                                            <CheckIcon
                                                className="text-emerald-600"
                                                size={13}
                                            />
                                        )
                                        : <CopyIcon size={13} />}
                                    {copiedAfter
                                        ? 'Copied'
                                        : 'Copy JSON'}
                                </button>
                            )}
                        </div>
                        <div className="overflow-auto max-h-[300px]">
                            {newData
                                ? (
                                    <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {JSON.stringify(newData, null, 2)}
                                    </pre>
                                )
                                : (
                                    <div className="py-8 text-center italic text-xs text-slate-400">
                                    None (Record was deleted — no resulting state)
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}