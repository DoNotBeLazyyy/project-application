import CommonButton from '@components/button/CommonButton';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { CREATE_FORM_ID, FILTER_FORM_ID, SORT_COLUMNS } from '@pages/admin/user-management/constants/admin-user.constant';
import CreateUserForm from '@pages/admin/user-management/forms/CreateUserForm';
import FilterUserForm from '@pages/admin/user-management/forms/FilterUserForm';
import UserForm from '@pages/admin/user-management/forms/UserForm';
import { handleResendInvite, handleResetPassword, useUserTableConfig } from '@pages/admin/user-management/hooks/useUserTableConfig';
import UserGridCard from '@pages/admin/user-management/UserGridCard';
import { ArrowCounterClockwiseIcon, ProhibitIcon } from '@phosphor-icons/react';
import {
    bulkProvisionUsers, deactivateUsers, getUserById, inviteSingleUser, listUsers, reactivateUsers, updateUser
} from '@services/user.service';
import { UserRole } from '@type/app.type';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import {
    AddUserFormValues, InviteUserParams, UpdateUserFormValues, UserFilterValues, UserListRow
} from '@type/user.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useHasRealChanges } from '@hooks/useHasRealChanges';
import { useSearchParams } from 'react-router-dom';

const UPDATE_FORM_ID = 'update-user-form';
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'first_name',
        label: 'First Name',
        hint: 'e.g. Juan',
        sample: 'Juan',
        required: true,
        aliases: ['firstname', 'first', 'given_name', 'given name', 'fname']
    },
    {
        key: 'last_name',
        label: 'Last Name',
        hint: 'e.g. Dela Cruz',
        sample: 'Dela Cruz',
        required: true,
        aliases: ['lastname', 'last', 'surname', 'family_name', 'family name', 'lname']
    },
    {
        key: 'email',
        label: 'Email',
        hint: 'e.g. juan.delacruz@aulms.edu (must not belong to an existing account; an invitation is emailed)',
        sample: 'juan.delacruz@aulms.edu',
        required: true,
        aliases: ['email_address', 'email address', 'user_email', 'user email', 'e-mail', 'mail']
    },
    {
        key: 'role_code',
        label: 'Role',
        hint: 'One of: Admin, Faculty, Student, Registrar, Dean',
        sample: 'Faculty',
        required: true,
        aliases: ['role', 'roles', 'role_code', 'role code', 'user_role', 'user role', 'role_name', 'role name', 'user_type', 'user type']
    }
];

export default function UserManagement() {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || searchParams.get('role_code');
    const statusParam = searchParams.get('status');

    const initialRole: UserRole | 'All' = (roleParam === 'Student' || roleParam === 'Faculty' || roleParam === 'Admin' || roleParam === 'Registrar' || roleParam === 'Dean')
        ? (roleParam as UserRole)
        : 'All';

    const initialStatus = statusParam === 'Active' || statusParam === 'Invited' || statusParam === 'Inactive' || statusParam === 'All'
        ? statusParam
        : 'Active_Invited';

    const [activeFilters, setActiveFilters] = useState<UserFilterValues | null>({
        city: '',
        province: '',
        role_code: initialRole,
        status: initialStatus
    });

    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const createMethods = useForm<AddUserFormValues>({
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role_code: 'Student' as UserRole,
            department_id: ''
        }
    });

    const filterMethods = useForm<UserFilterValues>({
        defaultValues: {
            city: '',
            province: '',
            role_code: initialRole,
            status: initialStatus
        }
    });

    useEffect(function() {
        if (roleParam || statusParam) {
            const roleCode = (roleParam === 'Student' || roleParam === 'Faculty' || roleParam === 'Admin' || roleParam === 'Registrar' || roleParam === 'Dean')
                ? (roleParam as UserRole)
                : 'All';

            const statusVal = statusParam === 'Active' || statusParam === 'Invited' || statusParam === 'Inactive' || statusParam === 'All'
                ? statusParam
                : 'Active_Invited';

            const newFilters: UserFilterValues = {
                city: '',
                province: '',
                role_code: roleCode,
                status: statusVal
            };

            setActiveFilters(newFilters);
            filterMethods.reset(newFilters);
        }
    }, [roleParam, statusParam, filterMethods]);

    const updateMethods = useForm<UpdateUserFormValues>({
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role_codes: [],
            department_id: ''
        }
    });

    const isUpdateRealDirty = useHasRealChanges(updateMethods.control);

    async function loadUserIntoForm(userId: string) {
        const result = await getUserById(userId);

        if (result.data) {
            updateMethods.reset({
                email: result.data.email,
                first_name: result.data.first_name,
                last_name: result.data.last_name,
                role_codes: result.data.role_codes ?? [],
                department_id: result.data.department_id ?? ''
            });
        }
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedUserId(null);
        updateMethods.reset();
    }

    async function handleOpenView(id: string) {
        setSelectedUserId(id);
        await loadUserIntoForm(id);
        setIsViewOpen(true);
    }

    async function handleOpenUpdate(id: string) {
        setSelectedUserId(id);
        await loadUserIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string) {
        setIsViewOpen(false);
        await loadUserIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedUserId(null);
        updateMethods.reset();
    }

    async function handleReactivateSingle(id: string) {
        const result = await reactivateUsers([id]);
        if (!result.error) {
            setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
        }
    }

    async function handleBulkReactivate(ids: string[], clearSelection: () => void) {
        const result = await reactivateUsers(ids);
        if (!result.error) {
            clearSelection();
            setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
        }
    }

    const { columnDefs, tableActionConfig } = useUserTableConfig({
        onRequestDeleteRow: function() {},
        onEdit: handleOpenUpdate,
        onView: handleOpenView,
        onReactivate: handleReactivateSingle
    });

    async function fetchUsers(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listUsers(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: AddUserFormValues) {
        setIsCreating(true);
        try {
            const result = await inviteSingleUser(values);

            if (!result.error) {
                createMethods.reset();

                setIsCreateOpen(false);
                setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
            }
        }
        finally {
            setIsCreating(false);
        }
    }

    function handleFilterSubmit(values: UserFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        const resetFilters: UserFilterValues = {
            city: '',
            province: '',
            role_code: 'All',
            status: 'Active_Invited'
        };
        filterMethods.reset(resetFilters);
        setActiveFilters(resetFilters);
    }

    async function handleUpdateSubmit(values: UpdateUserFormValues) {
        if (!selectedUserId) {
            return;
        }

        setIsUpdating(true);
        try {
            const result = await updateUser(selectedUserId, {
                email: values.email.trim(),
                first_name: values.first_name.trim(),
                last_name: values.last_name.trim(),
                role_codes: values.role_codes,
                department_id: values.department_id || null
            });

            if (!result.error) {
                handleCloseUpdate();
                setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
            }
        }
        finally {
            setIsUpdating(false);
        }
    }

    return (
        <div className="h-full">
            <CommonTableCard<UserListRow>
                cardHeaderProps={{
                    subheader: 'Provision and manage all system users.',
                    title: 'User Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.users
                    },
                    tableButtonsProps: {
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
                    }
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to invite a new user to the system.',
                            title: 'Add New User'
                        }
                    },
                    confirmText: 'Save',
                    formButtonsProps: {
                        cancelProps: {
                            disabled: isCreating
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <CreateUserForm
                            control={createMethods.control}
                            disabled={isCreating}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit)}
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
                deleteModalProps={{
                    title: (count) => count > 1
                        ? `Deactivate ${count} users?`
                        : 'Deactivate this user?',
                    subTitle: 'This user will lose access to the system, but historical data will be preserved.',
                    confirmText: 'Yes, Deactivate',
                    actionIcon: ProhibitIcon
                }}
                selectionBarProps={{
                    entityName: 'User',
                    deleteActionLabel: 'Deactivate Selected',
                    deleteActionIcon: <ProhibitIcon size={16} weight="bold" />,
                    extraActions: (selectedIds, clearSelection) => (
                        <CommonButton
                            color="success"
                            size="small"
                            variant="outlined"
                            startIcon={<ArrowCounterClockwiseIcon size={16} weight="bold" />}
                            onClick={() => handleBulkReactivate(selectedIds, clearSelection)}
                            title={`Reactivate Selected (${selectedIds.length})`}
                        >
                            <span className="hidden sm:inline">Reactivate Selected </span>({selectedIds.length})
                        </CommonButton>
                    )
                }}
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Narrow down the user list by roles or status.',
                            title: 'User Filters'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <FilterUserForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    open: isFilterOpen,
                    onClose: function() {
                        setIsFilterOpen(false);
                    },
                    onReset: handleFilterReset
                }}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <UserGridCard
                            isSelected={isSelected}
                            row={item}
                            onEdit={handleOpenUpdate}
                            onRequestDelete={onRequestDeleteRow}
                            onReactivate={handleReactivateSingle}
                            onResendInvite={handleResendInvite}
                            onResetPassword={handleResetPassword}
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
                            subheader: 'Update the details of this user.',
                            title: 'Edit User'
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
                        <UserForm
                            control={updateMethods.control}
                            disabled={isUpdating}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(handleUpdateSubmit)}
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
                            subheader: 'Viewing user details.',
                            title: 'View User'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <UserForm
                            control={updateMethods.control}
                            disabled
                        />
                    ),
                    formButtonsProps: {
                        confirmProps: {
                            onClick: function() {
                                if (selectedUserId) {
                                    handleSwitchToEdit(selectedUserId);
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
                onDelete={deactivateUsers}
                onDeleteRow={function(id) {
                    return deactivateUsers([id]);
                }}
                onFetch={fetchUsers}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<InviteUserParams>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                templateDownloadFilename="users_template.csv"
                title="Bulk Import Users"
                onBulkImport={bulkProvisionUsers}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
                }}
                onMapRow={function(row) {
                    const rawRole = (row.role_code || '').trim();
                    const normalizedRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
                    const validRole = (['Admin', 'Faculty', 'Student', 'Registrar', 'Dean'].includes(normalizedRole)
                        ? normalizedRole
                        : rawRole) as UserRole;
                    return {
                        email: (row.email || '').trim(),
                        first_name: (row.first_name || '').trim(),
                        last_name: (row.last_name || '').trim(),
                        role_code: validRole
                    };
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
                }}
            />
        </div>
    );
}