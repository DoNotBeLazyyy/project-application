import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import CourseFilterForm from '@pages/dean/course-management/CourseFilterForm';
import CourseGridCard from '@pages/dean/course-management/CourseGridCard';
import CourseWizardModal from '@pages/dean/course-management/CourseWizardModal';
import { useCourseTableConfig } from '@pages/dean/course-management/useCourseTableConfig';
import { normalizeMinimumGrade } from '@pages/dean/course-management/useMinimumGradeOptions';
import {
    bulkCreateCourses, bulkDeleteCourses, createCourse, deleteCourse, getCourseById, listCourses, updateCourse
} from '@services/course/course.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import {
    CourseBulkRow, CourseFilterValues, CourseFormValues, CourseListRow, PrerequisiteRow
} from '@type/course/course.type';
import { SortStringDto } from '@type/http.type';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'title', label: 'Title' },
    { field: 'department_name', label: 'Department' },
    { field: 'course_type_label', label: 'Course Type' }
];

const FILTER_FORM_ID = 'filter-course-form';
// Mirrors fn_bulk_create_courses: rows are upserted by code, department and course type
// resolve by code or name, and at least one of lecture/laboratory units must be above 0.
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'code', label: 'Course Code', hint: 'Optional - leave blank to auto-generate; an existing code updates that course', sample: '', required: false, aliases: ['course', 'subject_code', 'code']
    },
    {
        key: 'title', label: 'Course Title', hint: 'e.g. Introduction to Computing', sample: 'Introduction to Computing', aliases: ['course_title', 'name', 'title']
    },
    {
        key: 'department_code', label: 'Department Code', hint: 'Department code or name, e.g. COCS', sample: 'COCS', aliases: ['department', 'dept_code', 'dept']
    },
    {
        key: 'course_type_code', label: 'Course Type Code', hint: 'Course type code or name, e.g. LEC (Lecture) or LAB (Laboratory)', sample: 'LEC', aliases: ['course_type', 'type_code', 'type']
    },
    {
        key: 'lecture_units', label: 'Lecture Units', hint: '0 to 10 (blank = 0); lecture or laboratory units must be above 0', sample: '3', required: false, aliases: ['lec_units', 'lecture']
    },
    {
        key: 'laboratory_units', label: 'Laboratory Units', hint: '0 to 10 (blank = 0); lecture or laboratory units must be above 0', sample: '0', required: false, aliases: ['lab_units', 'lab', 'laboratory']
    },
    {
        key: 'credit_hours', label: 'Credit Hours', hint: 'Optional number, e.g. 3', sample: '3', required: false, aliases: ['hours']
    },
    {
        key: 'description', label: 'Description', hint: 'Optional', sample: 'Foundational computing concepts and programming paradigms', required: false
    },
    {
        key: 'is_active', label: 'Is Active', hint: 'Optional - false, no, 0 or inactive marks it inactive; defaults to true', sample: 'true', required: false, aliases: ['active', 'status']
    },
    {
        key: 'prerequisites', label: 'Prerequisites', hint: 'Optional - CODE:Type:MinGrade separated by |, Type is Required, Co-requisite or Recommended, e.g. COCS101:Required:3.00|COCS102:Co-requisite', sample: 'COCS101:Required:3.00', required: false, aliases: ['prereq', 'prereqs']
    }
];

const defaultFormValues: CourseFormValues = {
    code: '',
    title: '',
    description: '',
    department_id: '',
    course_types: [
        {
            course_type_id: '', units: '' as any, credit_hours: '' as any
        }
    ],
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
    const [editStep, setEditStep] = useState<number>(1);

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
            const rawTypes = (result.data as { course_types?: { course_type_id: string; units: number; credit_hours: number }[] }).course_types;
            const fallbackTypes = result.data.course_type_id
                ? [
                    {
                        course_type_id: result.data.course_type_id,
                        units: result.data.laboratory_units ?? result.data.lecture_units ?? ('' as any),
                        credit_hours: result.data.credit_hours ?? result.data.lecture_units ?? ('' as any)
                    }
                ]
                : [{
                    course_type_id: '', units: '' as any, credit_hours: '' as any
                }];

            updateMethods.reset({
                code: result.data.code,
                title: result.data.title,
                description: result.data.description ?? '',
                department_id: result.data.department_id,
                course_types: rawTypes?.length
                    ? rawTypes
                    : fallbackTypes,
                is_active: result.data.is_active,
                prerequisites: (result.data.prerequisites as PrerequisiteRow[])?.map((prereq) => ({
                    course_id: prereq.course_id ?? '',
                    prerequisite_type: prereq.prerequisite_type,
                    prerequisite_kind: prereq.prerequisite_kind ?? 'course',
                    year_level_required: prereq.year_level_required
                        ? String(prereq.year_level_required)
                        : '',
                    minimum_grade: normalizeMinimumGrade(prereq.minimum_grade)
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
        setEditStep(1);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string, step = 1) {
        setIsViewOpen(false);
        setEditStep(step);
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
        const result = await createCourse({
            ...values,
            title: values.title.trim(),
            description: values.description
                ? values.description.trim()
                : ''
        });

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as CourseFilterValues));
        }
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

        const result = await updateCourse(selectedId, {
            ...values,
            title: values.title.trim(),
            description: values.description
                ? values.description.trim()
                : ''
        });

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as CourseFilterValues));
        }
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
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
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
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <CourseGridCard
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
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
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
                previewLayout="card"
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                templateDownloadFilename="courses_template.csv"
                title="Bulk Import Courses"
                onBulkImport={bulkCreateCourses}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    // A blank code is generated by bulkCreateCourses against the live course codes
                    code: row.code?.trim() ?? '',
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

            {/* Create Course Wizard Modal */}
            <CourseWizardModal
                methods={createMethods}
                open={isCreateOpen}
                onClose={function() {
                    createMethods.reset(defaultFormValues);
                    setIsCreateOpen(false);
                }}
                onSubmit={handleCreateSubmit}
            />

            {/* Edit Course Wizard Modal */}
            <CourseWizardModal
                courseId={selectedId}
                initialStep={editStep}
                isCodeDisabled
                methods={updateMethods}
                open={isUpdateOpen}
                onClose={handleCloseUpdate}
                onSubmit={handleUpdateSubmit}
            />

            {/* View Course Wizard Modal */}
            <CourseWizardModal
                courseId={selectedId}
                methods={updateMethods}
                open={isViewOpen}
                readOnly
                onClose={handleCloseView}
                onSubmit={function() {}}
                onSwitchToEdit={function(step) {
                    if (selectedId) {
                        handleSwitchToEdit(selectedId, step);
                    }
                }}
            />
        </div>
    );
}