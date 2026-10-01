import CommonBentoCard from '@components/card/CommonBentoCard';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import RegistrarLogDetailContent from '@pages/registrar/registrar-logs/components/RegistrarLogDetailContent';
import FilterRegistrarLogForm from '@pages/registrar/registrar-logs/forms/FilterRegistrarLogForm';
import { useRegistrarLogTableConfig } from '@pages/registrar/registrar-logs/hooks/useRegistrarLogTableConfig';
import { listRegistrarLogs } from '@services/registrar-verification.service';
import { SortStringDto } from '@type/http.type';
import { RegistrarLogFilterValues, RegistrarLogRow } from '@type/registrar-verification.type';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const FILTER_FORM_ID = 'filter-registrar-logs-form';
const EMPTY_FILTERS: RegistrarLogFilterValues = {
    action: 'All',
    date_from: '',
    date_to: ''
};

const SORT_COLUMNS: SortColumn[] = [
    { field: 'rl.created_at', label: 'Timestamp' },
    { field: 'rl.action', label: 'Action' },
    { field: 'rl.student_name', label: 'Student Name' },
    { field: 'rl.student_number', label: 'Student Number' }
];

function formatActionLabel(action: string): string {
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RegistrarLogsPage() {
    const [activeFilters, setActiveFilters] = useState<RegistrarLogFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<RegistrarLogRow | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    const rowsMapRef = useRef<Map<string, RegistrarLogRow>>(new Map());
    const filterMethods = useForm<RegistrarLogFilterValues>({ defaultValues: EMPTY_FILTERS });
    const { columnDefs } = useRegistrarLogTableConfig();

    async function fetchLogs(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const result = await listRegistrarLogs(page, size, search, sort, activeFilters);
        if (result.data?.content) {
            result.data.content.forEach((item) => {
                rowsMapRef.current.set(item.id, item);
            });
        }
        return result;
    }

    function handleFilterSubmit(values: RegistrarLogFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset(EMPTY_FILTERS);
        setActiveFilters(null);
    }

    function handleOpenView(rowOrId: RegistrarLogRow | string) {
        if (typeof rowOrId === 'string') {
            const found = rowsMapRef.current.get(rowOrId);
            if (found) {
                setSelectedLog(found);
                setIsViewOpen(true);
            }
        } else {
            setSelectedLog(rowOrId);
            setIsViewOpen(true);
        }
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedLog(null);
    }

    function renderBentoCard(item: RegistrarLogRow) {
        const metrics = [
            {
                label: 'Student',
                value: `${item.student_name} (${item.student_number})`
            },
            {
                label: 'Performed By',
                value: item.performed_by_name || 'System'
            },
            {
                label: 'Date',
                value: new Date(item.created_at).toLocaleString('en-PH', {
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    month: 'short',
                    year: 'numeric'
                })
            }
        ];

        return (
            <CommonBentoCard
                actionMenu={<span />}
                code={item.student_number}
                hasCheckbox={false}
                metrics={metrics}
                status={item.action.includes('APPROVED') ? 'Approved' : item.action.includes('REJECTED') ? 'Rejected' : undefined}
                subtitle={item.details}
                title={formatActionLabel(item.action)}
                onClick={() => handleOpenView(item)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<RegistrarLogRow>
                cardHeaderProps={{
                    subheader: 'Complete audit trail of all student profile change requests, approvals, registrar modifications, and notifications.',
                    title: 'Registrar Logs'
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter audit records by action type and date range.',
                            title: 'Filter Registrar Logs'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <FilterRegistrarLogForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    formId: FILTER_FORM_ID,
                    open: isFilterOpen,
                    onClose: () => {
                        filterMethods.reset(activeFilters || EMPTY_FILTERS);
                        setIsFilterOpen(false);
                    },
                    onReset: handleFilterReset
                }}
                renderGridCard={renderBentoCard}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                viewModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: selectedLog
                                ? `${formatActionLabel(selectedLog.action)} • ${selectedLog.student_name} (${selectedLog.student_number})`
                                : 'Audit Record Details',
                            title: 'Registrar Audit Log Details'
                        }
                    },
                    confirmText: 'Close',
                    formButtonsProps: {
                        confirmProps: {
                            onClick: handleCloseView
                        }
                    },
                    formContent: selectedLog ? <RegistrarLogDetailContent row={selectedLog} /> : null,
                    open: isViewOpen,
                    onClose: handleCloseView
                }}
                onFetch={fetchLogs}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />
        </div>
    );
}
