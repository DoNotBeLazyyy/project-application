import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import EnrollmentFilterForm from '@pages/registrar/enrollment-management/EnrollmentFilterForm';
import EnrollmentForm from '@pages/registrar/enrollment-management/EnrollmentForm';
import { useEnrollmentTableConfig } from '@pages/registrar/enrollment-management/useEnrollmentTableConfig';
import {
    bulkCreateEnrollments, bulkDeleteEnrollments, createEnrollment, deleteEnrollment, getEnrollmentById, listEnrollments, updateEnrollment
} from '@services/enrollment.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { EnrollmentBulkRow, EnrollmentFilterValues, EnrollmentFormValues, EnrollmentListRow } from '@type/enrollment.type';
import { SortStringDto } from '@type/http.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'student_number', label: 'Student No.' },
    { field: 'student_name', label: 'Student Name' },
    { field: 'section_code', label: 'Section' },
    { field: 'course_code', label: 'Course' },
    { field: 'term_label', label: 'Term' }
];

const CREATE_FORM_ID = 'create-enrollment-form';
const UPDATE_FORM_ID = 'update-enrollment-form';
const FILTER_FORM_ID = 'filter-enrollment-form';

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'student_number', label: 'Student Number', hint: 'e.g. 2024-00001' },
    { key: 'term_label', label: 'Term Label', hint: 'e.g. 1st Semester - School Year 2026-2026' },
    { key: 'section_code', label: 'Section Code', hint: 'e.g. BSCS3-A' }
];

const defaultFormValues: EnrollmentFormValues = {
    student_id: '',
    section_id: '',
    status: 'Enrolled'
};

export default function EnrollmentManagement() {
    const [activeFilters, setActiveFilters] = useState<EnrollmentFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const createMethods = useForm<EnrollmentFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<EnrollmentFilterValues>({
        defaultValues: {
            term_ids: [],
            section_ids: [],
            statuses: []
        }
    });

    const updateMethods = useForm<EnrollmentFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getEnrollmentById(id);

        if (result.data) {
            updateMethods.reset({
                student_id: result.data.student_id,
                section_id: result.data.section_id,
                status: result.data.status
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

    const { columnDefs, tableActionConfig } = useEnrollmentTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchEnrollments(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listEnrollments(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: EnrollmentFormValues) {
        const result = await createEnrollment(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as EnrollmentFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<EnrollmentFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleFilterSubmit(values: EnrollmentFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    async function handleUpdateSubmit(values: EnrollmentFormValues) {
        if (!selectedId) return;

        const result = await updateEnrollment(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as EnrollmentFilterValues));
        }
    }

    function handleUpdateFormError(errors: FieldErrors<EnrollmentFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<EnrollmentListRow>
                cardHeaderProps={{
                    subheader: 'Manage student enrollments per section.',
                    title: 'Enrollment Management'
                }}
                controls={{
                    tableButtonsProps: {
                        downloadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        },
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
                            subheader: 'Enroll a student into a section.',
                            title: 'Create Enrollment'
                        }
                    },
                    containerClassName: 'w-120',
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <EnrollmentForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            isCreate
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
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter enrollments by term, section or status.',
                            title: 'Filter Enrollments'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <EnrollmentFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    open: isFilterOpen,
                    onClose: function() {
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
                            subheader: 'Update enrollment status.',
                            title: 'Edit Enrollment'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <EnrollmentForm
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
                            subheader: 'Viewing enrollment details.',
                            title: 'View Enrollment'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <EnrollmentForm
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
                onDelete={bulkDeleteEnrollments}
                onDeleteRow={deleteEnrollment}
                onFetch={fetchEnrollments}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<EnrollmentBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Enrollments"
                onBulkImport={bulkCreateEnrollments}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    student_number: row.student_number,
                    term_label: row.term_label,
                    section_code: row.section_code
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as EnrollmentFilterValues));
                }}
            />
        </div>
    );
}