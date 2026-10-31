import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import ProgramFilterForm from '@pages/dean/program-management/ProgramFilterForm';
import ProgramGridCard from '@pages/dean/program-management/ProgramGridCard';
import ProgramWizardModal from '@pages/dean/program-management/ProgramWizardModal';
import { useProgramTableConfig } from '@pages/dean/program-management/useProgramTableConfig';
import {
    bulkCreatePrograms, bulkDeletePrograms, createProgram, deleteProgram, getProgramById, listPrograms, updateProgram
} from '@services/program/program.service';
import { useToastStore } from '@stores/toast.store';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import { ProgramBulkRow, ProgramFilterValues, ProgramFormValues, ProgramListRow } from '@type/program/program.type';
import { generateProgramCode } from '@utils/entity-code.util';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'name', label: 'Name' },
    { field: 'department_name', label: 'Department' },
    { field: 'program_level_label', label: 'Program Level' }
];

const FILTER_FORM_ID = 'filter-program-form';

const defaultFormValues: ProgramFormValues = {
    code: '',
    name: '',
    description: '',
    department_id: '',
    program_level_id: '',
    school_year_id: '',
    total_units: '',
    years_duration: '',
    is_active: true
};

// Mirrors fn_bulk_create_programs (one program per code, years 1-8; bulkCreatePrograms resolves
// department / program level by code or name) plus fn_bulk_create_curriculum_map for the optional curriculum
// columns - repeat the program columns on extra rows to map more courses to one program.
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    {
        key: 'code', label: 'Program Code', hint: 'Optional - new unique code, auto-generated from the name if blank, e.g. BSIT', sample: 'BSIT', required: false
    },
    {
        key: 'name', label: 'Program Name', hint: 'e.g. Bachelor of Science in Information Technology', sample: 'Bachelor of Science in Information Technology'
    },
    {
        key: 'department_code', label: 'Department Code', hint: 'Department code or name, e.g. COCS', sample: 'COCS'
    },
    {
        key: 'program_level_code', label: 'Program Level Code', hint: 'Program level code or name, e.g. UG or GRAD', sample: 'UG'
    },
    {
        key: 'years_duration', label: 'Years Duration', hint: 'Whole number from 1 to 8, e.g. 4', sample: '4'
    },
    {
        key: 'total_units', label: 'Total Units', hint: 'Optional number, e.g. 160', sample: '160', required: false
    },
    {
        key: 'description', label: 'Description', hint: 'Optional', sample: 'Four-year information technology degree program', required: false
    },
    {
        key: 'is_active', label: 'Is Active', hint: 'Optional - true or false, defaults to true', sample: 'true', required: false
    },
    {
        key: 'course_code', label: 'Course Code', hint: 'Optional curriculum entry - existing course of the same department, e.g. COCS101', sample: 'COCS101', required: false
    },
    {
        key: 'year_level', label: 'Year Level', hint: 'Curriculum year from 1 to 6, defaults to 1', sample: '1', required: false
    },
    {
        key: 'term_type_code', label: 'Term Type Code', hint: '1ST_SEM, 2ND_SEM or SUMMER (or the term type name), defaults to 1ST_SEM', sample: '1ST_SEM', required: false
    },
    {
        key: 'school_year_code', label: 'Curriculum Revision Year Code', hint: 'Optional existing school year code, e.g. AY-2026-2027', sample: '', required: false
    },
    {
        key: 'sequence', label: 'Sequence', hint: 'Optional whole number of 1 or more, defaults to 1', sample: '1', required: false
    },
    {
        key: 'is_elective', label: 'Is Elective', hint: 'Optional - true or false, defaults to false', sample: 'false', required: false
    }
];

export default function ProgramManagement() {
    const [activeFilters, setActiveFilters] = useState<ProgramFilterValues | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [editStep, setEditStep] = useState<number>(1);

    const createMethods = useForm<ProgramFormValues>({
        defaultValues: defaultFormValues
    });

    const filterMethods = useForm<ProgramFilterValues>({
        defaultValues: {
            department_ids: [],
            program_level_ids: [],
            is_active: 'All'
        }
    });

    const updateMethods = useForm<ProgramFormValues>({
        defaultValues: defaultFormValues
    });

    async function loadIntoForm(id: string) {
        const result = await getProgramById(id);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                name: result.data.name,
                department_id: result.data.department_id ?? '',
                program_level_id: result.data.program_level_id ?? '',
                school_year_id: (result.data as any).school_year_id ?? '',
                total_units: result.data.total_units ?? '',
                years_duration: result.data.years_duration ?? '',
                is_active: result.data.is_active ?? false,
                description: result.data.description ?? '',
                grading_periods: (result.data as any).grading_periods ?? []
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

    const { columnDefs, tableActionConfig } = useProgramTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchPrograms(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listPrograms(page, size, search, sort, activeFilters);
    }

    const showToast = useToastStore((state) => state.showToast);

    async function handleCreateSubmit(values: ProgramFormValues) {
        const result = await createProgram(values);

        if (!result.error) {
            showToast('Program and curriculum map saved successfully!', 'success');
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
        }
        else {
            showToast(result.error.message || 'Failed to save program', 'error');
        }
    }

    function handleFilterSubmit(values: ProgramFilterValues) {
        setActiveFilters(values);
    }

    function handleFilterReset() {
        filterMethods.reset();
        setActiveFilters(null);
    }

    async function handleUpdateSubmit(values: ProgramFormValues) {
        if (!selectedId) {
            return;
        }

        const result = await updateProgram(selectedId, {
            ...values,
            code: values.code.trim(),
            name: values.name.trim(),
            description: values.description
                ? values.description.trim()
                : ''
        });

        if (!result.error) {
            showToast('Program and curriculum map updated successfully!', 'success');
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
        }
        else {
            showToast(result.error.message || 'Failed to update program', 'error');
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<ProgramListRow>
                cardHeaderProps={{
                    subheader: 'Manage university programs and their details.',
                    title: 'Program Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.programs
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
                            subheader: 'Filter programs by department, level or status.',
                            title: 'Filter Programs'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formId: FILTER_FORM_ID,
                    formContent: (
                        <ProgramFilterForm
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
                        <ProgramGridCard
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
                onDelete={bulkDeletePrograms}
                onDeleteRow={deleteProgram}
                onFetch={fetchPrograms}
                onFilter={function() {
                    setIsFilterOpen(true);
                }}
                onRowClick={handleOpenView}
            />
            <BulkImportModal<ProgramBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                templateDownloadFilename="programs_template.csv"
                title="Bulk Import Programs"
                onBulkImport={bulkCreatePrograms}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    code: row.code?.trim() || generateProgramCode(row.name || ''),
                    name: row.name,
                    department_code: row.department_code,
                    program_level_code: row.program_level_code,
                    years_duration: row.years_duration,
                    total_units: row.total_units,
                    description: row.description,
                    is_active: row.is_active,
                    course_code: row.course_code,
                    year_level: row.year_level,
                    term_type_code: row.term_type_code,
                    school_year_code: row.school_year_code,
                    sequence: row.sequence,
                    is_elective: row.is_elective
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
                }}
            />

            {/* Create Program Wizard Modal */}
            {isCreateOpen && (
                <ProgramWizardModal
                    methods={createMethods}
                    open={isCreateOpen}
                    onClose={() => {
                        createMethods.reset(defaultFormValues);
                        setIsCreateOpen(false);
                    }}
                    onSubmit={handleCreateSubmit}
                />
            )}

            {/* Edit Program Wizard Modal */}
            {isUpdateOpen && (
                <ProgramWizardModal
                    initialStep={editStep}
                    isEditing
                    methods={updateMethods}
                    open={isUpdateOpen}
                    programId={selectedId ?? undefined}
                    onClose={handleCloseUpdate}
                    onSubmit={handleUpdateSubmit}
                />
            )}

            {/* View Program Wizard Modal */}
            {isViewOpen && (
                <ProgramWizardModal
                    methods={updateMethods}
                    open={isViewOpen}
                    programId={selectedId ?? undefined}
                    readOnly
                    onClose={handleCloseView}
                    onSubmit={function() {}}
                    onSwitchToEdit={function(step) {
                        if (selectedId) {
                            handleSwitchToEdit(selectedId, step);
                        }
                    }}
                />
            )}
        </div>
    );
}