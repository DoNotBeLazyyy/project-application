import { EyeIcon } from '@phosphor-icons/react';
import { AuditLogRow } from '@type/audit-log.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface UseAuditLogTableConfigOptions {
    onViewPayload?: (row: AuditLogRow) => void;
}

export function useAuditLogTableConfig(options?: UseAuditLogTableConfigOptions) {
    const { onViewPayload } = options || {};

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'changed_at',
                flex: 1.8,
                headerName: 'Timestamp',
                minWidth: 175,
                sortable: true,
                valueFormatter: (params) =>
                    params.value
                        ? new Date(params.value as string).toLocaleString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })
                        : ''
            },
            {
                field: 'action',
                flex: 1.2,
                headerName: 'Action Type',
                minWidth: 120,
                sortable: true,
                cellRenderer: (params: { data: AuditLogRow }) => {
                    const action = (params.data?.action || '').toUpperCase();
                    const badgeClass = action === 'INSERT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : action === 'DELETE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';

                    return (
                        <div className="flex h-full items-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider ${badgeClass}`}>
                                {action || 'MUTATION'}
                            </span>
                        </div>
                    );
                }
            },
            {
                field: 'event_name',
                flex: 2.2,
                headerName: 'Transaction Event',
                minWidth: 200,
                mobileCard: 'title',
                sortable: true,
                tooltipField: 'event_name',
                cellRenderer: (params: { data: AuditLogRow }) => (
                    <div className="flex h-full items-center">
                        <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                            {params.data?.event_name || 'SYSTEM_TRANSACTION'}
                        </span>
                    </div>
                )
            },
            {
                field: 'table_name',
                flex: 1.5,
                headerName: 'Entity / Table',
                minWidth: 140,
                sortable: true,
                tooltipField: 'table_name',
                valueFormatter: (params) =>
                    params.value
                        ? toTitleCase(String(params.value))
                        : ''
            },
            {
                field: 'description',
                flex: 2.5,
                headerName: 'Summary / Record',
                minWidth: 220,
                mobileCard: 'hidden',
                tooltipField: 'description',
                cellRenderer: (params: { data: AuditLogRow }) => (
                    <div className="flex h-full items-center truncate">
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate" title={params.data?.description}>
                            {params.data?.description || 'System mutation record'}
                        </span>
                    </div>
                )
            },
            {
                field: 'changed_by_name',
                flex: 1.8,
                headerName: 'Operator',
                minWidth: 160,
                mobileCard: 'subtitle',
                sortable: true,
                tooltipField: 'changed_by_name',
                cellRenderer: (params: { data: AuditLogRow }) => (
                    <div className="flex h-full items-center truncate">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {params.data?.changed_by_name || 'System'}
                        </span>
                    </div>
                )
            },
            {
                field: 'id',
                flex: 1.4,
                headerName: 'Payload Inspector',
                minWidth: 140,
                sortable: false,
                cellRenderer: (params: { data: AuditLogRow }) => (
                    <div className="flex h-full items-center">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewPayload?.(params.data);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 transition-colors cursor-pointer shadow-2xs"
                        >
                            <EyeIcon size={14} />
                            View Payload
                        </button>
                    </div>
                )
            }
        ];
    }, [onViewPayload]);

    return { columnDefs, hideMenuIcon: true };
}