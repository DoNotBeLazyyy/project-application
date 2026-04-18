import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import TermTypeForm from '@pages/admin/term-management/type/TermTypeForm';
import { useTermTypeTableConfig } from '@pages/admin/term-management/type/useTermTypeTableConfig';
import {
    createTermType, deleteTermType, getTermTypeById, listTermTypes, updateTermType
} from '@services/term/term-type.service';
import { SortStringDto } from '@type/http.type';
import { TermTypeFormValues, TermTypeListRow } from '@type/term/term-type.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' }
];

const CREATE_FORM_ID = 'create-term-type-form';
const UPDATE_FORM_ID = 'update-term-type-form';

export default function TermTypeManagement() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const defaultFormValues: TermTypeFormValues = {
        code: '',
        description: '',
        label: '',
        sequence: ''
    };

    const createMethods = useForm<TermTypeFormValues>({
        defaultValues: defaultFormValues
    });

    const updateMethods = useForm<TermTypeFormValues>({
        defaultValues: defaultFormValues
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadIntoForm(id: string) {
        const result = await getTermTypeById(id);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                description: result.data.description ?? '',
                label: result.data.label
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

    const { columnDefs, tableActionConfig } = useTermTypeTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchTermTypes(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listTermTypes(page, size, search, sort);
    }

    async function handleCreateSubmit(values: TermTypeFormValues) {
        const result = await createTermType(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    async function handleUpdateSubmit(values: TermTypeFormValues) {
        if (!selectedId) {
            return;
        }

        const result = await updateTermType(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    function handleCreateFormError(errors: FieldErrors<TermTypeFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleUpdateFormError(errors: FieldErrors<TermTypeFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<TermTypeListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic term types used across the system.',
                    title: 'Term Type Management'
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new term type.',
                            title: 'Create Term Type'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <TermTypeForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit, handleCreateFormError)}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: function() {
                        createMethods.reset(defaultFormValues);
                        setIsCreateOpen(false);
                    }
                }}
                dependencies={[refreshKey]}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this term type.',
                            title: 'Edit Term Type'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <TermTypeForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(handleUpdateSubmit, handleUpdateFormError)}
                        />
                    ),
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
                            subheader: 'Viewing term type details.',
                            title: 'View Term Type'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <TermTypeForm
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
                onDeleteRow={deleteTermType}
                onFetch={fetchTermTypes}
                onRowClick={handleOpenView}
            />
        </div>
    );
}