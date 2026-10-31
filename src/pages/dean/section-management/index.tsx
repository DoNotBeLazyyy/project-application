import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import SectionFilterForm from '@pages/dean/section-management/SectionFilterForm';
import SectionGridCard from '@pages/dean/section-management/SectionGridCard';
import SectionWizardModal from '@pages/dean/section-management/SectionWizardModal';
import { useSectionTableConfig } from '@pages/dean/section-management/useSectionTableConfig';
import {
    bulkCreateSections,
    bulkDeleteSections,
    deleteSection,
    listSections
} from '@services/section.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import { SectionBulkRow, SectionFilterValues, SectionListRow } from '@type/section.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'section_code', label: 'Section Code' },
    { field: 'term_label', label: 'Term' },
    { field: 'program_code', label: 'Program' },
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'faculty_name', label: 'Faculty' }
];

const FILTER_FORM_ID = 'filter-section-form';

// Mirrors fn_bulk_create_sections: rows upsert by term + course + (section code or faculty),
// new sections always start Open, and a schedule needs days, start and end together.
// Grading periods are applied afterwards through saveSectionGradingOverride.
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'term_label', label: 'Term Label', hint: 'Optional - "<Term Type> - <School Year>" of the active academic year, e.g. 1st Semester - Academic Year 2026-2027; defaults to the first active term', sample: '1st Semester - Academic Year 2026-2027', required: false, aliases: ['term', 'semester']
    },
    {
        key: 'course_code', label: 'Course Code', hint: 'Exact existing course code, e.g. COCS102', sample: 'COCS102', aliases: ['course', 'subject_code']
    },
    {
        key: 'section_code', label: 'Section Code', hint: 'Optional - auto-generated as <COURSE>-001 if blank; an existing code in the term updates that section', sample: '', required: false, aliases: ['section']
    },
    {
        key: 'faculty_email', label: 'Faculty Email', hint: 'Optional - email of an existing user, e.g. faculty@example.com', sample: 'faculty@example.com', required: false, aliases: ['instructor_email', 'teacher_email', 'faculty']
    },
    {
        key: 'room', label: 'Room', hint: 'Optional, e.g. Room 301', sample: 'Room 301', required: false, aliases: ['classroom']
    },
    {
        key: 'max_slots', label: 'Max Slots', hint: 'Optional whole number from 1 to 999, defaults to 40', sample: '40', required: false, aliases: ['capacity', 'slots']
    },
    {
        key: 'schedule_days', label: 'Schedule Days', hint: 'Optional - days separated by commas, full or short names (Mon, Tue, Wed, Thu, Fri, Sat, Sun), e.g. Monday, Wednesday', sample: 'Monday, Wednesday', required: false, aliases: ['days', 'day']
    },
    {
        key: 'schedule_time_start', label: 'Schedule Start Time', hint: 'Required with schedule days - 24-hour HH:MM, e.g. 08:00', sample: '08:00', required: false, aliases: ['start_time', 'time_start']
    },
    {
        key: 'schedule_time_end', label: 'Schedule End Time', hint: 'Required with schedule days - 24-hour HH:MM after the start time, e.g. 10:00', sample: '10:00', required: false, aliases: ['end_time', 'time_end']
    },
    {
        key: 'schedule_room', label: 'Schedule Room', hint: 'Optional, defaults to Room', sample: 'Room 301', required: false
    },
    {
        key: 'grading_periods', label: 'Grading Periods Schema', hint: 'Optional - Period(Component:Weight,...) separated by ; with each period totalling 100, e.g. Prelim(Quizzes:30,Class Standing:30,Major Exam:40);Midterm(Quizzes:30,Class Standing:30,Major Exam:40)', sample: '', required: false
    }
];

export default function SectionManagement() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeFilters, setActiveFilters] = useState<SectionFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createFacultyId, setCreateFacultyId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const editSectionId = searchParams.get('editSectionId') || searchParams.get('edit');
    const isCreateParam = searchParams.get('createSection') === 'true' || searchParams.get('create') === 'true';
    const paramFacultyId = searchParams.get('facultyId');

    useEffect(() => {
        if (editSectionId) {
            setSelectedId(editSectionId);
            setIsUpdateOpen(true);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('editSectionId');
            nextParams.delete('edit');
            setSearchParams(nextParams, { replace: true });
        }
        else if (isCreateParam || paramFacultyId) {
            if (paramFacultyId) {
                setCreateFacultyId(paramFacultyId);
            }
            setIsCreateOpen(true);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('createSection');
            nextParams.delete('create');
            nextParams.delete('facultyId');
            setSearchParams(nextParams, { replace: true });
        }
    }, [editSectionId, isCreateParam, paramFacultyId, searchParams, setSearchParams]);

    const filterMethods = useForm<SectionFilterValues>({
        defaultValues: {
            term_ids: [],
            program_ids: [],
            course_ids: [],
            statuses: []
        }
    });

    function handleOpenView(id: string) {
        setSelectedId(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
    }

    function handleOpenUpdate(id: string) {
        setSelectedId(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedId(null);
    }

    const { columnDefs, tableActionConfig } = useSectionTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchSections(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listSections(page, size, search, sort, activeFilters);
    }

    function handleFilterSubmit(values: SectionFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<SectionListRow>
                cardHeaderProps={{
                    subheader: 'Manage sections and faculty assignments.',
                    title: 'Section Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.sections
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
                            subheader: 'Filter sections by term, course or status.',
                            title: 'Filter Sections'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <SectionFilterForm
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
                        <SectionGridCard
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
                onDelete={bulkDeleteSections}
                onDeleteRow={deleteSection}
                onFetch={fetchSections}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />

            {/* Create Wizard Modal */}
            <SectionWizardModal
                initialFacultyId={createFacultyId}
                open={isCreateOpen}
                onClose={function() {
                    setIsCreateOpen(false);
                    setCreateFacultyId(null);
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                    setCreateFacultyId(null);
                }}
            />

            {/* Edit Wizard Modal */}
            <SectionWizardModal
                open={isUpdateOpen}
                sectionId={selectedId}
                onClose={handleCloseUpdate}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                }}
            />

            {/* View Wizard Modal */}
            <SectionWizardModal
                open={isViewOpen}
                readOnly
                sectionId={selectedId}
                onClose={handleCloseView}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                }}
            />

            <BulkImportModal<SectionBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                templateDownloadFilename="sections_template.csv"
                title="Bulk Import Sections"
                onBulkImport={bulkCreateSections}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    course_code: row.course_code,
                    section_code: row.section_code,
                    faculty_email: row.faculty_email,
                    grading_periods: row.grading_periods,
                    max_slots: row.max_slots,
                    room: row.room,
                    schedule_days: row.schedule_days,
                    schedule_room: row.schedule_room,
                    schedule_time_end: row.schedule_time_end,
                    schedule_time_start: row.schedule_time_start,
                    term_label: row.term_label
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                }}
            />
        </div>
    );
}