import BulkImportModal from '@components/modal/BulkImportModal';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { CREATE_FORM_ID, FILTER_FORM_ID, SORT_COLUMNS } from '@pages/admin/user-management/constants/admin-user.constant';
import CreateUserForm from '@pages/admin/user-management/forms/CreateUserForm';
import FilterUserForm from '@pages/admin/user-management/forms/FilterUserForm';
import UserForm from '@pages/admin/user-management/forms/UserForm';
import { useUserTableConfig } from '@pages/admin/user-management/hooks/useUserTableConfig';
import {
    bulkProvisionUsers, deleteUsers, getUserById, inviteSingleUser, listUsers, updateUser
} from '@services/user.service';
import { UserRole } from '@type/app.type';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import {
    AddUserFormValues, InviteUserParams, UpdateUserFormValues, UserFilterValues, UserListRow
} from '@type/user.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const UPDATE_FORM_ID = 'update-user-form';
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'first_name', label: 'First Name', hint: 'e.g. Juan' },
    { key: 'last_name', label: 'Last Name', hint: 'e.g. Dela Cruz' },
    { key: 'email', label: 'Email', hint: 'e.g. juan@school.edu' },
    { key: 'role_code', label: 'Role', hint: 'Admin, Faculty, Student, Registrar, Dean' }
];

export default function UserManagement() {
    const [activeFilters, setActiveFilters] = useState<UserFilterValues | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const createMethods = useForm<AddUserFormValues>({
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role_code: 'Student' as UserRole
        }
    });

    const filterMethods = useForm<UserFilterValues>({
        defaultValues: {
            city: '',
            province: '',
            role_code: 'All',
            status: 'All'
        }
    });

    const updateMethods = useForm<UpdateUserFormValues>({
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role_codes: []
        }
    });

    async function loadUserIntoForm(userId: string) {
        const result = await getUserById(userId);

        if (result.data) {
            updateMethods.reset({
                email: result.data.email,
                first_name: result.data.first_name,
                last_name: result.data.last_name,
                role_codes: result.data.role_codes ?? []
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

    const { columnDefs, tableActionConfig } = useUserTableConfig({
        onRequestDeleteRow: function() {},
        onEdit: handleOpenUpdate,
        onView: handleOpenView
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
        const result = await inviteSingleUser(values);

        if (!result.error) {
            createMethods.reset();

            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
        }
    }

    function handleFilterSubmit(values: UserFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    async function handleUpdateSubmit(values: UpdateUserFormValues) {
        if (!selectedUserId) {
            return;
        }

        const result = await updateUser(selectedUserId, {
            first_name: values.first_name,
            last_name: values.last_name,
            role_codes: values.role_codes
        });

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<UserListRow>
                cardHeaderProps={{
                    subheader: 'Provision and manage all system users.',
                    title: 'User Management'
                }}
                controls={{
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
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <CreateUserForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(handleCreateSubmit)}
                        />
                    ),
                    open: isCreateOpen,
                    onClose: function() {
                        createMethods.reset();
                        setIsCreateOpen(false);
                    }
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
                        filterMethods.reset();
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
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this user.',
                            title: 'Edit User'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <UserForm
                            control={updateMethods.control}
                            disabled={false}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(handleUpdateSubmit)}
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
                onDelete={deleteUsers}
                onDeleteRow={function(id) {
                    return deleteUsers([id]);
                }}
                onFetch={fetchUsers}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<InviteUserParams>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Users"
                onBulkImport={bulkProvisionUsers}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={function(row) {
                    return {
                        email: row.email,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        role_code: row.role_code as UserRole
                    };
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as UserFilterValues));
                }}
            />
        </div>
    );
}