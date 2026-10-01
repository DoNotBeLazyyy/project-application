import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import CourseTypeForm from '@pages/dean/course-management/type/CourseTypeForm';
import CourseTypeGridCard from '@pages/dean/course-management/type/CourseTypeGridCard';
import { useCourseTypeTableConfig } from '@pages/dean/course-management/type/useCourseTypeTableConfig';
import {
    bulkCreateCourseTypes,
    createCourseType, deleteCourseType, getCourseTypeById, listCourseTypes, updateCourseType
} from '@services/course/course-type.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { CourseTypeBulkRow, CourseTypeFormValues, CourseTypeListRow } from '@type/course/course-type.type';
import { SortStringDto } from '@type/http.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'label', label: 'Label' }
];

const CREATE_FORM_ID = 'create-course-type-form';
const UPDATE_FORM_ID = 'update-course-type-form';

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'code', label: 'Code', hint: 'e.g. LEC' },
    { key: 'label', label: 'Label', hint: 'e.g. Lecture' },
    { key: 'description', label: 'Description', hint: 'e.g. Lecture component (optional)' }
];

const defaultFormValues: CourseTypeFormValues = {
    code: '',
    description: '',
    label: ''
};

export default function CourseTypeManagement() {
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const createMethods = useForm<CourseTypeFormValues>({
        defaultValues: defaultFormValues
    });
    const updateMethods = useForm<CourseTypeFormValues>({
        defaultValues: defaultFormValues
    });

    function triggerRefresh() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadIntoForm(id: string) {
        const result = await getCourseTypeById(id);

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

    const { columnDefs, tableActionConfig } = useCourseTypeTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchCourseTypes(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listCourseTypes(page, size, search, sort);
    }

    async function handleCreateSubmit(values: CourseTypeFormValues) {
        const result = await createCourseType(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            triggerRefresh();
        }
    }

    function handleCreateFormError(errors: FieldErrors<CourseTypeFormValues>) {
        formErrors(errors, createMethods);
    }

    async function handleUpdateSubmit(values: CourseTypeFormValues) {
        if (!selectedId) {
            return;
        }

        const result = await updateCourseType(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            triggerRefresh();
        }
    }

    function handleUpdateFormError(errors: FieldErrors<CourseTypeFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<CourseTypeListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic course types used across the system.',
                    title: 'Course Type Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.courseTypes
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
                            subheader: 'Fill in the details to create a new course type.',
                            title: 'Create Course Type'
                        }
                    },
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <CourseTypeForm
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
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <CourseTypeGridCard
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
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                updateModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Update the details of this course type.',
                            title: 'Edit Course Type'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <CourseTypeForm
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
                            subheader: 'Viewing course type details.',
                            title: 'View Course Type'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <CourseTypeForm
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
                onDeleteRow={deleteCourseType}
                onFetch={fetchCourseTypes}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<CourseTypeBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Course Types"
                onBulkImport={bulkCreateCourseTypes}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={function(row) {
                    return {
                        code: row.code,
                        description: row.description,
                        label: row.label
                    };
                }}
                onSuccess={triggerRefresh}
            />
        </div>
    );
}