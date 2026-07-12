import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import DepartmentFilterForm from '@pages/dean/department-management/DepartmentFilterForm';
import { useDepartmentTableConfig } from '@pages/dean/department-management/useDepartmentTableConfig';
import { bulkDeleteDepartments, deleteDepartment, listDepartments } from '@services/department.service';
import { DepartmentFilterValues, DepartmentListRow } from '@type/department.type';
import { SortStringDto } from '@type/http.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'name', label: 'Name' }
];

const FILTER_FORM_ID = 'filter-department-form';

export default function DepartmentManagement() {
    const navigate = useNavigate();
    const [activeFilters, setActiveFilters] = useState<DepartmentFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterMethods = useForm<DepartmentFilterValues>({
        defaultValues: { has_head: 'All' }
    });

    function handleOpenDetail(id: string) {
        navigate(`/dean/department-management/${id}`);
    }

    function handleOpenEdit(id: string) {
        navigate(`/dean/department-management/${id}?edit=1`);
    }

    const { columnDefs, tableActionConfig } = useDepartmentTableConfig({
        onEdit: handleOpenEdit,
        onRequestDeleteRow: function() {},
        onView: handleOpenDetail
    });

    async function fetchDepartments(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listDepartments(page, size, search, sort, activeFilters);
    }

    function handleFilterSubmit(values: DepartmentFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<DepartmentListRow>
                cardHeaderProps={{
                    subheader: 'Manage university departments and their heads.',
                    title: 'Department Management'
                }}
                controls={{
                    tableButtonsProps: {
                        createButtonProps: {
                            onClick: function() {
                                navigate('/dean/department-management/new');
                            }
                        }
                    }
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter departments by head assignment status.',
                            title: 'Filter Departments'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <DepartmentFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
                }}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onDelete={bulkDeleteDepartments}
                onDeleteRow={deleteDepartment}
                onFetch={fetchDepartments}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenDetail}
            />
        </div>
    );
}