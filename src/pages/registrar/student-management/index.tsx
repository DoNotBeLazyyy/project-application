import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import StudentFilterForm from '@pages/registrar/student-management/StudentFilterForm';
import StudentForm from '@pages/registrar/student-management/StudentForm';
import { useStudentTableConfig } from '@pages/registrar/student-management/useStudentTableConfig';
import {
    bulkCreateStudents, bulkDeleteStudents, createStudent, deleteStudent, evaluateStudentYearLevel, getStudentById, listStudents, updateStudent
} from '@services/student.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import { StudentBulkRow, StudentFilterValues, StudentFormValues, StudentListRow } from '@type/student.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'student_number', label: 'Student No.' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'first_name', label: 'First Name' },
    { field: 'email', label: 'Email' },
    { field: 'program_code', label: 'Program' },
    { field: 'year_level', label: 'Year Level' }
];

const CREATE_FORM_ID = 'create-student-form';
const UPDATE_FORM_ID = 'update-student-form';
const FILTER_FORM_ID = 'filter-student-form';

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'email', label: 'Email', hint: 'e.g. juan.dela.cruz@email.com' },
    { key: 'student_number', label: 'Student Number', hint: 'e.g. 2024-00001' },
    { key: 'program_code', label: 'Program Code', hint: 'e.g. BSCS (optional)' },
    { key: 'year_level', label: 'Year Level', hint: 'e.g. 1 (optional, defaults to 1)' },
    { key: 'admitted_at', label: 'Admitted At', hint: 'e.g. 2024-06-01 (optional)' }
];

const defaultFormValues: StudentFormValues = {
    user_id: '',
    student_number: '',
    program_id: '',
    year_level: '1',
    admitted_at: '',
    status: 'Active'
};

export default function StudentManagement() {
    const navigate = useNavigate();
    const [activeFilters, setActiveFilters] = useState<StudentFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const createMethods = useForm<StudentFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<StudentFilterValues>({
        defaultValues: {
            program_ids: [],
            year_levels: [],
            statuses: []
        }
    });

    const updateMethods = useForm<StudentFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getStudentById(id);

        if (result.data) {
            updateMethods.reset({
                user_id: result.data.user_id,
                student_number: result.data.student_number,
                program_id: result.data.program_id ?? '',
                year_level: String(result.data.year_level),
                admitted_at: result.data.admitted_at ?? '',
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

    async function handleEvaluate(id: string) {
        await evaluateStudentYearLevel(id);
        setActiveFilters((prev) => ({ ...prev } as StudentFilterValues));
    }

    function handleViewRecords(id: string) {
        navigate(`/registrar/student-management/${id}/records`);
    }

    const { columnDefs, tableActionConfig } = useStudentTableConfig({
        onEdit: handleOpenUpdate,
        onEvaluate: handleEvaluate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView,
        onViewRecords: handleViewRecords
    });

    async function fetchStudents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listStudents(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: StudentFormValues) {
        const result = await createStudent(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as StudentFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<StudentFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleFilterSubmit(values: StudentFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: StudentFormValues) {
        if (!selectedId) return;

        const result = await updateStudent(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as StudentFilterValues));
        }
    }

    function handleUpdateFormError(errors: FieldErrors<StudentFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<StudentListRow>
                cardHeaderProps={{
                    subheader: 'Manage student profiles and academic standing.',
                    title: 'Student Management'
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
                            subheader: 'Attach a student profile to an existing user.',
                            title: 'Create Student Profile'
                        }
                    },
                    containerClassName: 'w-160',
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <StudentForm
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
                            subheader: 'Filter students by program, year level or status.',
                            title: 'Filter Students'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <StudentFilterForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    onReset: handleFilterReset,
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
                            subheader: 'Update student profile details.',
                            title: 'Edit Student Profile'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <StudentForm
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
                            subheader: 'Viewing student profile details.',
                            title: 'View Student Profile'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <StudentForm
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
                onDelete={bulkDeleteStudents}
                onDeleteRow={deleteStudent}
                onFetch={fetchStudents}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<StudentBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Students"
                onBulkImport={bulkCreateStudents}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    email: row.email,
                    student_number: row.student_number,
                    program_code: row.program_code,
                    year_level: row.year_level,
                    admitted_at: row.admitted_at
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as StudentFilterValues));
                }}
            />
        </div>
    );
}