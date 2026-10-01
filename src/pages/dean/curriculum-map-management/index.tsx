import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonModal from '@components/modal/CommonModal';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonSelect from '@components/select/CommonSelect';
import TableCardControls from '@components/table-card/TableCardControls';
import { PrinterIcon } from '@phosphor-icons/react';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
import CurriculumMapForm from '@pages/dean/curriculum-map-management/CurriculumMapForm';
import CurriculumTermTable from '@pages/dean/curriculum-map-management/CurriculumTermTable';
import { useCurriculumMapGrouped } from '@pages/dean/curriculum-map-management/useCurriculumMapGrouped';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import {
    createCurriculumMapEntry, deleteCurriculumMapEntry, getCurriculumMap, updateCurriculumMapEntry
} from '@services/curriculum-map.service';
import { listCourses } from '@services/course/course.service';
import { BulkImportResult, CsvTemplateColumn } from '@type/bulk-import.type';
import { CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { formErrors } from '@utils/form.util';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-curriculum-map-form';
const UPDATE_FORM_ID = 'update-curriculum-map-form';

const CURRICULUM_MAP_CSV_COLUMNS: CsvTemplateColumn[] = [
    { key: 'course_code', label: 'Course Code', hint: 'e.g. CS101' },
    { key: 'year_level', label: 'Year Level', hint: 'e.g. 1' },
    { key: 'term_type_code', label: 'Term Type Code', hint: 'e.g. 1ST_TRIMESTER (optional)' },
    { key: 'sequence', label: 'Sequence', hint: 'e.g. 1 (optional)' },
    { key: 'is_elective', label: 'Is Elective', hint: 'true or false (optional)' }
];

interface CurriculumMapCsvRow {
    course_code: string;
    year_level: string;
    term_type_code?: string;
    sequence?: string;
    is_elective?: string;
}

const defaultFormValues: CurriculumMapFormValues = {
    course_id: '',
    year_level: '',
    term_type_id: '',
    sequence: '1',
    is_elective: false
};

interface CurriculumMapManagementProps {
    programId?: string;
    schoolYearId?: string;
    readOnly?: boolean;
    hideProgramSelect?: boolean;
    onChangeEntries?: (entries: CurriculumMapEntry[]) => void;
}

export default function CurriculumMapManagement({
    programId = '',
    schoolYearId = '',
    readOnly = false,
    hideProgramSelect = false,
    onChangeEntries
}: CurriculumMapManagementProps = {}) {
    const [selectedProgramId, setSelectedProgramId] = useState(programId);
    const [selectedSchoolYearId, setSelectedSchoolYearId] = useState(schoolYearId);
    const [selectedTermTypeId, setSelectedTermTypeId] = useState('');
    const [entries, setEntries] = useState<CurriculumMapEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printTermTypeIds, setPrintTermTypeIds] = useState<string[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<CurriculumMapEntry | null>(null);

    const { programOptions } = useProgramOptions();
    const { activeSchoolYearId, schoolYearOptions } = useSchoolYearOptions();
    const { termTypeOptions } = useTermTypeOptions();

    useEffect(() => {
        if (termTypeOptions.length > 0 && !selectedTermTypeId) {
            setSelectedTermTypeId(String(termTypeOptions[0].value));
        }
        if (termTypeOptions.length > 0 && printTermTypeIds.length === 0) {
            setPrintTermTypeIds(termTypeOptions.map((t) => String(t.value)));
        }
    }, [termTypeOptions, selectedTermTypeId, printTermTypeIds.length]);

    function handleTogglePrintTerm(termId: string) {
        setPrintTermTypeIds((prev) =>
            prev.includes(termId) ? prev.filter((id) => id !== termId) : [...prev, termId]
        );
    }

    function handleSelectAllPrintTerms() {
        setPrintTermTypeIds(termTypeOptions.map((t) => String(t.value)));
    }

    function handleDeselectAllPrintTerms() {
        setPrintTermTypeIds([]);
    }

    function handleConfirmPrint() {
        setIsPrintModalOpen(false);
        setTimeout(() => {
            window.print();
        }, 150);
    }

    const filteredEntries = useMemo(() => {
        if (!selectedTermTypeId) return entries;
        return entries.filter((entry) => entry.term_type_id === selectedTermTypeId);
    }, [entries, selectedTermTypeId]);

    const grouped = useCurriculumMapGrouped(filteredEntries);

    const printEntries = useMemo(() => {
        if (printTermTypeIds.length === 0) return entries;
        return entries.filter((entry) => printTermTypeIds.includes(entry.term_type_id));
    }, [entries, printTermTypeIds]);

    const printGrouped = useCurriculumMapGrouped(printEntries);

    const onChangeEntriesRef = useRef(onChangeEntries);
    useEffect(() => {
        onChangeEntriesRef.current = onChangeEntries;
    }, [onChangeEntries]);

    useEffect(() => {
        if (programId) {
            setSelectedProgramId(programId);
        }
    }, [programId]);

    useEffect(() => {
        if (schoolYearId) {
            setSelectedSchoolYearId(schoolYearId);
        } else if (activeSchoolYearId && !selectedSchoolYearId) {
            setSelectedSchoolYearId(activeSchoolYearId);
        }
    }, [schoolYearId, activeSchoolYearId]);

    function updateEntriesState(newEntries: CurriculumMapEntry[]) {
        setEntries(newEntries);
        onChangeEntriesRef.current?.(newEntries);
    }

    const createMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultFormValues
    });

    const updateMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultFormValues
    });

    const fetchCurriculum = useCallback(async function() {
        if (!selectedProgramId) {
            return;
        }

        setIsLoading(true);
        const result = await getCurriculumMap(
            selectedProgramId,
            selectedSchoolYearId || undefined
        );

        if (result.data) {
            setEntries(result.data);
            onChangeEntriesRef.current?.(result.data);
        }

        setIsLoading(false);
    }, [selectedProgramId, selectedSchoolYearId]);

    useEffect(function() {
        if (selectedProgramId) {
            fetchCurriculum();
        }
    }, [fetchCurriculum, selectedProgramId]);

    function handleOpenCreate() {
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(true);
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
        if (selectedProgramId) {
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
        } else {
            const listRes = await listCourses(1, 1000, '', [], null);
            const courses = listRes.data?.items ?? [];
            const course = courses.find((c) => c.id === values.course_id);
            const termTypeObj = termTypeOptions.find((t) => t.value === values.term_type_id);

            const newEntry: CurriculumMapEntry = {
                id: `temp-${Date.now()}-${Math.random()}`,
                course_id: values.course_id,
                course_code: course?.code ?? '',
                course_title: course?.title ?? '',
                lecture_units: course?.lecture_units ?? 0,
                laboratory_units: course?.laboratory_units ?? 0,
                total_units: course?.total_units ?? 0,
                year_level: Number(values.year_level),
                term_type_id: values.term_type_id,
                term_type_label: termTypeObj?.label ?? '',
                term_type_code: termTypeObj?.label ?? '',
                term_type_sequence: 1,
                school_year_id: selectedSchoolYearId || null,
                sequence: Number(values.sequence),
                is_elective: values.is_elective,
                prerequisites: []
            };

            updateEntriesState([...entries, newEntry]);
            setIsCreateOpen(false);
            createMethods.reset(defaultFormValues);
        }
    }

    function handleCreateFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, createMethods);
    }

    async function handleUpdateSubmit(values: CurriculumMapFormValues) {
        if (!selectedEntry) return;

        if (selectedProgramId) {
            const result = await updateCurriculumMapEntry(
                selectedEntry.id,
                values,
                selectedSchoolYearId || undefined
            );

            if (!result.error) {
                handleCloseUpdate();
                fetchCurriculum();
            }
        } else {
            const listRes = await listCourses(1, 1000, '', [], null);
            const courses = listRes.data?.items ?? [];
            const course = courses.find((c) => c.id === values.course_id);
            const termTypeObj = termTypeOptions.find((t) => t.value === values.term_type_id);

            const updatedEntries = entries.map((entry) => {
                if (entry.id !== selectedEntry.id) return entry;
                return {
                    ...entry,
                    course_id: values.course_id,
                    course_code: course?.code ?? entry.course_code,
                    course_title: course?.title ?? entry.course_title,
                    lecture_units: course?.lecture_units ?? entry.lecture_units,
                    laboratory_units: course?.laboratory_units ?? entry.laboratory_units,
                    total_units: course?.total_units ?? entry.total_units,
                    year_level: Number(values.year_level),
                    term_type_id: values.term_type_id,
                    term_type_label: termTypeObj?.label ?? entry.term_type_label,
                    term_type_code: termTypeObj?.label ?? entry.term_type_code,
                    sequence: Number(values.sequence),
                    is_elective: values.is_elective
                };
            });

            updateEntriesState(updatedEntries);
            handleCloseUpdate();
        }
    }

    function handleUpdateFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, updateMethods);
    }

    async function handleDelete(entryId: string) {
        if (selectedProgramId) {
            const result = await deleteCurriculumMapEntry(entryId);
            if (!result.error) {
                fetchCurriculum();
            }
        } else {
            updateEntriesState(entries.filter((entry) => entry.id !== entryId));
        }
    }

    async function handleBulkImportCurriculum(
        rows: CurriculumMapCsvRow[]
    ): Promise<BulkImportResult> {
        const listRes = await listCourses(1, 1000, '', [], null);
        const courses = listRes.data?.items ?? [];

        const provisionedEntries: CurriculumMapEntry[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 1;

            if (!row.course_code) {
                errors.push(`Row ${rowNum}: Course Code is required.`);
                continue;
            }
            if (!row.year_level) {
                errors.push(`Row ${rowNum}: Year Level is required.`);
                continue;
            }

            const course = courses.find(
                (c) => c.code.trim().toLowerCase() === row.course_code.trim().toLowerCase()
            );

            if (!course) {
                errors.push(`Row ${rowNum}: Course '${row.course_code}' not found.`);
                continue;
            }

            let termTypeId = selectedTermTypeId;
            let termTypeObj = termTypeOptions.find((t) => t.value === selectedTermTypeId);

            if (row.term_type_code) {
                const matchedTermType = termTypeOptions.find(
                    (t) =>
                        t.label.trim().toLowerCase() === row.term_type_code?.trim().toLowerCase() ||
                        String(t.value).trim().toLowerCase() === row.term_type_code?.trim().toLowerCase()
                );
                if (matchedTermType) {
                    termTypeId = String(matchedTermType.value);
                    termTypeObj = matchedTermType;
                }
            }

            if (!termTypeId && termTypeOptions.length > 0) {
                termTypeId = String(termTypeOptions[0].value);
                termTypeObj = termTypeOptions[0];
            }

            if (!termTypeId) {
                errors.push(`Row ${rowNum}: Term Type is required.`);
                continue;
            }

            const formValues: CurriculumMapFormValues = {
                course_id: course.id,
                year_level: String(row.year_level),
                term_type_id: termTypeId,
                sequence: row.sequence || '1',
                is_elective: String(row.is_elective).toLowerCase() === 'true'
            };

            if (selectedProgramId) {
                const res = await createCurriculumMapEntry(
                    selectedProgramId,
                    formValues,
                    selectedSchoolYearId || undefined
                );
                if (res.error) {
                    errors.push(`Row ${rowNum}: ${res.error.message}`);
                }
            } else {
                const newEntry: CurriculumMapEntry = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    course_id: course.id,
                    course_code: course.code,
                    course_title: course.title,
                    lecture_units: course.lecture_units ?? 0,
                    laboratory_units: course.laboratory_units ?? 0,
                    total_units: course.total_units ?? 0,
                    year_level: Number(row.year_level),
                    term_type_id: termTypeId,
                    term_type_label: termTypeObj?.label ?? '',
                    term_type_code: termTypeObj?.label ?? '',
                    term_type_sequence: 1,
                    school_year_id: selectedSchoolYearId || null,
                    sequence: Number(row.sequence || 1),
                    is_elective: String(row.is_elective).toLowerCase() === 'true',
                    prerequisites: []
                };
                provisionedEntries.push(newEntry);
            }
        }

        if (selectedProgramId) {
            fetchCurriculum();
        } else if (provisionedEntries.length > 0) {
            updateEntriesState([...entries, ...provisionedEntries]);
        }

        const successCount = selectedProgramId
            ? rows.length - errors.length
            : provisionedEntries.length;

        return {
            provisioned_count: successCount,
            errors
        };
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

    const shouldHideProgramSelect = hideProgramSelect || Boolean(programId);

    return (
        <>
            <CommonCard className="h-full print:hidden">
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                            {!shouldHideProgramSelect && (
                                <CommonSelect
                                    fullWidth={false}
                                    options={[{ label: 'Select Program', value: '' }, ...programOptions]}
                                    size="large"
                                    sx={{ minWidth: 280 }}
                                    value={selectedProgramId}
                                    onChange={(e) => setSelectedProgramId(String(e.target.value))}
                                />
                            )}
                            <CommonSelect
                                fullWidth={false}
                                options={termTypeOptions}
                                size="large"
                                sx={{ minWidth: 180 }}
                                value={selectedTermTypeId}
                                onChange={(e) => setSelectedTermTypeId(String(e.target.value))}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <CommonButton
                                color="secondary"
                                size="small"
                                startIcon={<PrinterIcon className="w-4 h-4" />}
                                variant="outlined"
                                onClick={() => setIsPrintModalOpen(true)}
                            >
                                Print Curriculum
                            </CommonButton>
                            {!readOnly && (
                                <TableCardControls
                                    hasInput={false}
                                    tableButtonsProps={{
                                        createButtonProps: {
                                            children: 'Add Entry',
                                            onClick: handleOpenCreate
                                        },
                                        uploadCsvButtonProps: {
                                            onClick: function() {
                                                setIsBulkImportOpen(true);
                                            }
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {!selectedProgramId && !shouldHideProgramSelect
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
                                    <div className="flex flex-col gap-6 overflow-auto pb-8">
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
                        maxWidth="md"
                        open={isCreateOpen}
                        onClose={function() {
                            setIsCreateOpen(false);
                        }}
                    >
                        <div className="flex flex-col gap-4">
                            <CurriculumMapForm
                                control={createMethods.control}
                                id={CREATE_FORM_ID}
                                selectedSchoolYearId={selectedSchoolYearId}
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
                        maxWidth="md"
                        open={isUpdateOpen}
                        onClose={handleCloseUpdate}
                    >
                        <div className="flex flex-col gap-4">
                            <CurriculumMapForm
                                control={updateMethods.control}
                                id={UPDATE_FORM_ID}
                                selectedSchoolYearId={selectedSchoolYearId}
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
                                    disabled={!updateMethods.formState.isDirty}
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
                        maxWidth="md"
                        open={isViewOpen}
                        onClose={handleCloseView}
                    >
                        <div className="flex flex-col gap-4">
                            <CurriculumMapForm
                                control={updateMethods.control}
                                disabled
                                selectedSchoolYearId={selectedSchoolYearId}
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

                    <BulkImportModal<CurriculumMapCsvRow>
                        open={isBulkImportOpen}
                        templateColumns={CURRICULUM_MAP_CSV_COLUMNS}
                        title="Bulk Import Curriculum Map"
                        onBulkImport={handleBulkImportCurriculum}
                        onClose={() => setIsBulkImportOpen(false)}
                        onMapRow={(row) => row as unknown as CurriculumMapCsvRow}
                    />

                    {/* Print Confirmation Modal */}
                    <CommonModal
                        cardProps={{
                            cardHeaderProps: {
                                subheader: 'Select which academic terms to include in the printed curriculum map.',
                                title: 'Print Curriculum Map Confirmation'
                            }
                        }}
                        maxWidth="sm"
                        open={isPrintModalOpen}
                        onClose={() => setIsPrintModalOpen(false)}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Included Terms
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllPrintTerms}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={handleDeselectAllPrintTerms}
                                        className="text-xs text-slate-500 hover:underline font-medium cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-lg p-3 bg-slate-50/50 dark:bg-zinc-900/50">
                                {termTypeOptions.map((term) => {
                                    const isChecked = printTermTypeIds.includes(String(term.value));
                                    return (
                                        <label
                                            key={term.value}
                                            className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 p-2 rounded-md transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleTogglePrintTerm(String(term.value))}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="font-semibold text-xs">{term.label}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    variant="outlined"
                                    onClick={() => setIsPrintModalOpen(false)}
                                >
                                    Cancel
                                </CommonButton>
                                <CommonButton
                                    color="primary"
                                    disabled={printTermTypeIds.length === 0}
                                    size="small"
                                    startIcon={<PrinterIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleConfirmPrint}
                                >
                                    Print ({printTermTypeIds.length} Terms)
                                </CommonButton>
                            </div>
                        </div>
                    </CommonModal>
                </div>
            </CommonCard>

            {/* Print Layout for window.print() */}
            <div className="hidden print:block text-slate-900 p-8 w-full">
                <div className="flex flex-col gap-1 text-center mb-6">
                    <h1 className="font-bold text-base uppercase tracking-wider text-black">Arellano University</h1>
                    <h2 className="text-xs text-black">Jose Abad Santos Campus</h2>
                    <h3 className="font-bold text-sm mt-2 text-black">{selectedProgram?.label || 'Academic Program Curriculum Map'}</h3>
                    {selectedSchoolYear && (
                        <p className="text-xs text-black">Effective SY {selectedSchoolYear.label}</p>
                    )}
                </div>

                {printGrouped.map(({ key, label, terms }) => (
                    <div key={key} className="flex flex-col gap-3 mb-6">
                        <h4 className="font-bold text-xs uppercase tracking-widest text-center border-b pb-1 text-black">
                            {label}
                        </h4>
                        <div className="flex flex-wrap gap-4">
                            {terms.map((term) => renderCurriculumTable(term))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}