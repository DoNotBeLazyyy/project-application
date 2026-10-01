import { CommonChip } from '@components/badge/CommonChip';
import { RegistrarLogRow } from '@type/registrar-verification.type';

interface RegistrarLogDetailContentProps {
    row: RegistrarLogRow;
}

function formatActionLabel(action: string): string {
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RegistrarLogDetailContent({ row }: RegistrarLogDetailContentProps) {
    const oldValues = (row.old_values || {}) as Record<string, unknown>;
    const newValues = (row.new_values || {}) as Record<string, unknown>;

    const allKeys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));
    const changedKeys = allKeys.filter(
        (key) => String(oldValues[key] || '') !== String(newValues[key] || '')
    );

    const actionColor = row.action.includes('APPROVED')
        ? 'success'
        : row.action.includes('REJECTED') || row.action.includes('FALSE_INFO')
            ? 'error'
            : row.action.includes('REQUESTED')
                ? 'warning'
                : 'primary';

    return (
        <div className="flex flex-col gap-4 p-4 pt-0 text-xs">
            {/* Header Meta */}
            <div className="border border-(--mui-palette-divider) bg-(--mui-palette-background-default) p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Action</span>
                    <CommonChip color={actionColor} label={formatActionLabel(row.action)} size="small" variant="light" />
                </div>
                <div>
                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Timestamp</span>
                    <span className="font-semibold text-(--mui-palette-text-primary)">
                        {new Date(row.created_at).toLocaleString('en-PH', {
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </span>
                </div>
                <div>
                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Target Student</span>
                    <span className="font-semibold text-(--mui-palette-text-primary)">
                        {row.student_name} ({row.student_number})
                    </span>
                </div>
                <div>
                    <span className="text-(--mui-palette-text-secondary) block text-[11px]">Performed By</span>
                    <span className="font-semibold text-(--mui-palette-text-primary)">
                        {row.performed_by_name}
                    </span>
                </div>
            </div>

            {/* Details */}
            <div className="border border-(--mui-palette-divider) p-3 rounded-lg">
                <span className="text-(--mui-palette-text-secondary) block text-[11px] font-semibold mb-1">Details & Remarks</span>
                <p className="m-0 text-(--mui-palette-text-primary) text-xs">
                    {row.details || 'No additional remarks.'}
                </p>
            </div>

            {/* Metadata if present */}
            {row.metadata && Object.keys(row.metadata).length > 0 && (
                <div className="border border-(--mui-palette-divider) p-3 rounded-lg bg-(--mui-palette-background-default)">
                    <span className="text-(--mui-palette-text-secondary) block text-[11px] font-semibold mb-1">Event Metadata</span>
                    <div className="space-y-1">
                        {Object.entries(row.metadata).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                                <span className="font-medium text-(--mui-palette-text-secondary) capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-(--mui-palette-text-primary)">{String(val)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Changes Diff Table */}
            {changedKeys.length > 0 && (
                <div className="border border-(--mui-palette-divider) rounded-lg overflow-hidden">
                    <div className="bg-(--mui-palette-background-default) px-3 py-2 font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider) text-[11px]">
                        Recorded Profile Field Changes
                    </div>
                    <div className="grid grid-cols-12 bg-(--mui-palette-action-hover) px-3 py-1.5 font-medium text-(--mui-palette-text-secondary) text-[11px]">
                        <div className="col-span-4">Field Name</div>
                        <div className="col-span-4">Before Value</div>
                        <div className="col-span-4">After / Approved Value</div>
                    </div>
                    <div className="divide-y divide-(--mui-palette-divider)">
                        {changedKeys.map((key) => {
                            const before = String(oldValues[key] || '—');
                            const after = String(newValues[key] || '—');
                            return (
                                <div key={key} className="grid grid-cols-12 px-3 py-2 items-center bg-(--mui-palette-warning-light)/10">
                                    <div className="col-span-4 font-medium text-(--mui-palette-text-primary) capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="col-span-4 text-(--mui-palette-text-secondary) break-words pr-2">
                                        {before}
                                    </div>
                                    <div className="col-span-4 font-semibold text-(--mui-palette-primary-main) break-words">
                                        {after}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
