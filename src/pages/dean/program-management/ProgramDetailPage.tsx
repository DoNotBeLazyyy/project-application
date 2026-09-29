import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import BulkImportModal from '@components/modal/BulkImportModal';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import CurriculumMapForm from '@pages/dean/curriculum-map-management/CurriculumMapForm';
import CurriculumTermTable from '@pages/dean/curriculum-map-management/CurriculumTermTable';
import { useCurriculumMapGrouped } from '@pages/dean/curriculum-map-management/useCurriculumMapGrouped';
import CloneCurriculumModal, { CurriculumVersionOption } from '@pages/dean/program-management/CloneCurriculumModal';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import ProgramForm from '@pages/dean/program-management/ProgramForm';
import {
    ArrowLeftIcon,
    BookOpenTextIcon,
    CalendarIcon,
    CopyIcon,
    PencilSimpleIcon,
    PlusIcon,
    PrinterIcon,
    UploadSimpleIcon
} from '@phosphor-icons/react';
import {
    bulkCreateCurriculumMap,
    createCurriculumMapEntry,
    deleteCurriculumMapEntry,
    getCurriculumMap,
    updateCurriculumMapEntry
} from '@services/curriculum-map.service';
import { getProgramById, updateProgram } from '@services/program/program.service';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { CurriculumMapBulkRow, CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { ProgramFormValues } from '@type/program/program.type';
import { formErrors } from '@utils/form.util';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

const CREATE_ENTRY_FORM_ID = 'create-curriculum-entry-form';
const UPDATE_ENTRY_FORM_ID = 'update-curriculum-entry-form';
const UPDATE_PROGRAM_FORM_ID = 'update-program-form';

const defaultEntryFormValues: CurriculumMapFormValues = {
    course_id: '',
    is_elective: false,
    sequence: '1',
    term_type_id: '',
    year_level: ''
};

const defaultProgramFormValues: ProgramFormValues = {
    code: '',
    department_id: '',
    description: '',
    is_active: true,
    name: '',
    program_level_id: '',
    total_units: '',
    years_duration: ''
};

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { hint: 'e.g. CS101', key: 'course_code', label: 'Course Code' },
    { hint: 'e.g. 1', key: 'year_level', label: 'Year Level' },
    { hint: 'e.g. 1ST_SEM', key: 'term_type_code', label: 'Term Type Code' },
    { hint: 'e.g. 1', key: 'sequence', label: 'Sequence' },
    { hint: 'true or false', key: 'is_elective', label: 'Is Elective' }
];

export default function ProgramDetailPage() {
    const navigate = useNavigate();
    const { programId = '' } = useParams<{ programId: string }>();

    const [program, setProgram] = useState<ProgramFormValues | null>(null);
    const [allEntries, setAllEntries] = useState<CurriculumMapEntry[]>([]);
    const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);
    const [isUpdateEntryOpen, setIsUpdateEntryOpen] = useState(false);
    const [isViewEntryOpen, setIsViewEntryOpen] = useState(false);
    const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<CurriculumMapEntry | null>(null);

    const { schoolYearOptions } = useSchoolYearOptions();
    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const createEntryMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultEntryFormValues
    });

    const updateEntryMethods = useForm<CurriculumMapFormValues>({
        defaultValues: defaultEntryFormValues
    });

    const editProgramMethods = useForm<ProgramFormValues>({
        defaultValues: defaultProgramFormValues
    });

    const loadProgramData = useCallback(async function() {
        if (!programId) return;

        setIsLoading(true);
        const [progRes, currRes] = await Promise.all([
            getProgramById(programId),
            getCurriculumMap(programId)
        ]);

        if (progRes.data) {
            setProgram(progRes.data);
            editProgramMethods.reset({
                code: progRes.data.code,
                department_id: progRes.data.department_id ?? '',
                description: progRes.data.description ?? '',
                is_active: progRes.data.is_active ?? true,
                name: progRes.data.name,
                program_level_id: progRes.data.program_level_id ?? '',
                total_units: progRes.data.total_units ?? '',
                years_duration: progRes.data.years_duration ?? ''
            });
        }

        if (currRes.data) {
            setAllEntries(currRes.data);
        }

        setIsLoading(false);
    }, [programId, editProgramMethods]);

    useEffect(function() {
        loadProgramData();
    }, [loadProgramData]);

    // Build version options from loaded entries
    const existingVersions = useMemo(function(): CurriculumVersionOption[] {
        const map = new Map<string | null, number>();

        allEntries.forEach(function(entry) {
            const key = entry.school_year_id ?? null;
            map.set(key, (map.get(key) ?? 0) + 1);
        });

        const versions: CurriculumVersionOption[] = [];

        // Add configured school years
        schoolYearOptions.forEach(function(opt) {
            const syId = String(opt.value);
            if (map.has(syId)) {
                versions.push({
                    count: map.get(syId) ?? 0,
                    label: opt.label,
                    schoolYearId: syId
                });
            }
        });

        // Add baseline if any entries without school_year_id exist
        if (map.has(null) && (map.get(null) ?? 0) > 0) {
            versions.push({
                count: map.get(null) ?? 0,
                label: 'Baseline / Default',
                schoolYearId: null
            });
        }

        return versions;
    }, [allEntries, schoolYearOptions]);

    // Default selected school year if not set
    useEffect(function() {
        if (!selectedSchoolYearId && existingVersions.length > 0) {
            const first = existingVersions[0];
            setSelectedSchoolYearId(first.schoolYearId ?? 'baseline');
        } else if (!selectedSchoolYearId && schoolYearOptions.length > 0) {
            setSelectedSchoolYearId(String(schoolYearOptions[0].value));
        }
    }, [selectedSchoolYearId, existingVersions, schoolYearOptions]);

    // Filter entries for currently selected version
    const versionEntries = useMemo(function() {
        if (selectedSchoolYearId === 'baseline') {
            return allEntries.filter((entry) => !entry.school_year_id);
        }
        if (!selectedSchoolYearId) {
            return allEntries;
        }
        return allEntries.filter((entry) => entry.school_year_id === selectedSchoolYearId);
    }, [allEntries, selectedSchoolYearId]);

    const grouped = useCurriculumMapGrouped(versionEntries);

    const totalCurriculumUnits = useMemo(function() {
        return versionEntries.reduce((sum, entry) => sum + (entry.total_units || 0), 0);
    }, [versionEntries]);

    const activeSchoolYearLabel = useMemo(function() {
        if (selectedSchoolYearId === 'baseline') {
            return 'Baseline / Default';
        }
        const found = schoolYearOptions.find((opt) => String(opt.value) === selectedSchoolYearId);
        return found ? found.label : 'Select Academic Year';
    }, [selectedSchoolYearId, schoolYearOptions]);

    const departmentName = useMemo(function() {
        if (!program?.department_id) return '—';
        const found = departmentOptions.find((opt) => String(opt.value) === String(program.department_id));
        return found ? found.label : '—';
    }, [program, departmentOptions]);

    const programLevelLabel = useMemo(function() {
        if (!program?.program_level_id) return '—';
        const found = programLevelOptions.find((opt) => String(opt.value) === String(program.program_level_id));
        return found ? found.label : '—';
    }, [program, programLevelOptions]);

    async function refreshCurriculum() {
        const currRes = await getCurriculumMap(programId);
        if (currRes.data) {
            setAllEntries(currRes.data);
        }
    }

    function handleOpenCreateEntry() {
        createEntryMethods.reset(defaultEntryFormValues);
        setIsCreateEntryOpen(true);
    }

    function handleOpenViewEntry(entry: CurriculumMapEntry) {
        setSelectedEntry(entry);
        updateEntryMethods.reset({
            course_id: entry.course_id,
            is_elective: entry.is_elective,
            sequence: String(entry.sequence),
            term_type_id: entry.term_type_id,
            year_level: String(entry.year_level)
        });
        setIsViewEntryOpen(true);
    }

    function handleCloseUpdateEntry() {
        setIsUpdateEntryOpen(false);
        setSelectedEntry(null);
        updateEntryMethods.reset(defaultEntryFormValues);
    }

    function handleCloseViewEntry() {
        setIsViewEntryOpen(false);
        setSelectedEntry(null);
        updateEntryMethods.reset(defaultEntryFormValues);
    }

    async function handleCreateEntrySubmit(values: CurriculumMapFormValues) {
        const syParam = selectedSchoolYearId === 'baseline' ? undefined : selectedSchoolYearId || undefined;
        const result = await createCurriculumMapEntry(programId, values, syParam);

        if (!result.error) {
            setIsCreateEntryOpen(false);
            createEntryMethods.reset(defaultEntryFormValues);
            refreshCurriculum();
        }
    }

    function handleCreateEntryFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, createEntryMethods);
    }

    async function handleUpdateEntrySubmit(values: CurriculumMapFormValues) {
        if (!selectedEntry) return;

        const syParam = selectedSchoolYearId === 'baseline' ? undefined : selectedSchoolYearId || undefined;
        const result = await updateCurriculumMapEntry(selectedEntry.id, values, syParam);

        if (!result.error) {
            handleCloseUpdateEntry();
            refreshCurriculum();
        }
    }

    function handleUpdateEntryFormError(errors: FieldErrors<CurriculumMapFormValues>) {
        formErrors(errors, updateEntryMethods);
    }

    async function handleDeleteEntry(entryId: string) {
        const result = await deleteCurriculumMapEntry(entryId);
        if (!result.error) {
            refreshCurriculum();
        }
    }

    async function handleEditProgramSubmit(values: ProgramFormValues) {
        if (!programId) return;

        const result = await updateProgram(programId, values);
        if (!result.error) {
            setIsEditProgramOpen(false);
            loadProgramData();
        }
    }

    function handleEditProgramFormError(errors: FieldErrors<ProgramFormValues>) {
        formErrors(errors, editProgramMethods);
    }

    function handleCloneSuccess(newSchoolYearId: string) {
        setSelectedSchoolYearId(newSchoolYearId);
        refreshCurriculum();
    }

    if (isLoading) {
        return (
            <CommonCard className="h-full w-full">
                <div className="flex flex-1 items-center justify-center p-12">
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        Loading program details and curriculum map...
                    </span>
                </div>
            </CommonCard>
        );
    }

    if (!program) {
        return (
            <CommonCard className="h-full w-full">
                <div className="flex flex-col gap-4 items-center justify-center p-12">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Program not found
                    </span>
                    <CommonButton
                        size="small"
                        startIcon={<ArrowLeftIcon size={16} />}
                        variant="outlined"
                        onClick={() => navigate('/dean/program-management')}
                    >
                        Back to Programs
                    </CommonButton>
                </div>
            </CommonCard>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full w-full overflow-y-auto pb-12">
            {/* Top Program Card */}
            <CommonCard className="w-full">
                <div className="flex flex-col gap-5 p-2">
                    {/* Navigation and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                        <CommonButton
                            size="small"
                            startIcon={<ArrowLeftIcon size={16} />}
                            variant="text"
                            onClick={() => navigate('/dean/program-management')}
                        >
                            Back to Programs
                        </CommonButton>
                        <div className="flex items-center gap-2">
                            <CommonButton
                                color="inherit"
                                size="small"
                                startIcon={<PrinterIcon size={16} />}
                                variant="outlined"
                                onClick={() => window.print()}
                            >
                                Print Checklist
                            </CommonButton>
                            <CommonButton
                                size="small"
                                startIcon={<PencilSimpleIcon size={16} />}
                                variant="contained"
                                onClick={() => setIsEditProgramOpen(true)}
                            >
                                Edit Program
                            </CommonButton>
                        </div>
                    </div>

                    {/* Program Title Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2.5">
                                <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) border border-(--mui-palette-primary-main)/20 tracking-wider">
                                    {program.code}
                                </span>
                                <h1 className="font-bold text-(--mui-palette-text-primary) text-2xl tracking-tight m-0">
                                    {program.name}
                                </h1>
                                <CommonBadgeStatus
                                    label={program.is_active ? 'Active' : 'Inactive'}
                                    variant={program.is_active ? 'success' : 'warning'}
                                />
                            </div>
                            {program.description && (
                                <p className="text-(--mui-palette-text-secondary) text-sm m-0 mt-1 max-w-3xl">
                                    {program.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Metadata Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3.5 rounded-lg bg-(--mui-palette-background-default)/40">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider font-semibold">
                                Department
                            </span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm truncate">
                                {departmentName}
                            </span>
                        </div>
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3.5 rounded-lg bg-(--mui-palette-background-default)/40">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider font-semibold">
                                Academic Level
                            </span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {programLevelLabel}
                            </span>
                        </div>
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3.5 rounded-lg bg-(--mui-palette-background-default)/40">
                            <span className="text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider font-semibold">
                                Duration & Required Units
                            </span>
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                {program.years_duration} Years · {program.total_units || '—'} Units
                            </span>
                        </div>
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3.5 rounded-lg bg-(--mui-palette-primary-main)/5 border-(--mui-palette-primary-main)/20">
                            <span className="text-(--mui-palette-primary-main) text-xs uppercase tracking-wider font-semibold">
                                Active Version Load
                            </span>
                            <span className="font-bold text-(--mui-palette-primary-main) text-sm">
                                {versionEntries.length} Courses ({totalCurriculumUnits} Units)
                            </span>
                        </div>
                    </div>
                </div>
            </CommonCard>

            {/* Curriculum Map & Version History Card */}
            <CommonCard className="w-full flex-1">
                <div className="flex flex-col gap-6 p-2">
                    {/* Official Print Header */}
                    <div className="flex flex-col gap-1 text-center hidden print:flex pb-4 border-b border-black">
                        <h2 className="font-bold text-lg m-0 uppercase">Arellano University</h2>
                        <h3 className="font-medium text-sm m-0">Jose Abad Santos Campus</h3>
                        <p className="font-semibold text-xs m-0 mt-2 uppercase tracking-wide">
                            Office of the Dean — Curriculum Map Checklist
                        </p>
                        <p className="font-bold text-sm m-0 mt-1">
                            {program.code} — {program.name}
                        </p>
                        <p className="text-xs m-0">
                            Curriculum Revision Effective: {activeSchoolYearLabel} | Total Units: {totalCurriculumUnits}
                        </p>
                    </div>

                    {/* Version History Toolbar */}
                    <div className="flex flex-col gap-4 no-print border-b border-(--mui-palette-divider) pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-col gap-0.5">
                                <h2 className="font-bold text-(--mui-palette-text-primary) text-base m-0 flex items-center gap-2">
                                    <BookOpenTextIcon size={20} />
                                    <span>Curriculum Map & Version History</span>
                                </h2>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    Track program curriculum across academic years. Each academic year revision preserves its distinct course catalog.
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <CommonButton
                                    size="small"
                                    startIcon={<CopyIcon size={16} />}
                                    variant="outlined"
                                    onClick={() => setIsCloneModalOpen(true)}
                                >
                                    New Revision / Clone
                                </CommonButton>
                                <CommonButton
                                    color="inherit"
                                    size="small"
                                    startIcon={<UploadSimpleIcon size={16} />}
                                    variant="outlined"
                                    onClick={() => setIsBulkImportOpen(true)}
                                >
                                    Import CSV
                                </CommonButton>
                                <CommonButton
                                    size="small"
                                    startIcon={<PlusIcon size={16} />}
                                    variant="contained"
                                    onClick={handleOpenCreateEntry}
                                >
                                    Add Course
                                </CommonButton>
                            </div>
                        </div>

                        {/* Version Navigation Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-(--mui-palette-text-secondary) mr-1">
                                    Revisions:
                                </span>
                                {existingVersions.length === 0 && (
                                    <span className="text-xs text-(--mui-palette-text-secondary) italic">
                                        No revisions created yet.
                                    </span>
                                )}
                                {existingVersions.map(function(version) {
                                    const vKey = version.schoolYearId ?? 'baseline';
                                    const isSelected = selectedSchoolYearId === vKey;

                                    return (
                                        <button
                                            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                isSelected
                                                    ? 'bg-(--mui-palette-primary-main) text-white shadow-sm ring-2 ring-(--mui-palette-primary-main)/30 font-semibold'
                                                    : 'bg-(--mui-palette-background-default) text-(--mui-palette-text-primary) border border-(--mui-palette-divider) hover:border-(--mui-palette-primary-main)/50'
                                            }`}
                                            key={vKey}
                                            type="button"
                                            onClick={() => setSelectedSchoolYearId(vKey)}
                                        >
                                            <CalendarIcon size={14} />
                                            <span>{version.label}</span>
                                            <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-(--mui-palette-divider) text-(--mui-palette-text-secondary)'
                                                }`}
                                            >
                                                {version.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Dropdown to jump to any academic year */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-(--mui-palette-text-secondary) font-medium">
                                    View AY:
                                </span>
                                <CommonSelect
                                    fullWidth={false}
                                    options={[
                                        ...existingVersions.some((v) => !v.schoolYearId)
                                            ? [{ label: 'Baseline / Default', value: 'baseline' }]
                                            : [],
                                        ...schoolYearOptions
                                    ]}
                                    size="small"
                                    sx={{ minWidth: 190 }}
                                    value={selectedSchoolYearId}
                                    onChange={(e) => setSelectedSchoolYearId(String(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Revision Banner */}
                    <div className="flex items-center justify-between no-print px-4 py-2.5 rounded-lg bg-(--mui-palette-background-default)/60 border border-(--mui-palette-divider)">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-(--mui-palette-text-primary)">
                                Active Cohort Curriculum:
                            </span>
                            <span className="font-bold text-xs text-(--mui-palette-primary-main)">
                                {activeSchoolYearLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-(--mui-palette-text-secondary)">
                            <span>
                                <strong>{versionEntries.length}</strong> courses
                            </span>
                            <span>•</span>
                            <span>
                                <strong>{totalCurriculumUnits}</strong> total units
                            </span>
                        </div>
                    </div>

                    {/* Curriculum Tables Grouped by Year Level */}
                    {versionEntries.length === 0 ? (
                        <div className="border border-(--mui-palette-divider) border-dashed flex flex-col gap-3 items-center justify-center p-12 rounded-lg text-center">
                            <BookOpenTextIcon className="text-(--mui-palette-text-secondary)/60" size={40} />
                            <div className="flex flex-col gap-1">
                                <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                    No curriculum map defined for {activeSchoolYearLabel}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs max-w-md">
                                    You can establish this revision by cloning courses from a previous academic year, or start adding courses directly.
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                {existingVersions.length > 0 && (
                                    <CommonButton
                                        size="small"
                                        startIcon={<CopyIcon size={16} />}
                                        variant="outlined"
                                        onClick={() => setIsCloneModalOpen(true)}
                                    >
                                        Clone from Another Year
                                    </CommonButton>
                                )}
                                <CommonButton
                                    size="small"
                                    startIcon={<PlusIcon size={16} />}
                                    variant="contained"
                                    onClick={handleOpenCreateEntry}
                                >
                                    Add First Course
                                </CommonButton>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 pb-4 print-area">
                            {grouped.map(function({ key, label, terms }) {
                                return (
                                    <div className="flex flex-col gap-3" key={key}>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-(--mui-palette-text-primary) text-xs tracking-wider uppercase m-0">
                                                {label}
                                            </h3>
                                            <div className="flex-1 border-b border-(--mui-palette-divider)" />
                                        </div>
                                        <div className="flex flex-col lg:flex-row gap-4">
                                            {terms.map((term) => (
                                                <CurriculumTermTable
                                                    entries={term.entries}
                                                    key={term.termTypeId}
                                                    termTypeLabel={term.termTypeLabel}
                                                    totalUnits={term.totalUnits}
                                                    onDelete={handleDeleteEntry}
                                                    onView={handleOpenViewEntry}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CommonCard>

            {/* Modal: Add Curriculum Entry */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: `Add a course to ${program.code} curriculum for ${activeSchoolYearLabel}.`,
                        title: 'Add Curriculum Course'
                    }
                }}
                maxWidth="md"
                open={isCreateEntryOpen}
                onClose={() => setIsCreateEntryOpen(false)}
            >
                <div className="flex flex-col gap-4">
                    <CurriculumMapForm
                        control={createEntryMethods.control}
                        id={CREATE_ENTRY_FORM_ID}
                        onSubmit={createEntryMethods.handleSubmit(
                            handleCreateEntrySubmit,
                            handleCreateEntryFormError
                        )}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={() => setIsCreateEntryOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            form={CREATE_ENTRY_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Add Entry
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Modal: Edit Curriculum Entry */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: `Update course sequence or settings in ${activeSchoolYearLabel} curriculum.`,
                        title: 'Edit Curriculum Entry'
                    }
                }}
                maxWidth="md"
                open={isUpdateEntryOpen}
                onClose={handleCloseUpdateEntry}
            >
                <div className="flex flex-col gap-4">
                    <CurriculumMapForm
                        control={updateEntryMethods.control}
                        id={UPDATE_ENTRY_FORM_ID}
                        onSubmit={updateEntryMethods.handleSubmit(
                            handleUpdateEntrySubmit,
                            handleUpdateEntryFormError
                        )}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={handleCloseUpdateEntry}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!updateEntryMethods.formState.isDirty}
                            form={UPDATE_ENTRY_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Save
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Modal: View Curriculum Entry */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Viewing curriculum course details.',
                        title: 'View Curriculum Entry'
                    }
                }}
                maxWidth="md"
                open={isViewEntryOpen}
                onClose={handleCloseViewEntry}
            >
                <div className="flex flex-col gap-4">
                    <CurriculumMapForm
                        control={updateEntryMethods.control}
                        disabled
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={handleCloseViewEntry}
                        >
                            Close
                        </CommonButton>
                        <CommonButton
                            size="small"
                            variant="contained"
                            onClick={() => {
                                setIsViewEntryOpen(false);
                                setIsUpdateEntryOpen(true);
                            }}
                        >
                            Edit
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Modal: Clone / New Curriculum Revision */}
            <CloneCurriculumModal
                existingVersions={existingVersions}
                open={isCloneModalOpen}
                programCode={program.code}
                programId={programId}
                schoolYearOptions={schoolYearOptions}
                onClose={() => setIsCloneModalOpen(false)}
                onSuccess={handleCloneSuccess}
            />

            {/* Modal: Edit Program Details */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Update basic information and academic requirements for this program.',
                        title: 'Edit Program'
                    }
                }}
                maxWidth="md"
                open={isEditProgramOpen}
                onClose={() => setIsEditProgramOpen(false)}
            >
                <div className="flex flex-col gap-4">
                    <ProgramForm
                        control={editProgramMethods.control}
                        id={UPDATE_PROGRAM_FORM_ID}
                        isCodeDisabled
                        onSubmit={editProgramMethods.handleSubmit(
                            handleEditProgramSubmit,
                            handleEditProgramFormError
                        )}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={() => setIsEditProgramOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!editProgramMethods.formState.isDirty}
                            form={UPDATE_PROGRAM_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Save Program
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            {/* Bulk Import CSV Modal */}
            <BulkImportModal<CurriculumMapBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title={`Bulk Import Courses to ${program.code} (${activeSchoolYearLabel})`}
                onBulkImport={bulkCreateCurriculumMap}
                onClose={() => setIsBulkImportOpen(false)}
                onMapRow={(row) => ({
                    course_code: row.course_code,
                    is_elective: row.is_elective,
                    program_code: program.code,
                    school_year_code: selectedSchoolYearId === 'baseline' ? '' : activeSchoolYearLabel,
                    sequence: row.sequence,
                    term_type_code: row.term_type_code,
                    year_level: row.year_level
                })}
                onSuccess={refreshCurriculum}
            />
        </div>
    );
}
