import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import CopySectionSetupModal from '@pages/dean/section-management/CopySectionSetupModal';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'section_code', label: 'Section Code' },
    { field: 'term_label', label: 'Term' },
    { field: 'program_code', label: 'Program' },
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'faculty_name', label: 'Faculty' }
];

const FILTER_FORM_ID = 'filter-section-form';

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'term_label', label: 'Term Label', hint: 'e.g. 1st Semester - Academic Year 2025-2026 (optional, defaults to active term)' },
    { key: 'program_code', label: 'Program Code', hint: 'e.g. BSCS (optional)' },
    { key: 'course_code', label: 'Course Code', hint: 'e.g. CS 101LEC' },
    { key: 'section_code', label: 'Section Code', hint: 'e.g. BSCS 1-A (optional, auto-generated if blank)' },
    { key: 'faculty_email', label: 'Faculty Email', hint: 'e.g. juliustolentino.diamond@gmail.com (optional)' },
    { key: 'room', label: 'Room', hint: 'e.g. Room 301 (optional)' },
    { key: 'max_slots', label: 'Max Slots', hint: 'e.g. 40 (optional, defaults to 40)' },
    { key: 'status', label: 'Status', hint: 'e.g. Open (optional: Open, Full, Ongoing, Closed, Cancelled)' },
    { key: 'schedule_days', label: 'Schedule Days', hint: 'e.g. Monday, Wednesday (optional)' },
    { key: 'schedule_time_start', label: 'Schedule Start Time', hint: 'e.g. 08:00 (optional)' },
    { key: 'schedule_time_end', label: 'Schedule End Time', hint: 'e.g. 10:00 (optional)' },
    { key: 'schedule_room', label: 'Schedule Room', hint: 'e.g. Room 301 (optional)' },
    { key: 'preset_section', label: 'Preset Section (Code or Label)', hint: 'e.g. SEC-101 or BSCS 1-A (section code or label to copy preset grading schema from, optional)' },
    { key: 'override_grading_schema', label: 'Override Grading Schema', hint: 'e.g. true or false (optional)' },
    { key: 'grading_periods', label: 'Grading Periods Schema', hint: 'e.g. Prelim:30(Quizzes:30,Class Standing:30,Major Exam:40); Midterm:30(...); Final:40(...) or Prelim:30,Midterm:30,Final:40 (optional)' }
];

export default function SectionManagement() {
    const [activeFilters, setActiveFilters] = useState<SectionFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [copySourceId, setCopySourceId] = useState<string | null>(null);

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

    function handleOpenCopySetup(id: string) {
        setCopySourceId(id);
    }

    const { columnDefs, tableActionConfig } = useSectionTableConfig({
        onCopySetup: handleOpenCopySetup,
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
                            onCopySetup={handleOpenCopySetup}
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
                open={isCreateOpen}
                onClose={function() {
                    setIsCreateOpen(false);
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
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
                    override_grading_schema: row.override_grading_schema,
                    preset_section: row.preset_section || row.source_section_code,
                    program_code: row.program_code,
                    room: row.room,
                    schedule_days: row.schedule_days,
                    schedule_room: row.schedule_room,
                    schedule_time_end: row.schedule_time_end,
                    schedule_time_start: row.schedule_time_start,
                    source_section_code: row.source_section_code || row.preset_section,
                    status: row.status,
                    term_label: row.term_label
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                }}
            />

            <CopySectionSetupModal
                open={copySourceId !== null}
                sourceSectionId={copySourceId}
                onClose={function() {
                    setCopySourceId(null);
                }}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
                }}
            />
        </div>
    );
}