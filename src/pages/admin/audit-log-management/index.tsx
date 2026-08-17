import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { FILTER_FORM_ID, SORT_COLUMNS } from '@pages/admin/audit-log-management/constants/audit-log.constant';
import FilterAuditLogForm from '@pages/admin/audit-log-management/forms/FilterAuditLogForm';
import { useAuditLogTableConfig } from '@pages/admin/audit-log-management/hooks/useAuditLogTableConfig';
import { getAuditLogTables, listGradeAuditLogs } from '@services/audit-log.service';
import { AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const EMPTY_FILTERS: AuditLogFilterValues = {
    action: 'All',
    table_name: 'All',
    date_from: '',
    date_to: ''
};

export default function AuditLogManagement() {
    const [activeFilters, setActiveFilters] = useState<AuditLogFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tableOptions, setTableOptions] = useState<CommonSelectOption[]>([]);

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
        return listGradeAuditLogs(page, size, search, sort, activeFilters);
    }

    function handleFilterSubmit(values: AuditLogFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
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
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <FilterAuditLogForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            tableOptions={tableOptions}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    onReset: handleFilterReset,
                    open: isFilterOpen,
                    onClose: function() {
                        filterMethods.reset();
                        setIsFilterOpen(false);
                    }
                }}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onFetch={fetchAuditLogs}
                onFilter={() => setIsFilterOpen(true)}
            />
        </div>
    );
}