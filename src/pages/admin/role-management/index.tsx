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
import { useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-role-form';
const UPDATE_FORM_ID = 'update-role-form';
const EMPTY_ROLE_VALUES: UpdateRoleFormValues = {
    code: '',
    description: '',
    label: ''
};
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
        defaultValues: EMPTY_ROLE_VALUES
    });
    // Only the newest load may fill the form; an older one finishing late is ignored
    const loadRequestRef = useRef(0);

    const isUpdateRealDirty = useHasRealChanges(updateMethods.control);

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    /**
     * Loads a role into the form. Returns true only when the load succeeded and is
     * still the newest one, so a modal opens only on that role's data.
     */
    async function loadRoleIntoForm(roleId: string): Promise<boolean> {
        loadRequestRef.current += 1;
        const requestId = loadRequestRef.current;
        const result = await getRoleById(roleId);

        if (requestId !== loadRequestRef.current || !result.data) {
            return false;
        }

        updateMethods.reset({
            code: result.data.code,
            description: result.data.description ?? '',
            label: result.data.label
        });
        return true;
    }

    function clearSelectedRole() {
        loadRequestRef.current += 1;
        setSelectedRoleId(null);
        updateMethods.reset(EMPTY_ROLE_VALUES);
    }

    async function handleOpenView(id: string) {
        setSelectedRoleId(id);
        if (await loadRoleIntoForm(id)) {
            setIsViewOpen(true);
        }
    }

    function handleCloseView() {
        setIsViewOpen(false);
        clearSelectedRole();
    }

    async function handleOpenUpdate(id: string) {
        setSelectedRoleId(id);
        if (await loadRoleIntoForm(id)) {
            setIsUpdateOpen(true);
        }
    }

    async function handleSwitchToEdit(id: string) {
        setIsViewOpen(false);
        if (await loadRoleIntoForm(id)) {
            setIsUpdateOpen(true);
        }
        else {
            clearSelectedRole();
        }
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        clearSelectedRole();
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