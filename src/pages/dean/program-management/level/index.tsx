import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import ProgramLevelForm from '@pages/dean/program-management/level/ProgramLevelForm';
import { useProgramLevelTableConfig } from '@pages/dean/program-management/level/useProgramLevelTableConfig';
import {
    createProgramLevel, deleteProgramLevel, getProgramLevelById, listProgramLevels, updateProgramLevel
} from '@services/program/program-level.service';
import { SortStringDto } from '@type/http.type';
import { ProgramLevelFormValues, ProgramLevelListRow } from '@type/program/program-level.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' }
];

const CREATE_FORM_ID = 'create-program-level-form';
const UPDATE_FORM_ID = 'update-program-level-form';

const defaultFormValues: ProgramLevelFormValues = {
    code: '',
    description: '',
    label: ''
};

export default function ProgramLevelManagement() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const createMethods = useForm<ProgramLevelFormValues>({
        defaultValues: defaultFormValues
    });

    const updateMethods = useForm<ProgramLevelFormValues>({
        defaultValues: defaultFormValues
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadIntoForm(id: string) {
        const result = await getProgramLevelById(id);

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

    const { columnDefs, tableActionConfig } = useProgramLevelTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchProgramLevels(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listProgramLevels(page, size, search, sort);
    }

    async function handleCreateSubmit(values: ProgramLevelFormValues) {
        const result = await createProgramLevel(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    function handleCreateFormError(errors: FieldErrors<ProgramLevelFormValues>) {
        formErrors(errors, createMethods);
    }

    async function handleUpdateSubmit(values: ProgramLevelFormValues) {
        if (!selectedId) {
            return;
        }

        const result = await updateProgramLevel(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    function handleUpdateFormError(errors: FieldErrors<ProgramLevelFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<ProgramLevelListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic program levels used across the system.',
                    title: 'Program Level Management'
                }}
                createModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Fill in the details to create a new program level.',
                            title: 'Create Program Level'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <ProgramLevelForm
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
                            subheader: 'Update the details of this program level.',
                            title: 'Edit Program Level'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <ProgramLevelForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(
                                handleUpdateSubmit,
                                handleUpdateFormError
                            )}
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
                            subheader: 'Viewing program level details.',
                            title: 'View Program Level'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <ProgramLevelForm
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
                onDeleteRow={deleteProgramLevel}
                onFetch={fetchProgramLevels}
                onRowClick={handleOpenView}
            />
        </div>
    );
}