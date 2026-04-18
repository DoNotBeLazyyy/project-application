import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { useRoleTableConfig } from '@pages/admin/role-management/hooks/useRoleTableConfig';
import RoleForm from '@pages/admin/role-management/RoleForm';
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

    const { columnDefs, tableActionConfig } = useRoleTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchRoles(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listRoles(page, size, search, sort);
    }

    async function handleCreateSubmit(values: CreateRoleFormValues) {
        const result = await createRole(values);

        if (!result.error) {
            createMethods.reset();
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    async function handleUpdateSubmit(values: UpdateRoleFormValues) {
        if (!selectedRoleId) {
            return;
        }

        const result = await updateRole(selectedRoleId, {
            code: values.code,
            description: values.description,
            label: values.label
        });

        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
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
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new role.',
                            title: 'Create Role'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <RoleForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit, handleCreateFormError)}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: function() {
                        createMethods.reset();
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
                            subheader: 'Update the details of this role.',
                            title: 'Edit Role'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <RoleForm
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