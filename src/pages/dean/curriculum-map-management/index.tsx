import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonModal from '@components/modal/CommonModal';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonSelect from '@components/select/CommonSelect';
import TableCardControls from '@components/table-card/TableCardControls';
import { PrinterIcon, TrashIcon } from '@phosphor-icons/react';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
import CurriculumMapForm from '@pages/dean/curriculum-map-management/CurriculumMapForm';
import CurriculumTermTable from '@pages/dean/curriculum-map-management/CurriculumTermTable';
import { useCurriculumMapGrouped } from '@pages/dean/curriculum-map-management/useCurriculumMapGrouped';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import {
    bulkCreateCurriculumMap, createCurriculumMapEntry, deleteCurriculumMapEntry, getCurriculumMap, updateCurriculumMapEntry
} from '@services/curriculum-map.service';
import { getCourses, listCourses } from '@services/course/course.service';
import { BulkImportResult, CsvTemplateColumn } from '@type/bulk-import.type';
import { CurriculumMapBulkRow, CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
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
    onChangeEntries?: (entries: CurriculumMapEntry[], pendingDeletedIds?: string[]) => void;
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
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isDeleteSingleModalOpen, setIsDeleteSingleModalOpen] = useState(false);
    const [deleteTargetEntry, setDeleteTargetEntry] = useState<CurriculumMapEntry | null>(null);
    const [pendingDeletedIds, setPendingDeletedIds] = useState<string[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<CurriculumMapEntry | null>(null);

    function updateEntriesState(newEntries: CurriculumMapEntry[], nextPending?: string[]) {
        setEntries(newEntries);
        const pendingToPass = nextPending ?? pendingDeletedIds;
        onChangeEntriesRef.current?.(newEntries, pendingToPass);
    }

    function handleConfirmClear() {
        const realIds = entries.filter((e) => !e.id.startsWith('temp-')).map((e) => e.id);
        const nextPending = Array.from(new Set([...pendingDeletedIds, ...realIds]));
        setPendingDeletedIds(nextPending);
        updateEntriesState([], nextPending);
        setIsClearModalOpen(false);
    }

    function handleOpenDeleteSingle(entryId: string) {
        const target = entries.find((e) => e.id === entryId);
        if (target) {
            setDeleteTargetEntry(target);
            setIsDeleteSingleModalOpen(true);
        }
    }

    function handleConfirmDeleteSingle() {
        if (!deleteTargetEntry) return;
        const targetId = deleteTargetEntry.id;
        let nextPending = pendingDeletedIds;
        if (!targetId.startsWith('temp-')) {
            nextPending = Array.from(new Set([...pendingDeletedIds, targetId]));
            setPendingDeletedIds(nextPending);
        }
        const nextEntries = entries.filter((e) => e.id !== targetId);
        updateEntriesState(nextEntries, nextPending);
        setIsDeleteSingleModalOpen(false);
        setDeleteTargetEntry(null);
    }

    const { programOptions } = useProgramOptions();
    const { activeSchoolYearId, schoolYearOptions } = useSchoolYearOptions();
    const { termTypeOptions } = useTermTypeOptions();

    const filteredEntries = useMemo(() => {
        if (!selectedTermTypeId) return entries;
        return entries.filter((entry) => entry.term_type_id === selectedTermTypeId);
    }, [entries, selectedTermTypeId]);

    const grouped = useCurriculumMapGrouped(filteredEntries);

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

    function handleDelete(entryId: string) {
        handleOpenDeleteSingle(entryId);
    }

    async function handleBulkImportCurriculum(
        rows: CurriculumMapCsvRow[]
    ): Promise<BulkImportResult> {
        if (selectedProgramId) {
            const programObj = programOptions.find((p) => p.value === selectedProgramId);
            const programCode = (programObj as { code?: string })?.code || selectedProgramId;
            const schoolYearObj = schoolYearOptions.find((s) => s.value === selectedSchoolYearId);
            const schoolYearCode = schoolYearObj?.label || '';

            const bulkEntries: CurriculumMapBulkRow[] = rows.map((row) => ({
                program_code: programCode,
                course_code: row.course_code,
                year_level: String(row.year_level),
                term_type_code: row.term_type_code || '',
                school_year_code: schoolYearCode,
                sequence: String(row.sequence || '1'),
                is_elective: String(row.is_elective ?? 'false')
            }));

            const result = await bulkCreateCurriculumMap(bulkEntries);
            fetchCurriculum();
            return result;
        }

        const [listRes, optionsRes] = await Promise.all([
            listCourses(1, 1000, '', [], null),
            getCourses()
        ]);

        const coursesMap = new Map<string, { id: string; code: string; title: string; lecture_units?: number; laboratory_units?: number; total_units?: number }>();

        if (listRes.data?.items) {
            for (const item of listRes.data.items) {
                if (item.code) {
                    coursesMap.set(item.code.trim().toLowerCase(), {
                        id: item.id,
                        code: item.code,
                        title: item.title,
                        lecture_units: item.lecture_units ?? 0,
                        laboratory_units: item.laboratory_units ?? 0,
                        total_units: item.total_units ?? 0
                    });
                }
            }
        }

        if (optionsRes.data) {
            for (const opt of optionsRes.data) {
                if (opt.code && !coursesMap.has(opt.code.trim().toLowerCase())) {
                    coursesMap.set(opt.code.trim().toLowerCase(), {
                        id: opt.id,
                        code: opt.code,
                        title: opt.label,
                        lecture_units: 0,
                        laboratory_units: 0,
                        total_units: 0
                    });
                }
            }
        }

        const courses = Array.from(coursesMap.values());
        const provisionedEntries: CurriculumMapEntry[] = [];
        const errors: string[] = [];

        const validRows: {
            rowNum: number;
            course: typeof courses[0];
            formValues: CurriculumMapFormValues;
            termTypeObj?: typeof termTypeOptions[0];
        }[] = [];

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

            const targetCode = row.course_code.trim().toLowerCase();
            const normalizedTarget = targetCode.replace(/[\s\-_]+/g, '');

            const course = courses.find((c) => {
                const cCode = c.code.trim().toLowerCase();
                const normalizedCCode = cCode.replace(/[\s\-_]+/g, '');
                return cCode === targetCode || normalizedCCode === normalizedTarget;
            });

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

            validRows.push({
                rowNum,
                course,
                termTypeObj,
                formValues: {
                    course_id: course.id,
                    year_level: String(row.year_level),
                    term_type_id: termTypeId,
                    sequence: row.sequence || '1',
                    is_elective: String(row.is_elective).toLowerCase() === 'true'
                }
            });
        }

        if (selectedProgramId) {
            const results = await Promise.all(
                validRows.map(async ({ rowNum, formValues }) => {
                    const res = await createCurriculumMapEntry(
                        selectedProgramId,
                        formValues,
                        selectedSchoolYearId || undefined
                    );
                    return { rowNum, res };
                })
            );

            for (const { rowNum, res } of results) {
                if (res.error) {
                    errors.push(`Row ${rowNum}: ${res.error.message}`);
                }
            }
        } else {
            for (const { course, termTypeObj, formValues } of validRows) {
                const newEntry: CurriculumMapEntry = {
                    id: `temp-${Date.now()}-${Math.random()}`,
                    course_id: course.id,
                    course_code: course.code,
                    course_title: course.title,
                    lecture_units: course.lecture_units ?? 0,
                    laboratory_units: course.laboratory_units ?? 0,
                    total_units: course.total_units ?? 0,
                    year_level: Number(formValues.year_level),
                    term_type_id: formValues.term_type_id,
                    term_type_label: termTypeObj?.label ?? '',
                    term_type_code: termTypeObj?.label ?? '',
                    term_type_sequence: 1,
                    school_year_id: selectedSchoolYearId || null,
                    sequence: Number(formValues.sequence || 1),
                    is_elective: formValues.is_elective,
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
        <CommonCard className="h-full">
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
                            options={[{ label: 'All Terms', value: '' }, ...termTypeOptions]}
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
                            onClick={() => window.print()}
                        >
                            Print Curriculum
                        </CommonButton>
                        {!readOnly && (
                            <div className="flex items-center gap-2">
                                {entries.length > 0 && (
                                    <CommonButton
                                        color="error"
                                        size="small"
                                        startIcon={<TrashIcon className="w-4 h-4" />}
                                        variant="outlined"
                                        onClick={() => setIsClearModalOpen(true)}
                                    >
                                        Clear Curriculum
                                    </CommonButton>
                                )}
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
                            </div>
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
                                <div className="flex flex-col gap-6 overflow-auto pb-8 print-area">
                                    <div className="flex flex-col gap-1 print-only">
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
                                                <div className="flex flex-col gap-4 w-full">
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

                <CommonModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: 'This action will remove the selected course entry from the curriculum map.',
                            title: 'Delete Curriculum Entry'
                        }
                    }}
                    maxWidth="xs"
                    open={isDeleteSingleModalOpen}
                    onClose={() => {
                        setIsDeleteSingleModalOpen(false);
                        setDeleteTargetEntry(null);
                    }}
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                            Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{deleteTargetEntry?.course_code} — {deleteTargetEntry?.course_title}</span> from this curriculum map?
                        </p>
                        <div className="flex justify-end gap-2">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    setIsDeleteSingleModalOpen(false);
                                    setDeleteTargetEntry(null);
                                }}
                            >
                                Cancel
                            </CommonButton>
                            <CommonButton
                                color="error"
                                size="small"
                                startIcon={<TrashIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={handleConfirmDeleteSingle}
                            >
                                Delete Entry
                            </CommonButton>
                        </div>
                    </div>
                </CommonModal>

                <CommonModal
                    cardProps={{
                        cardHeaderProps: {
                            subheader: 'This action will remove all courses from the curriculum map.',
                            title: 'Clear Curriculum Map'
                        }
                    }}
                    maxWidth="xs"
                    open={isClearModalOpen}
                    onClose={() => setIsClearModalOpen(false)}
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                            Are you sure you want to clear/reset all curriculum entries? This will delete all course mappings from this curriculum map.
                        </p>
                        <div className="flex justify-end gap-2">
                            <CommonButton
                                color="inherit"
                                size="small"
                                variant="outlined"
                                onClick={() => setIsClearModalOpen(false)}
                            >
                                Cancel
                            </CommonButton>
                            <CommonButton
                                color="error"
                                size="small"
                                startIcon={<TrashIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={handleConfirmClear}
                            >
                                Clear All Entries
                            </CommonButton>
                        </div>
                    </div>
                </CommonModal>
            </div>
        </CommonCard>
    );
}