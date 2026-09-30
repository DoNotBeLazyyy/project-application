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
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { SortStringDto } from '@type/http.type';
import { ProgramBulkRow, ProgramFilterValues, ProgramFormValues, ProgramListRow } from '@type/program/program.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'name', label: 'Name' },
    { field: 'department_name', label: 'Department' },
    { field: 'program_level_label', label: 'Program Level' }
];

const CREATE_FORM_ID = 'create-program-form';
const UPDATE_FORM_ID = 'update-program-form';
const FILTER_FORM_ID = 'filter-program-form';

const defaultFormValues: ProgramFormValues = {
    code: '',
    name: '',
    description: '',
    department_id: '',
    program_level_id: '',
    total_units: '',
    years_duration: '',
    is_active: true
};

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'code', label: 'Code', hint: 'e.g. BSCS' },
    { key: 'name', label: 'Name', hint: 'e.g. Bachelor of Science in Computer Science' },
    { key: 'department_code', label: 'Department Code', hint: 'e.g. CCS' },
    { key: 'program_level_code', label: 'Program Level Code', hint: 'e.g. UNDERGRADUATE' },
    { key: 'years_duration', label: 'Years Duration', hint: 'e.g. 4' },
    { key: 'total_units', label: 'Total Units', hint: 'e.g. 170 (optional)' },
    { key: 'description', label: 'Description', hint: 'optional' },
    { key: 'is_active', label: 'Is Active', hint: 'true or false' }
];

export default function ProgramManagement() {
    const navigate = useNavigate();
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
                total_units: result.data.total_units ?? '',
                years_duration: result.data.years_duration ?? '',
                is_active: result.data.is_active ?? false,
                description: result.data.description ?? '',
                override_grading_schema: (result.data as any).override_grading_schema ?? false,
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

    async function handleSwitchToEdit(id: string, step: number = 1) {
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

    async function handleCreateSubmit(values: ProgramFormValues) {
        const result = await createProgram(values);

        if (!result.error) {
            createMethods.reset(defaultFormValues);
            setIsCreateOpen(false);
            setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
        }
    }

    function handleCreateFormError(errors: FieldErrors<ProgramFormValues>) {
        formErrors(errors, createMethods);
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

        const result = await updateProgram(selectedId, values);

        if (!result.error) {
            handleCloseUpdate();
            setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
        }
    }

    function handleUpdateFormError(errors: FieldErrors<ProgramFormValues>) {
        formErrors(errors, updateMethods);
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
                title="Bulk Import Programs"
                onBulkImport={bulkCreatePrograms}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={(row) => ({
                    code: row.code,
                    name: row.name,
                    department_code: row.department_code,
                    program_level_code: row.program_level_code,
                    years_duration: row.years_duration,
                    total_units: row.total_units,
                    description: row.description,
                    is_active: row.is_active
                })}
                onSuccess={function() {
                    setActiveFilters((prev) => ({ ...prev } as ProgramFilterValues));
                }}
            />

            {/* Create Program Wizard Modal */}
            <ProgramWizardModal
                open={isCreateOpen}
                methods={createMethods}
                onClose={() => {
                    createMethods.reset(defaultFormValues);
                    setIsCreateOpen(false);
                }}
                onSubmit={handleCreateSubmit}
            />

            {/* Edit Program Wizard Modal */}
            <ProgramWizardModal
                open={isUpdateOpen}
                initialStep={editStep}
                isEditing
                programId={selectedId ?? undefined}
                methods={updateMethods}
                onClose={handleCloseUpdate}
                onSubmit={handleUpdateSubmit}
            />

            {/* View Program Wizard Modal */}
            <ProgramWizardModal
                open={isViewOpen}
                readOnly
                programId={selectedId ?? undefined}
                methods={updateMethods}
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