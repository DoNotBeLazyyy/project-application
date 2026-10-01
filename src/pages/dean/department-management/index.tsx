import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import DepartmentFilterForm from '@pages/dean/department-management/DepartmentFilterForm';
import DepartmentForm from '@pages/dean/department-management/DepartmentForm';
import DepartmentGridCard from '@pages/dean/department-management/DepartmentGridCard';
import { useDepartmentTableConfig } from '@pages/dean/department-management/useDepartmentTableConfig';
import {
    bulkDeleteDepartments, createDepartment, deleteDepartment, getDepartmentById, listDepartments, updateDepartment
} from '@services/department.service';
import { DepartmentFilterValues, DepartmentFormValues, DepartmentListRow } from '@type/department.type';
import { SortStringDto } from '@type/http.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'name', label: 'Name' }
];

const CREATE_FORM_ID = 'create-department-form';
const UPDATE_FORM_ID = 'update-department-form';
const FILTER_FORM_ID = 'filter-department-form';

const DEFAULT_FORM_VALUES: DepartmentFormValues = {
    code: '',
    description: '',
    head_user_id: '',
    name: ''
};

export default function DepartmentManagement() {
    const [activeFilters, setActiveFilters] = useState<DepartmentFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const createMethods = useForm<DepartmentFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const filterMethods = useForm<DepartmentFilterValues>({
        defaultValues: { has_head: 'All' }
    });

    const updateMethods = useForm<DepartmentFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    function refreshList() {
        setActiveFilters((prev) => ({ ...prev } as DepartmentFilterValues));
    }

    async function loadIntoForm(id: string) {
        const result = await getDepartmentById(id);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                description: result.data.description ?? '',
                head_user_id: result.data.head_user_id ?? '',
                name: result.data.name
            });
        }
    }

    async function handleOpenView(id: string) {
        setSelectedId(id);
        await loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    async function handleOpenUpdate(id: string) {
        setSelectedId(id);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string) {
        setIsViewOpen(false);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    const { columnDefs, tableActionConfig } = useDepartmentTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchDepartments(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listDepartments(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: DepartmentFormValues) {
        const result = await createDepartment(values);

        if (!result.error) {
            createMethods.reset(DEFAULT_FORM_VALUES);
            setIsCreateOpen(false);
            refreshList();
        }
    }

    function handleCreateFormError(errors: FieldErrors<DepartmentFormValues>) {
        formErrors(errors, createMethods);
    }

    async function handleUpdateSubmit(values: DepartmentFormValues) {
        if (!selectedId) {
            return;
        }

        const result = await updateDepartment(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            refreshList();
        }
    }

    function handleUpdateFormError(errors: FieldErrors<DepartmentFormValues>) {
        formErrors(errors, updateMethods);
    }

    function handleFilterSubmit(values: DepartmentFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<DepartmentListRow>
                cardHeaderProps={{
                    subheader: 'Manage university departments and their heads.',
                    title: 'Department Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.departments
                    }
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new department.',
                            title: 'Create Department'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <DepartmentForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(
                                handleCreateSubmit,
                                handleCreateFormError
                            )}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: function() {
                        createMethods.reset(DEFAULT_FORM_VALUES);
                        setIsCreateOpen(false);
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
                    onReset: handleFilterReset,
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    }
                }}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <DepartmentGridCard
                            isSelected={isSelected}
                            row={item}
                            onEdit={handleOpenUpdate}
                            onRequestDelete={onRequestDeleteRow}
                            onToggleSelect={onToggleSelect}
                            onView={handleOpenView}
                        />
                    );
                }}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this department.',
                            title: 'Edit Department'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <DepartmentForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(
                                handleUpdateSubmit,
                                handleUpdateFormError
                            )}
                        />
                    ),
                    isDirty: updateMethods.formState.isDirty,
                    onConfirmClose: function() {
                        const current = updateMethods.getValues();
                        const snapshot = updateMethods.formState.defaultValues;
                        return JSON.stringify(current) === JSON.stringify(snapshot);
                    },
                    open: isUpdateOpen,
                    onClose: handleCloseUpdate
                }}
                viewModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Viewing department details.',
                            title: 'View Department'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <DepartmentForm
                            control={updateMethods.control}
                            disabled
                        />
                    ),
                    formButtonsProps: {
                        confirmProps: {
                            onClick: function() {
                                if (selectedId) {
                                    handleSwitchToEdit(selectedId);
                                }
                            }
                        }
                    },
                    open: isViewOpen,
                    onClose: handleCloseView
                }}
                onCreate={function() {
                    setIsCreateOpen(true);
                }}
                onDelete={bulkDeleteDepartments}
                onDeleteRow={deleteDepartment}
                onFetch={fetchDepartments}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
        </div>
    );
}