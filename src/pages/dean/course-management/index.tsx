import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import CourseFilterForm from '@pages/dean/course-management/CourseFilterForm';
import CourseForm from '@pages/dean/course-management/CourseForm';
import { useCourseTableConfig } from '@pages/dean/course-management/useCourseTableConfig';
import {
    bulkCreateCourses, bulkDeleteCourses, createCourse, deleteCourse, getCourseById, listCourses, updateCourse
} from '@services/course/course.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import {
    CourseBulkRow, CourseFilterValues, CourseFormValues, CourseListRow, PrerequisiteRow
} from '@type/course/course.type';
import { SortStringDto } from '@type/http.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'title', label: 'Title' },
    { field: 'department_name', label: 'Department' },
    { field: 'course_type_label', label: 'Course Type' }
];

const CREATE_FORM_ID = 'create-course-form';
const UPDATE_FORM_ID = 'update-course-form';
const FILTER_FORM_ID = 'filter-course-form';
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'code', label: 'Code', hint: 'e.g. CS101' },
    { key: 'title', label: 'Title', hint: 'e.g. Introduction to Computing' },
    { key: 'department_code', label: 'Department Code', hint: 'e.g. CCS' },
    { key: 'course_type_code', label: 'Course Type Code', hint: 'e.g. LECTURE' },
    { key: 'lecture_units', label: 'Lecture Units', hint: 'e.g. 3' },
    { key: 'laboratory_units', label: 'Laboratory Units', hint: 'e.g. 0' },
    { key: 'credit_hours', label: 'Credit Hours', hint: 'e.g. 3 (optional)' },
    { key: 'description', label: 'Description', hint: 'optional' },
    { key: 'is_active', label: 'Is Active', hint: 'true or false' },
    { key: 'prerequisites', label: 'Prerequisites', hint: 'e.g. CS100:Required:2.0|MATH101:Co-requisite: (optional)' }
];

const defaultFormValues: CourseFormValues = {
    code: '',
    title: '',
    description: '',
    department_id: '',
    course_type_id: '',
    is_split: false,
    lecture_units: '',
    laboratory_units: '',
    credit_hours: '',
    is_active: true,
    prerequisites: []
};

export default function CourseManagement() {
    const [activeFilters, setActiveFilters] = useState<CourseFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const createMethods = useForm<CourseFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<CourseFilterValues>({
        defaultValues: {
            department_ids: [],
            course_type_ids: [],
            is_active: 'All'
        }
    });

    const updateMethods = useForm<CourseFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getCourseById(id);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                title: result.data.title,
                description: result.data.description ?? '',
                department_id: result.data.department_id,
                course_type_id: result.data.course_type_id,
                is_split: Number(result.data.laboratory_units) > 0 || (result.data as { is_split?: boolean }).is_split === true,
                lecture_units: String(result.data.lecture_units ?? '0'),
                laboratory_units: result.data.laboratory_units != null
                    ? String(result.data.laboratory_units)
                    : '',
                credit_hours: result.data.credit_hours
                    ? String(result.data.credit_hours)
                    : '',
                is_active: result.data.is_active,
                prerequisites: (result.data.prerequisites as PrerequisiteRow[]).map((prereq) => ({
                    course_id: prereq.course_id ?? '',
                    prerequisite_type: prereq.prerequisite_type,
                    prerequisite_kind: prereq.prerequisite_kind ?? 'course',
                    year_level_required: prereq.year_level_required
                        ? String(prereq.year_level_required)
                        : '',
                    minimum_grade: prereq.minimum_grade ?? ''
                })) ?? []
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

    const { columnDefs, tableActionConfig } = useCourseTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchCourses(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listCourses(page, size, search, sort, activeFilters);
    }

    async function handleCreateSubmit(values: CourseFormValues) {
        const result = await createCourse(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as CourseFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<CourseFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleFilterSubmit(values: CourseFilterValues) {
        setActiveFilters(values);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: CourseFormValues) {
        if (!selectedId) return;

        const result = await updateCourse(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as CourseFilterValues));
        }
    }

    function handleUpdateFormError(errors: FieldErrors<CourseFormValues>) {
        formErrors(errors, updateMethods);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<CourseListRow>
                cardHeaderProps={{
                    subheader: 'Manage courses and their prerequisites.',
                    title: 'Course Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.courses
                    },
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
                            subheader: 'Fill in the details to create a new course.',
                            title: 'Create Course'
                        }
                    },
                    containerClassName: 'w-250',
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <CourseForm
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
                dependencies={[activeFilters]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter courses by department, type or status.',
                            title: 'Filter Courses'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <CourseFilterForm
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
                            subheader: 'Update the details of this course.',
                            title: 'Edit Course'
                        }
                    },
                    confirmText: 'Save',
                    containerClassName: 'w-250',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <CourseForm
                            control={updateMethods.control}
                            excludeCourseId={selectedId ?? undefined}
                            id={UPDATE_FORM_ID}
                            isCodeDisabled
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
                            subheader: 'Viewing course details.',
                            title: 'View Course'
                        }
                    },
                    containerClassName: 'w-250',
                    confirmText: 'Edit',
                    formContent: (
                        <CourseForm
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
                onDelete={bulkDeleteCourses}
                onDeleteRow={deleteCourse}
                onFetch={fetchCourses}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<CourseBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Courses"
                onBulkImport={bulkCreateCourses}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    code: row.code,
                    title: row.title,
                    department_code: row.department_code,
                    course_type_code: row.course_type_code,
                    lecture_units: row.lecture_units,
                    laboratory_units: row.laboratory_units,
                    credit_hours: row.credit_hours,
                    description: row.description,
                    is_active: row.is_active,
                    prerequisites: row.prerequisites
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as CourseFilterValues));
                }}
            />
        </div>
    );
}