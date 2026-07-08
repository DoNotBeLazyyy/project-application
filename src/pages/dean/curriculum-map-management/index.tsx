import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import TableCardControls from '@components/table-card/TableCardControls';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import CurriculumMapForm from '@pages/dean/curriculum-map-management/CurriculumMapForm';
import CurriculumTermTable from '@pages/dean/curriculum-map-management/CurriculumTermTable';
import { useCurriculumMapGrouped } from '@pages/dean/curriculum-map-management/useCurriculumMapGrouped';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { PrinterIcon } from '@phosphor-icons/react';
import {
    bulkCreateCurriculumMap, createCurriculumMapEntry, deleteCurriculumMapEntry, getCurriculumMap, updateCurriculumMapEntry
} from '@services/curriculum-map.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { CurriculumMapBulkRow, CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { formErrors } from '@utils/form.util';
import { useCallback, useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-curriculum-map-form';
const UPDATE_FORM_ID = 'update-curriculum-map-form';
const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'program_code', label: 'Program Code', hint: 'e.g. BSCS' },
    { key: 'course_code', label: 'Course Code', hint: 'e.g. CS101' },
    { key: 'year_level', label: 'Year Level', hint: 'e.g. 1' },
    { key: 'term_type_code', label: 'Term Type Code', hint: 'e.g. 1ST_SEM' },
    { key: 'school_year_code', label: 'School Year Code', hint: 'e.g. SY2024-2025 (optional)' },
    { key: 'sequence', label: 'Sequence', hint: 'e.g. 1' },
    { key: 'is_elective', label: 'Is Elective', hint: 'true or false' }
];

const defaultFormValues: CurriculumMapFormValues = {
    course_id: '',
    year_level: '',
    term_type_id: '',
    sequence: '1',
    is_elective: false
};

export default function CurriculumMapManagement() {
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');
    const [entries, setEntries] = useState<CurriculumMapEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<CurriculumMapEntry | null>(null);

    const { programOptions } = useProgramOptions();
    const { schoolYearOptions } = useSchoolYearOptions();
    const grouped = useCurriculumMapGrouped(entries);

    const createMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultFormValues
    });

    const updateMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultFormValues
    });

    const fetchCurriculum = useCallback(async function() {
        if (!selectedProgramId) {
            setEntries([]);
            return;
        }

        setIsLoading(true);
        const result = await getCurriculumMap(
            selectedProgramId,
            selectedSchoolYearId || undefined
        );

        if (result.data) {
            setEntries(result.data);
        }

        setIsLoading(false);
    }, [selectedProgramId, selectedSchoolYearId]);

    useEffect(function() {
        fetchCurriculum();
    }, [fetchCurriculum]);

    function handleOpenCreate() {
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(true);
    }

    function handleOpenUpdate(entry: CurriculumMapEntry) {
        setSelectedEntry(entry);
        updateMethods.reset({
            course_id: entry.course_id,
            year_level: String(entry.year_level),
            term_type_id: entry.term_type_id,
            sequence: String(entry.sequence),
            is_elective: entry.is_elective
        });
        setIsUpdateOpen(true);
    }

    function handleOpenView(entry: CurriculumMapEntry) {
        setSelectedEntry(entry);
        updateMethods.reset({
            course_id: entry.course_id,
            year_level: String(entry.year_level),
            term_type_id: entry.term_type_id,
            sequence: String(entry.sequence),
            is_elective: entry.is_elective
        });
        setIsViewOpen(true);
    }

    function handleCloseUpdate() {
        setIsUpdateOpen(false);
        setSelectedEntry(null);
        updateMethods.reset(defaultFormValues);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedEntry(null);
        updateMethods.reset(defaultFormValues);
    }

    async function handleCreateSubmit(values: CurriculumMapFormValues) {
        const result = await createCurriculumMapEntry(
            selectedProgramId,
            values,
            selectedSchoolYearId || undefined
        );

        if (!result.error) {
            setIsCreateOpen(false);
            createMethods.reset(defaultFormValues);
            fetchCurriculum();
        }
    }

    function handleCreateFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, createMethods);
    }

    async function handleUpdateSubmit(values: CurriculumMapFormValues) {
        if (!selectedEntry) return;

        const result = await updateCurriculumMapEntry(
            selectedEntry.id,
            values,
            selectedSchoolYearId || undefined
        );

        if (!result.error) {
            handleCloseUpdate();
            fetchCurriculum();
        }
    }

    function handleUpdateFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, updateMethods);
    }

    async function handleDelete(entryId: string) {
        const result = await deleteCurriculumMapEntry(entryId);

        if (!result.error) {
            fetchCurriculum();
        }
    }

    const selectedProgram = programOptions.find((option) => option.value === selectedProgramId);
    const selectedSchoolYear = schoolYearOptions.find((option) => option.value === selectedSchoolYearId);

    function renderCurriculumTable(term: {
        termTypeId: string;
        termTypeLabel: string;
        entries: CurriculumMapEntry[];
        totalUnits: number;
    }) {
        return (
            <CurriculumTermTable
                entries={term.entries}
                key={term.termTypeId}
                termTypeLabel={term.termTypeLabel}
                totalUnits={term.totalUnits}
                onDelete={handleDelete}
                onView={handleOpenView}
            />
        );
    }
    return (
        <CommonCard className="h-full">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                        <CommonSelect
                            fullWidth={false}
                            options={[{ label: 'Select Program', value: '' }, ...programOptions]}
                            size="large"
                            sx={{ minWidth: 280 }}
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(String(e.target.value))}
                        />
                        <CommonSelect
                            fullWidth={false}
                            options={[{ label: 'All School Years', value: '' }, ...schoolYearOptions]}
                            size="large"
                            sx={{ minWidth: 200 }}
                            value={selectedSchoolYearId}
                            onChange={(e) => setSelectedSchoolYearId(String(e.target.value))}
                        />
                    </div>
                    <TableCardControls
                        tableButtonsProps={{
                            createButtonProps: selectedProgramId
                                ? { onClick: handleOpenCreate }
                                : undefined,
                            uploadCsvButtonProps: {
                                onClick: function() {
                                    setIsBulkImportOpen(true);
                                }
                            },
                            downloadCsvButtonProps: {
                                onClick: function() {
                                    setIsBulkImportOpen(true);
                                }
                            },
                            extraButtons: (
                                <CommonButton
                                    color="inherit"
                                    disabled={!selectedProgramId || !entries.length}
                                    key="print"
                                    size="small"
                                    startIcon={<PrinterIcon weight="bold" />}
                                    variant="outlined"
                                    onClick={function() {
                                        window.print();
                                    }}
                                >
                                Print
                                </CommonButton>
                            )
                        }}
                    />
                </div>

                {!selectedProgramId
                    ? (
                        <div className="border border-(--mui-palette-divider) flex flex-1 flex-col gap-2 items-center justify-center rounded-lg">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            No program selected
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                            Select a program above to view its curriculum map
                            </span>
                        </div>
                    )
                    : isLoading
                        ? (
                            <div className="flex flex-1 items-center justify-center">
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                Loading curriculum...
                                </span>
                            </div>
                        )
                        : entries.length === 0
                            ? (
                                <div className="border border-(--mui-palette-divider) flex flex-1 flex-col gap-2 items-center justify-center rounded-lg">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    No curriculum entries found
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                    Add courses to build the curriculum map
                                    </span>
                                </div>
                            )
                            : (
                                <div className="curriculum-print-area flex flex-col gap-6 overflow-auto pb-8">
                                    <div className="flex flex-col gap-1 hidden print-only">
                                        <p className="font-bold text-center text-sm">
                                        Arellano University
                                        </p>
                                        <p className="text-center text-xs">
                                        Jose Abad Santos Campus
                                        </p>
                                        <p className="font-semibold mt-2 text-center text-sm">
                                            {selectedProgram?.label}
                                        </p>
                                        {selectedSchoolYear && (
                                            <p className="text-center text-xs">
                                            Effective SY {selectedSchoolYear.label}
                                            </p>
                                        )}
                                    </div>

                                    {grouped.map(function({ key, label, terms }) {
                                        return (
                                            <div className="flex flex-col gap-3" key={key}>
                                                <h2 className="font-bold text-(--mui-palette-text-primary) text-center text-sm tracking-widest uppercase">
                                                    {label}
                                                </h2>
                                                <div className="flex gap-4">
                                                    {terms.map((term) => renderCurriculumTable(term))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                }

                <CommonModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: 'Add a new course to the curriculum map.',
                            title: 'Add Curriculum Entry'
                        }
                    }}
                    open={isCreateOpen}
                    onClose={function() {
                        setIsCreateOpen(false);
                    }}
                >
                    <div className="flex flex-col gap-4">
                        <CurriculumMapForm
                            control={createMethods.control}
                            id={CREATE_FORM_ID}
                            onSubmit={createMethods.handleSubmit(
                                handleCreateSubmit,
                                handleCreateFormError
                            )}
                        />
                        <div className="flex gap-2 justify-end">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={function() {
                                    setIsCreateOpen(false);
                                }}
                            >
                            Cancel
                            </CommonButton>
                            <CommonButton
                                form={CREATE_FORM_ID}
                                size="small"
                                type="submit"
                                variant="contained"
                            >
                            Add Entry
                            </CommonButton>
                        </div>
                    </div>
                </CommonModal>

                <CommonModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: 'Update this curriculum map entry.',
                            title: 'Edit Curriculum Entry'
                        }
                    }}
                    open={isUpdateOpen}
                    onClose={handleCloseUpdate}
                >
                    <div className="flex flex-col gap-4">
                        <CurriculumMapForm
                            control={updateMethods.control}
                            id={UPDATE_FORM_ID}
                            onSubmit={updateMethods.handleSubmit(
                                handleUpdateSubmit,
                                handleUpdateFormError
                            )}
                        />
                        <div className="flex gap-2 justify-end">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={handleCloseUpdate}
                            >
                            Cancel
                            </CommonButton>
                            <CommonButton
                                form={UPDATE_FORM_ID}
                                size="small"
                                type="submit"
                                variant="contained"
                            >
                            Save
                            </CommonButton>
                        </div>
                    </div>
                </CommonModal>
                <CommonModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: 'Viewing curriculum map entry details.',
                            title: 'View Curriculum Entry'
                        }
                    }}
                    open={isViewOpen}
                    onClose={handleCloseView}
                >
                    <div className="flex flex-col gap-4 w-200">
                        <CurriculumMapForm
                            control={updateMethods.control}
                            disabled
                        />
                        <div className="flex gap-2 justify-end">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={handleCloseView}
                            >
                            Close
                            </CommonButton>
                            <CommonButton
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    setIsViewOpen(false);
                                    setIsUpdateOpen(true);
                                }}
                            >
                            Edit
                            </CommonButton>
                        </div>
                    </div>
                </CommonModal>

                <BulkImportModal<CurriculumMapBulkRow>
                    open={isBulkImportOpen}
                    templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                    title="Bulk Import Curriculum Map"
                    onBulkImport={bulkCreateCurriculumMap}
                    onClose={function() {
                        setIsBulkImportOpen(false);
                    }}
                    onMapRow={(row) => ({
                        program_code: row.program_code,
                        course_code: row.course_code,
                        year_level: row.year_level,
                        term_type_code: row.term_type_code,
                        school_year_code: row.school_year_code,
                        sequence: row.sequence,
                        is_elective: row.is_elective
                    })}
                    onSuccess={fetchCurriculum}
                />
            </div>
        </CommonCard>
    );
}