import CommonBentoCard from '@components/card/CommonBentoCard';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import AuditLogDetailContent from '@pages/admin/audit-log-management/components/AuditLogDetailContent';
import { FILTER_FORM_ID, SORT_COLUMNS } from '@pages/admin/audit-log-management/constants/audit-log.constant';
import FilterAuditLogForm from '@pages/admin/audit-log-management/forms/FilterAuditLogForm';
import { useAuditLogTableConfig } from '@pages/admin/audit-log-management/hooks/useAuditLogTableConfig';
import { getAuditLogTables, listGradeAuditLogs } from '@services/audit-log.service';
import { AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const EMPTY_FILTERS: AuditLogFilterValues = {
    action: 'All',
    table_name: 'All',
    date_from: '',
    date_to: ''
};

function toTitleCase(value: string): string {
    return value.replace(/_/g, ' ')
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

export default function AuditLogManagement() {
    const [activeFilters, setActiveFilters] = useState<AuditLogFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tableOptions, setTableOptions] = useState<CommonSelectOption[]>([]);
    const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const rowsMapRef = useRef<Map<string, AuditLogRow>>(new Map());

    const filterMethods = useForm<AuditLogFilterValues>({ defaultValues: EMPTY_FILTERS });

    const { columnDefs } = useAuditLogTableConfig();

    useEffect(function() {
        async function loadTableOptions() {
            const result = await getAuditLogTables();

            if (result.data) {
                setTableOptions(result.data);
            }
        }

        loadTableOptions();
    }, []);

    async function fetchAuditLogs(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const result = await listGradeAuditLogs(page, size, search, sort, activeFilters);
        if (result.data?.content) {
            result.data.content.forEach(function(item: AuditLogRow) {
                rowsMapRef.current.set(item.id, item);
            });
        }
        return result;
    }

    function handleFilterSubmit(values: AuditLogFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

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

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedLog(null);
    }

    function renderAuditBentoCard(item: AuditLogRow) {
        const periodLabel = item.grading_period_name
            ? formatPeriodLabel(item.grading_period_name)
            : '—';

        const metrics = [
            {
                label: 'Action',
                value: item.action
            },
            {
                label: 'User',
                value: item.changed_by_name || 'System'
            },
            {
                label: 'Date',
                value: item.changed_at
                    ? formatDate(item.changed_at)
                    : '—'
            },
            {
                label: 'Grading Period',
                value: periodLabel
            }
        ];

        return (
            <CommonBentoCard
                actionMenu={<span />}
                code={undefined}
                hasCheckbox={false}
                metrics={metrics}
                status={undefined}
                subtitle={item.student_name
                    ? `${item.student_name}${item.section_code
                        ? ` • ${item.section_code}`
                        : ''}`
                    : (item.section_code || undefined)}
                title={item.table_name
                    ? toTitleCase(item.table_name)
                    : 'Audit Record'}
                onClick={function() {
                    handleOpenView(item);
                }}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<AuditLogRow>
                cardHeaderProps={{
                    subheader: 'Every recorded grade and grading-schema change, with who changed it and why.',
                    title: 'Grade Audit Log'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.auditLogs
                    }
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Narrow the audit trail by action, table, or date range.',
                            title: 'Audit Log Filters'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <FilterAuditLogForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            tableOptions={tableOptions}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    formId: FILTER_FORM_ID,
                    open: isFilterOpen,
                    onClose: function() {
                        filterMethods.reset();
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
                                ? `${selectedLog.changed_by_name || 'System'} • ${selectedLog.action} on ${toTitleCase(selectedLog.table_name || '')}`
                                : 'Detailed audit trail record',
                            title: 'Audit Log Details'
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