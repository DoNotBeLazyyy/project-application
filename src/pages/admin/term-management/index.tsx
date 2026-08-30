import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { NEXT_STATUS_MAP } from '@constants/term.constant';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import TermFilterForm from '@pages/admin/term-management/TermFilterForm';
import TermForm from '@pages/admin/term-management/TermForm';
import TermGridCard from '@pages/admin/term-management/TermGridCard';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
import { useTermTableConfig } from '@pages/admin/term-management/useTermTableConfig';
import {
    advanceTermStatus, createTerm, deleteTerm, getTermById, listTerms, updateTerm
} from '@services/term/term.service';
import { SortStringDto } from '@type/http.type';
import { TermFilterValues, TermFormValues, TermListRow, TermStatus } from '@type/term/term.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'start_date', label: 'Start Date' },
    { field: 'end_date', label: 'End Date' },
    { field: 'term_type_label', label: 'Term Type' }
];

const CREATE_FORM_ID = 'create-term-form';
const UPDATE_FORM_ID = 'update-term-form';
const FILTER_FORM_ID = 'filter-term-form';

export default function TermManagement() {
    const [activeFilters, setActiveFilters] = useState<TermFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [advanceTarget, setAdvanceTarget] = useState<{ id: string; currentStatus: TermStatus } | null>(null);

    const { schoolYearOptions } = useSchoolYearOptions();
    const { termTypeOptions } = useTermTypeOptions();

    const defaultFormValues: TermFormValues = {
        school_year_id: '',
        term_type_id: '',
        start_date: '',
        end_date: '',
        enrollment_start_date: '',
        enrollment_end_date: '',
        grading_deadline: '',
        evaluation_scope: ''
    };

    const createMethods = useForm<TermFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<TermFilterValues>({
        defaultValues: {
            school_year_id: '',
            status: 'All'
        }
    });

    const updateMethods = useForm<TermFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getTermById(id);

        if (result.data) {
            updateMethods.reset({
                school_year_id: result.data.school_year_id,
                term_type_id: result.data.term_type_id,
                start_date: result.data.start_date,
                end_date: result.data.end_date,
                enrollment_start_date: result.data.enrollment_start_date ?? '',
                enrollment_end_date: result.data.enrollment_end_date ?? '',
                grading_deadline: result.data.grading_deadline ?? '',
                evaluation_scope: result.data.evaluation_scope ?? ''
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
        updateMethods.reset(defaultFormValues);
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
        updateMethods.reset(defaultFormValues);
    }

    function handleAdvanceStatus(id: string, currentStatus: TermStatus) {
        setAdvanceTarget({ id, currentStatus });
    }

    async function handleConfirmAdvance() {
        if (!advanceTarget) return;

        const result = await advanceTermStatus(advanceTarget.id);

        if (!result.error) {
            setAdvanceTarget(null);
            setActiveFilters((prev) => ({ ...prev } as TermFilterValues));
        }
    }

    function handleCancelAdvance() {
        setAdvanceTarget(null);
    }

    const { columnDefs, tableActionConfig } = useTermTableConfig({
        onAdvanceStatus: handleAdvanceStatus,
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchTerms(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listTerms(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: TermFormValues) {
        const result = await createTerm(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as TermFilterValues));
        }
    }

    function handleFilterSubmit(values: TermFilterValues) {
        setActiveFilters(values);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: TermFormValues) {
        if (!selectedId) return;

        const result = await updateTerm(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as TermFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<TermFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleUpdateFormError(errors: FieldErrors<TermFormValues>) {
        formErrors(errors, updateMethods);
    }

    const nextStatus = advanceTarget
        ? NEXT_STATUS_MAP[advanceTarget.currentStatus]
        : null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<TermListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic terms within school years.',
                    title: 'Term Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.terms
                    }
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new term.',
                            title: 'Create Term'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <TermForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            schoolYearOptions={schoolYearOptions}
                            termTypeOptions={termTypeOptions}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit, handleCreateFormError)}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: () => {
                        createMethods.reset(defaultFormValues);
                        setIsCreateOpen(false);
                    }
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter terms by school year or status.',
                            title: 'Filter Terms'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <TermFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            schoolYearOptions={schoolYearOptions}
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
                        <TermGridCard
                            isSelected={isSelected}
                            row={item}
                            onAdvanceStatus={handleAdvanceStatus}
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
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this term.',
                            title: 'Edit Term'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <TermForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            schoolYearOptions={schoolYearOptions}
                            termTypeOptions={termTypeOptions}
                            onSubmit={updateMethods.handleSubmit(handleUpdateSubmit, handleUpdateFormError)}
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
                            subheader: 'Viewing term details.',
                            title: 'View Term'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <TermForm
                            control={updateMethods.control}
                            disabled
                            schoolYearOptions={schoolYearOptions}
                            termTypeOptions={termTypeOptions}
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
                onDeleteRow={deleteTerm}
                onFetch={fetchTerms}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: handleCancelAdvance
                    },
                    confirmProps: {
                        children: `Advance to ${nextStatus}`,
                        onClick: handleConfirmAdvance
                    }
                }}
                mainContent={{
                    title: `Advance to ${nextStatus}?`
                }}
                open={!!advanceTarget}
                subContent={{
                    title: advanceTarget?.currentStatus === 'Grading Period'
                        ? 'This will close the term permanently and cannot be undone.'
                        : `This will change the term status from ${advanceTarget?.currentStatus} to ${nextStatus}.`
                }}
                onClose={handleCancelAdvance}
            />
        </div>
    );
}