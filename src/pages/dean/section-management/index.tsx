import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import CopySectionSetupModal from '@pages/dean/section-management/CopySectionSetupModal';
import SectionFilterForm from '@pages/dean/section-management/SectionFilterForm';
import SectionForm from '@pages/dean/section-management/SectionForm';
import { useSectionTableConfig } from '@pages/dean/section-management/useSectionTableConfig';
import {
    bulkCreateSections, bulkDeleteSections, createSection, deleteSection, getSectionById, listSections, updateSection
} from '@services/section.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import { SectionBulkRow, SectionFilterValues, SectionFormValues, SectionListRow } from '@type/section.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'section_code', label: 'Section Code' },
    { field: 'term_label', label: 'Term' },
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'faculty_name', label: 'Faculty' }
];

const CREATE_FORM_ID = 'create-section-form';
const UPDATE_FORM_ID = 'update-section-form';
const FILTER_FORM_ID = 'filter-section-form';

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'term_label', label: 'Term Label', hint: 'e.g. 1st Semester 2024-2025' },
    { key: 'course_code', label: 'Course Code', hint: 'e.g. CS101' },
    { key: 'faculty_email', label: 'Faculty Email', hint: 'e.g. jdoe@university.edu (optional)' },
    { key: 'section_code', label: 'Section Code', hint: 'e.g. BSCS3-A' },
    { key: 'room', label: 'Room', hint: 'e.g. Room 301 (optional)' },
    { key: 'max_slots', label: 'Max Slots', hint: 'e.g. 40 (optional, defaults to 40)' }
];

const defaultFormValues: SectionFormValues = {
    term_id: '',
    course_id: '',
    faculty_id: '',
    section_code: '',
    room: '',
    max_slots: '40',
    status: 'Open'
};

export default function SectionManagement() {
    const [activeFilters, setActiveFilters] = useState<SectionFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [copySourceId, setCopySourceId] = useState<string | null>(null);

    const createMethods = useForm<SectionFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<SectionFilterValues>({
        defaultValues: {
            term_ids: [],
            course_ids: [],
            statuses: []
        }
    });

    const updateMethods = useForm<SectionFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getSectionById(id);

        if (result.data) {
            updateMethods.reset({
                term_id: result.data.term_id,
                course_id: result.data.course_id,
                faculty_id: result.data.faculty_id ?? '',
                section_code: result.data.section_code,
                room: result.data.room ?? '',
                max_slots: String(result.data.max_slots),
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

    async function handleCreateSubmit(values: SectionFormValues) {
        const result = await createSection(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<SectionFormValues>) {
        formErrors(errors, createMethods);
    }

    function handleFilterSubmit(values: SectionFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: SectionFormValues) {
        if (!selectedId) return;

        const result = await updateSection(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as SectionFilterValues));
        }
    }

    function handleUpdateFormError(errors: FieldErrors<SectionFormValues>) {
        formErrors(errors, updateMethods);
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
                            subheader: 'Fill in the details to create a new section.',
                            title: 'Create Section'
                        }
                    },
                    containerClassName: 'w-160',
                    formId: CREATE_FORM_ID,
                    formContent: (
                        <SectionForm
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
                            subheader: 'Update the details of this section.',
                            title: 'Edit Section'
                        }
                    },
                    confirmText: 'Save',
                    formId: UPDATE_FORM_ID,
                    formContent: (
                        <SectionForm
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
                            subheader: 'Viewing section details.',
                            title: 'View Section'
                        }
                    },
                    confirmText: 'Edit',
                    formContent: (
                        <SectionForm
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
                onDelete={bulkDeleteSections}
                onDeleteRow={deleteSection}
                onFetch={fetchSections}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
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
                    term_label: row.term_label,
                    course_code: row.course_code,
                    faculty_email: row.faculty_email,
                    section_code: row.section_code,
                    room: row.room,
                    max_slots: row.max_slots
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