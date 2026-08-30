import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import SchoolYearFilterForm from '@pages/admin/school-year-management/SchoolYearFilterForm';
import SchoolYearForm from '@pages/admin/school-year-management/SchoolYearForm';
import SchoolYearGridCard from '@pages/admin/school-year-management/SchoolYearGridCard';
import { useSchoolYearTableConfig } from '@pages/admin/school-year-management/useSchoolYearTableConfig';
import {
    bulkDeleteSchoolYears,
    createSchoolYear, deleteSchoolYear, getSchoolYearById, listSchoolYears, updateSchoolYear
} from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import { SortStringDto } from '@type/http.type';
import { SchoolYearFilterValues, SchoolYearFormValues, SchoolYearListRow } from '@type/school-year.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm, UseFormReturn } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' },
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' }
];
const CREATE_FORM_ID = 'create-school-year-form';
const UPDATE_FORM_ID = 'update-school-year-form';
const FILTER_FORM_ID = 'filter-school-year-form';

export default function SchoolYearManagement() {
    const [activeFilters, setActiveFilters] = useState<SchoolYearFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const defaultFormValues: SchoolYearFormValues = {
        code: '',
        end_date: '',
        is_active: false,
        label: '',
        start_date: ''
    };
    const createMethods = useForm<SchoolYearFormValues>({
        defaultValues: defaultFormValues
    });
    const filterMethods = useForm<SchoolYearFilterValues>({
        defaultValues: {
            is_active: 'All',
            year: ''
        }
    });
    const updateMethods = useForm<SchoolYearFormValues>({
        defaultValues: defaultFormValues
    });
    const viewMethods = useForm<SchoolYearFormValues>({
        defaultValues: defaultFormValues
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadIntoForm(id: string, methods: UseFormReturn<SchoolYearFormValues>) {
        const result = await getSchoolYearById(id);

        if (result.data) {
            methods.reset({
                code: result.data.code,
                end_date: result.data.end_date,
                is_active: result.data.is_active,
                label: result.data.label,
                start_date: result.data.start_date
            });
        }
    }

    async function handleOpenView(id: string) {
        setSelectedId(id);
        await loadIntoForm(id, viewMethods);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        viewMethods.reset(defaultFormValues);
    }

    async function handleOpenUpdate(id: string) {
        setSelectedId(id);
        await loadIntoForm(id, updateMethods);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string) {
        setSelectedId(id);
        setIsViewOpen(false);
        await loadIntoForm(id, updateMethods);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
        updateMethods.reset(defaultFormValues);
    }

    const { columnDefs, tableActionConfig } = useSchoolYearTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchSchoolYears(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listSchoolYears(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: SchoolYearFormValues) {
        const result = await createSchoolYear(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    function handleFilterSubmit(values: SchoolYearFilterValues) {
        setActiveFilters(values);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: SchoolYearFormValues) {
        if (!selectedId) {
            useToastStore.getState()
                .showToast('No school year is selected. Close the dialog and try again.', 'error');
            return;
        }

        const result = await updateSchoolYear(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    function handleCreateFormError(errors: FieldErrors<SchoolYearFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleUpdateFormError(errors: FieldErrors<SchoolYearFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<SchoolYearListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic years for curriculum and enrollment planning.',
                    title: 'Academic Years'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.schoolYears
                    }
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new academic year.',
                            title: 'Create Academic Year'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <SchoolYearForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            isNew
                            setValue={createMethods.setValue}
                            onSubmit={createMethods.handleSubmit(
                                handleCreateSubmit,
                                handleCreateFormError
                            )}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: function() {
                        createMethods.reset(defaultFormValues);
                        setIsCreateOpen(false);
                    }
                }}
                dependencies={[activeFilters, refreshKey]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter academic years by active status.',
                            title: 'Filter Academic Years'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <SchoolYearFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onReset={handleFilterReset}
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
                        <SchoolYearGridCard
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
                            subheader: 'Update the details of this academic year.',
                            title: 'Update Academic Year'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <SchoolYearForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            isCodeDisabled
                            setValue={updateMethods.setValue}
                            onSubmit={updateMethods.handleSubmit(
                                handleUpdateSubmit,
                                handleUpdateFormError
                            )}
                        />
                    ),
                    open: isUpdateOpen,
                    onClose: handleCloseUpdate
                }}
                viewModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Viewing academic year details.',
                            title: 'View Academic Year'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <SchoolYearForm
                            control={viewMethods.control}
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
                onDelete={bulkDeleteSchoolYears}
                onDeleteRow={deleteSchoolYear}
                onFetch={fetchSchoolYears}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />
        </div>
    );
}