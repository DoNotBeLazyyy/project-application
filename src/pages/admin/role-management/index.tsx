import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { useHasRealChanges } from '@hooks/use-has-real-changes';
import { useRoleTableConfig } from '@pages/admin/role-management/hooks/use-role-table-config';
import RoleForm from '@pages/admin/role-management/RoleForm';
import RoleGridCard from '@pages/admin/role-management/RoleGridCard';
import {
    createRole, deleteRole, getRoleById, listRoles, updateRole
} from '@services/role.service';
import { SortStringDto } from '@type/http.type';
import { CreateRoleFormValues, RoleListRow, UpdateRoleFormValues } from '@type/role.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-role-form';
const UPDATE_FORM_ID = 'update-role-form';
const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' }
];

export default function RoleManagement() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const createMethods = useForm<CreateRoleFormValues>({
        defaultValues: {
            code: '',
            description: '',
            label: ''
        }
    });

    const updateMethods = useForm<UpdateRoleFormValues>({
        defaultValues: {
            code: '',
            description: '',
            label: ''
        }
    });

    const isUpdateRealDirty = useHasRealChanges(updateMethods.control);

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadRoleIntoForm(roleId: string) {
        const result = await getRoleById(roleId);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                description: result.data.description ?? '',
                label: result.data.label
            });
        }
    }

    async function handleOpenView(id: string) {
        setSelectedRoleId(id);
        await loadRoleIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedRoleId(null);
        updateMethods.reset();
    }

    async function handleOpenUpdate(id: string) {
        setSelectedRoleId(id);
        await loadRoleIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string) {
        setIsViewOpen(false);
        await loadRoleIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedRoleId(null);
        updateMethods.reset();
    }

    const { columnDefs } = useRoleTableConfig();

    async function fetchRoles(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listRoles(page, size, search, sort);
    }

    async function handleCreateSubmit(values: CreateRoleFormValues) {
        if (isCreating) {
            return;
        }
        setIsCreating(true);
        try {
            const result = await createRole({
                ...values,
                description: values.description
                    ? values.description.trim()
                    : '',
                label: values.label.trim()
            });

            if (!result.error) {
                createMethods.reset();
                setIsCreateOpen(false);
                triggerRefresh();
            }
        }
        finally {
            setIsCreating(false);
        }
    }

    async function handleUpdateSubmit(values: UpdateRoleFormValues) {
        if (!selectedRoleId || isUpdating) {
            return;
        }

        setIsUpdating(true);
        try {
            const result = await updateRole(selectedRoleId, {
                code: values.code,
                description: values.description
                    ? values.description.trim()
                    : '',
                label: values.label.trim()
            });

            if (!result.error) {
                handleCloseUpdate();
                triggerRefresh();
            }
        }
        finally {
            setIsUpdating(false);
        }
    }

    function handleCreateFormError(errors: FieldErrors<CreateRoleFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleUpdateFormError(errors: FieldErrors<UpdateRoleFormValues>) {
        formErrors(errors, updateMethods);
    }

    async function handleDeleteRole(id: string) {
        return deleteRole(id);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<RoleListRow>
                cardHeaderProps={{
                    subheader: 'Manage system roles and their descriptions.',
                    title: 'Role Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.roles
                    }
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new role.',
                            title: 'Create Role'
                        }
                    },
                    formButtonsProps: {
                        cancelProps: {
                            disabled: isCreating
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <RoleForm
                            control={createMethods.control}
                            disabled={isCreating}
                            id={CREATE_FORM_ID}
                            isCreate
                            setValue={createMethods.setValue}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit, handleCreateFormError)}
                        />
                    ),
                    isLoading: isCreating,
                    open: isCreateOpen,
                    onClose: function() {
                        if (isCreating) {
                            return;
                        }
                        createMethods.reset();
                        setIsCreateOpen(false);
                    }
                }}
                dependencies={[refreshKey]}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <RoleGridCard
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
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this role.',
                            title: 'Edit Role'
                        }
                    },
                    confirmText: 'Save',
                    formButtonsProps: {
                        cancelProps: {
                            disabled: isUpdating
                        }
                    },
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <RoleForm
                            control={updateMethods.control}
                            disabled={isUpdating}
                            id={UPDATE_FORM_ID}
                            setValue={updateMethods.setValue}
                            onSubmit={updateMethods.handleSubmit(handleUpdateSubmit, handleUpdateFormError)}
                        />
                    ),
                    isDirty: isUpdateRealDirty,
                    isLoading: isUpdating,
                    onConfirmClose: function() {
                        if (isUpdating) {
                            return false;
                        }
                        return !isUpdateRealDirty;
                    },
                    open: isUpdateOpen,
                    onClose: function() {
                        if (isUpdating) {
                            return;
                        }
                        handleCloseUpdate();
                    }
                }}
                viewModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Viewing role details.',
                            title: 'View Role'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <RoleForm
                            control={updateMethods.control}
                            disabled
                        />
                    ),
                    formButtonsProps: {
                        confirmProps: {
                            onClick: function() {
                                if (selectedRoleId) {
                                    handleSwitchToEdit(selectedRoleId);
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
                onDeleteRow={handleDeleteRole}
                onFetch={fetchRoles}
                onRowClick={handleOpenView}
            />
        </div>
    );
}