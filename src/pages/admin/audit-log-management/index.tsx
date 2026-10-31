import CommonBentoCard from '@components/card/CommonBentoCard';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AuditLogDetailContent from '@pages/admin/audit-log-management/components/AuditLogDetailContent';
import { FILTER_FORM_ID, SORT_COLUMNS } from '@pages/admin/audit-log-management/constants/audit-log.constant';
import FilterAuditLogForm from '@pages/admin/audit-log-management/forms/FilterAuditLogForm';
import { useAuditLogTableConfig } from '@pages/admin/audit-log-management/hooks/useAuditLogTableConfig';
import { getAuditLogFilters, listAuditLogs } from '@services/audit-log.service';
import { AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const EMPTY_FILTERS: AuditLogFilterValues = {
    action: 'All',
    table_name: 'All',
    event_name: 'All',
    changed_by: 'All',
    date_from: '',
    date_to: ''
};

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
    return new Date(value)
        .toLocaleString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
}

export default function AuditLogManagement() {
    const [activeFilters, setActiveFilters] = useState<AuditLogFilterValues | null>(null);
    const [quickAction, setQuickAction] = useState<string>('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tableOptions, setTableOptions] = useState<CommonSelectOption[]>([]);
    const [eventOptions, setEventOptions] = useState<CommonSelectOption[]>([]);
    const [operatorOptions, setOperatorOptions] = useState<CommonSelectOption[]>([]);
    const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const rowsMapRef = useRef<Map<string, AuditLogRow>>(new Map());

    const filterMethods = useForm<AuditLogFilterValues>({ defaultValues: EMPTY_FILTERS });

    function handleOpenView(logOrId: AuditLogRow | string) {
        if (typeof logOrId === 'string') {
            const found = rowsMapRef.current.get(logOrId);
            if (found) {
                setSelectedLog(found);
                setIsViewOpen(true);
            }
        }
        else {
            setSelectedLog(logOrId);
            setIsViewOpen(true);
        }
    }

    const { columnDefs } = useAuditLogTableConfig({
        onViewPayload: handleOpenView
    });

    useEffect(function() {
        async function loadFilters() {
            const result = await getAuditLogFilters();
            if (result.data) {
                if (result.data.tables) setTableOptions(result.data.tables);
                if (result.data.events) setEventOptions(result.data.events);
                if (result.data.operators) setOperatorOptions(result.data.operators);
            }
        }

        loadFilters();
    }, []);

    async function fetchAuditLogs(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        // Merge active filters with quick action chip if set
        const effectiveFilters: AuditLogFilterValues = {
            ...(activeFilters || EMPTY_FILTERS),
            action: quickAction !== 'All'
                ? quickAction
                : (activeFilters?.action || 'All')
        };

        const result = await listAuditLogs(page, size, search, sort, effectiveFilters);
        if (result.data?.content) {
            result.data.content.forEach(function(item: AuditLogRow) {
                rowsMapRef.current.set(item.id, item);
            });
        }
        return result;
    }

    function handleFilterSubmit(values: AuditLogFilterValues) {
        setActiveFilters(values);
        if (values.action && values.action !== 'All') {
            setQuickAction(values.action);
        }
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset(EMPTY_FILTERS);
        setActiveFilters(null);
        setQuickAction('All');
    }

    function handleQuickActionChange(action: string) {
        setQuickAction(action);
        setActiveFilters((prev) => ({
            ...(prev || EMPTY_FILTERS),
            action
        }));
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedLog(null);
    }

    function renderAuditBentoCard(item: AuditLogRow) {
        const metrics = [
            {
                label: 'Action',
                value: item.action
            },
            {
                label: 'Operator',
                value: item.changed_by_name || 'System'
            },
            {
                label: 'Date',
                value: item.changed_at
                    ? formatDate(item.changed_at)
                    : '—'
            },
            {
                label: 'Entity',
                value: item.table_name
                    ? toTitleCase(item.table_name)
                    : '—'
            }
        ];

        return (
            <CommonBentoCard
                actionMenu={<span />}
                code={undefined}
                hasCheckbox={false}
                metrics={metrics}
                status={undefined}
                subtitle={`${toTitleCase(item.table_name || 'Entity')} • ${item.changed_by_name || 'System'}`}
                title={item.event_name || 'Transaction'}
                onClick={function() {
                    handleOpenView(item);
                }}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Quick Action Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                    Action Type:
                </span>
                {[
                    { label: 'All Actions', value: 'All' },
                    { label: 'INSERT (Create)', value: 'INSERT' },
                    { label: 'UPDATE (Modify)', value: 'UPDATE' },
                    { label: 'DELETE (Remove)', value: 'DELETE' }
                ].map((pill) => {
                    const isSelected = quickAction === pill.value;
                    return (
                        <button
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-750'
                            }`}
                            key={pill.value}
                            type="button"
                            onClick={() => handleQuickActionChange(pill.value)}
                        >
                            {pill.label}
                        </button>
                    );
                })}
            </div>

            <CommonTableCard<AuditLogRow>
                cardHeaderProps={{
                    subheader: 'Immutable forensic audit trail tracking all system mutations, user provisioning, and transactional state diffs.',
                    title: 'Forensic Audit Logs'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.auditLogs
                    }
                }}
                dependencies={[activeFilters, quickAction]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter system transactions by action type, entity, transaction event, operator, or date range.',
                            title: 'Forensic Audit Filters'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <FilterAuditLogForm
                            actionOptions={[
                                { label: 'All Actions', value: 'All' },
                                { label: 'INSERT (Create)', value: 'INSERT' },
                                { label: 'UPDATE (Modify)', value: 'UPDATE' },
                                { label: 'DELETE (Remove)', value: 'DELETE' }
                            ]}
                            control={filterMethods.control}
                            eventOptions={eventOptions}
                            id={FILTER_FORM_ID}
                            operatorOptions={operatorOptions}
                            tableOptions={tableOptions}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    formId: FILTER_FORM_ID,
                    open: isFilterOpen,
                    onClose: function() {
                        filterMethods.reset(activeFilters || EMPTY_FILTERS);
                        setIsFilterOpen(false);
                    },
                    onReset: handleFilterReset
                }}
                renderGridCard={function(item) {
                    return renderAuditBentoCard(item);
                }}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                viewModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: selectedLog
                                ? `${selectedLog.event_name} • ${selectedLog.action} on ${toTitleCase(selectedLog.table_name || '')} by ${selectedLog.changed_by_name || 'System'}`
                                : 'Detailed forensic transaction record',
                            title: 'JSON Payload Inspector'
                        }
                    },
                    confirmText: 'Close',
                    formButtonsProps: {
                        confirmProps: {
                            onClick: handleCloseView
                        }
                    },
                    formContent: selectedLog
                        ? (
                            <AuditLogDetailContent row={selectedLog} />
                        )
                        : null,
                    open: isViewOpen,
                    onClose: handleCloseView
                }}
                onFetch={fetchAuditLogs}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />
        </div>
    );
}