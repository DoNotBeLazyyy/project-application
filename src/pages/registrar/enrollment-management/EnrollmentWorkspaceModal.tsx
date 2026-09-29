import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import FormErrorSummary from '@components/form/FormErrorSummary';
import CommonInput from '@components/input/CommonInput';
import ValidCommonInput from '@components/input/ValidCommonInput';
import CommonActionModal from '@components/modal/CommonActionModal';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { InputAdornment } from '@mui/material';
import AvailableSectionBentoCard from '@pages/registrar/enrollment-management/AvailableSectionBentoCard';
import EligibleSectionFilterBar from '@pages/registrar/enrollment-management/EligibleSectionFilterBar';
import StudentLoadBentoCard, { StudentLoadCardItem, StudentLoadCardState } from '@pages/registrar/enrollment-management/StudentLoadBentoCard';
import {
    ArrowsClockwiseIcon,
    CalendarBlankIcon,
    CheckCircleIcon,
    FunnelIcon,
    GraduationCapIcon,
    IdentificationCardIcon,
    MagnifyingGlassIcon,
    WarningCircleIcon,
    XIcon
} from '@phosphor-icons/react';
import { bulkEnrollStudent, dropEnrollment, getEnrollmentStudentDetail, listEligibleSections } from '@services/enrollment.service';
import {
    CurrentLoadRow,
    EligibleSectionFilterValues,
    EligibleSectionRow,
    EnrollmentStudentDetail
} from '@type/enrollment.type';
import { formErrors } from '@utils/form.util';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FieldErrors, useForm, useWatch } from 'react-hook-form';

interface EnrollmentOverrideValues {
    allow_conflict: boolean;
    override_prerequisites: boolean;
    conflict_reason: string;
}

interface EnrollmentWorkspaceModalProps {
    defaultTermId: string | null;
    open: boolean;
    studentId: string | null;
    termOptions: CommonSelectOption[];
    onClose: () => void;
    onEnrolled: () => void;
}

const defaultOverrideValues: EnrollmentOverrideValues = {
    allow_conflict: false,
    override_prerequisites: false,
    conflict_reason: ''
};

const defaultSectionFilters: EligibleSectionFilterValues = {
    scope: 'recommended',
    year_levels: [],
    include_full: true,
    include_prerequisite_gaps: true,
    include_conflicts: true
};

export default function EnrollmentWorkspaceModal({
    defaultTermId,
    open,
    studentId,
    termOptions,
    onClose,
    onEnrolled
}: EnrollmentWorkspaceModalProps) {
    const [termId, setTermId] = useState<string | null>(defaultTermId);
    const [detail, setDetail] = useState<EnrollmentStudentDetail | null>(null);
    const [availableSections, setAvailableSections] = useState<EligibleSectionRow[]>([]);
    const [isAvailableLoading, setIsAvailableLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Staged changes state
    const [stagedNewSections, setStagedNewSections] = useState<EligibleSectionRow[]>([]);
    const [markedDropIds, setMarkedDropIds] = useState<Set<string>>(new Set());
    const [mobileTab, setMobileTab] = useState<'load' | 'available'>('load');

    // Saving & prompt states
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

    const [recommendedCount, setRecommendedCount] = useState(0);
    const [recommendedAvailableCount, setRecommendedAvailableCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const overrideMethods = useForm<EnrollmentOverrideValues>({
        defaultValues: defaultOverrideValues,
        shouldUnregister: true
    });

    const filterMethods = useForm<EligibleSectionFilterValues>({
        defaultValues: defaultSectionFilters
    });

    const allowConflict = useWatch({ control: overrideMethods.control, name: 'allow_conflict' });
    const scope = useWatch({ control: filterMethods.control, name: 'scope' });
    const yearLevels = useWatch({ control: filterMethods.control, name: 'year_levels' });
    const includeFull = useWatch({ control: filterMethods.control, name: 'include_full' });
    const includePrerequisiteGaps = useWatch({
        control: filterMethods.control,
        name: 'include_prerequisite_gaps'
    });
    const includeConflicts = useWatch({ control: filterMethods.control, name: 'include_conflicts' });

    const sectionFilters = useMemo<EligibleSectionFilterValues>(function() {
        return {
            scope: scope ?? defaultSectionFilters.scope,
            year_levels: scope === 'all' ? yearLevels ?? [] : [],
            include_full: Boolean(includeFull),
            include_prerequisite_gaps: Boolean(includePrerequisiteGaps),
            include_conflicts: Boolean(includeConflicts)
        };
    }, [scope, yearLevels, includeFull, includePrerequisiteGaps, includeConflicts]);

    const loadWorkspace = useCallback(async function() {
        if (!studentId) return;

        setIsAvailableLoading(true);
        try {
            const [detailResult, sectionsResult] = await Promise.all([
                getEnrollmentStudentDetail(studentId, termId),
                listEligibleSections(studentId, termId, activeSearch, sectionFilters)
            ]);

            if (detailResult.data) {
                setDetail(detailResult.data);
            }

            if (sectionsResult.data) {
                setAvailableSections(sectionsResult.data.rows ?? []);
                setRecommendedCount(sectionsResult.data.recommended_count ?? 0);
                setRecommendedAvailableCount(sectionsResult.data.available_count ?? 0);
                setTotalCount(sectionsResult.data.total_count ?? 0);
            }
        } finally {
            setIsAvailableLoading(false);
        }
    }, [studentId, termId, activeSearch, sectionFilters]);

    useEffect(function() {
        if (open) {
            loadWorkspace();
        }
    }, [open, loadWorkspace]);

    useEffect(function() {
        if (open) {
            setTermId(defaultTermId);
            filterMethods.reset(defaultSectionFilters);
            setStagedNewSections([]);
            setMarkedDropIds(new Set());
            setSaveErrorMessage(null);
            setMobileTab('load');
        }
    }, [open, defaultTermId, filterMethods]);

    // Sets of IDs currently enrolled or staged
    const enrolledSectionIds = useMemo(function() {
        return new Set((detail?.current_load ?? []).map((row) => row.section_id));
    }, [detail?.current_load]);

    const stagedSectionIds = useMemo(function() {
        return new Set(stagedNewSections.map((sec) => sec.section_id));
    }, [stagedNewSections]);

    // Unit & Subject Calculations
    const currentActiveLoad = useMemo(function() {
        return detail?.current_load ?? [];
    }, [detail?.current_load]);

    const currentUnits = useMemo(function() {
        return currentActiveLoad.reduce((sum, row) => sum + Number(row.units || 0), 0);
    }, [currentActiveLoad]);

    const stagedUnits = useMemo(function() {
        return stagedNewSections.reduce((sum, sec) => sum + Number(sec.units || 0), 0);
    }, [stagedNewSections]);

    const droppedUnits = useMemo(function() {
        return currentActiveLoad
            .filter((row) => markedDropIds.has(row.enrollment_id))
            .reduce((sum, row) => sum + Number(row.units || 0), 0);
    }, [currentActiveLoad, markedDropIds]);

    const netUnits = currentUnits + stagedUnits - droppedUnits;
    const netCount = currentActiveLoad.length + stagedNewSections.length - markedDropIds.size;
    const totalChanges = stagedNewSections.length + markedDropIds.size;

    // Conflicts and Prerequisite Warnings in Newly Staged Sections
    const hasSelectedConflict = useMemo(function() {
        return stagedNewSections.some((section) => Boolean(section.conflict_with));
    }, [stagedNewSections]);

    const hasSelectedPrerequisiteGap = useMemo(function() {
        return stagedNewSections.some((section) => Boolean(section.unmet_prerequisites));
    }, [stagedNewSections]);

    // Handlers for Staging and Dropping
    function handleStageSection(section: EligibleSectionRow) {
        if (enrolledSectionIds.has(section.section_id) || stagedSectionIds.has(section.section_id)) {
            return;
        }
        setStagedNewSections((prev) => [...prev, section]);
    }

    function handleUnstageSection(sectionId: string) {
        setStagedNewSections((prev) => prev.filter((sec) => sec.section_id !== sectionId));
    }

    function handleMarkDrop(enrollmentId: string) {
        setMarkedDropIds((prev) => {
            const next = new Set(prev);
            next.add(enrollmentId);
            return next;
        });
    }

    function handleUndoDrop(enrollmentId: string) {
        setMarkedDropIds((prev) => {
            const next = new Set(prev);
            next.delete(enrollmentId);
            return next;
        });
    }

    function handleResetAllChanges() {
        setStagedNewSections([]);
        setMarkedDropIds(new Set());
        overrideMethods.reset(defaultOverrideValues);
        setSaveErrorMessage(null);
    }

    function handleClose() {
        setDetail(null);
        setAvailableSections([]);
        setStagedNewSections([]);
        setMarkedDropIds(new Set());
        setSearchInput('');
        setActiveSearch('');
        overrideMethods.reset(defaultOverrideValues);
        filterMethods.reset(defaultSectionFilters);
        setSaveErrorMessage(null);
        onClose();
    }

    function handleSearchSubmit() {
        setActiveSearch(searchInput);
    }

    // Save All Changes (Drops + Enrollments)
    async function handleExecuteSave(values: EnrollmentOverrideValues) {
        if (!studentId) return;

        setIsSaving(true);
        setSaveErrorMessage(null);

        try {
            // 1. Process drops first
            if (markedDropIds.size > 0) {
                const dropPromises = Array.from(markedDropIds).map((enrollmentId) =>
                    dropEnrollment(enrollmentId, 'Dropped via registrar workspace')
                );
                const dropResults = await Promise.all(dropPromises);
                const dropError = dropResults.find((res) => res.error);
                if (dropError) {
                    setSaveErrorMessage(dropError.error?.message ?? 'Failed to drop one or more subjects.');
                    setIsSaving(false);
                    return;
                }
            }

            // 2. Process bulk enrollments
            if (stagedNewSections.length > 0) {
                const enrollResult = await bulkEnrollStudent({
                    student_id: studentId,
                    section_ids: stagedNewSections.map((sec) => sec.section_id),
                    allow_conflict: Boolean(values.allow_conflict),
                    conflict_reason: values.conflict_reason ?? '',
                    override_prerequisites: Boolean(values.override_prerequisites)
                });

                if (enrollResult.error) {
                    setSaveErrorMessage(enrollResult.error.message);
                    setIsSaving(false);
                    return;
                }
            }

            // Reset staged states and refresh workspace
            setStagedNewSections([]);
            setMarkedDropIds(new Set());
            overrideMethods.reset(defaultOverrideValues);
            setShowSaveConfirm(false);
            await loadWorkspace();
            onEnrolled();
        } catch (err: unknown) {
            setSaveErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleSaveValidationFailed(errors: FieldErrors<EnrollmentOverrideValues>) {
        formErrors(errors, overrideMethods);
    }

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Manage course sections for this student. Click sections on the right to stage new enrollments.',
                        title: 'Student Section Enrollment Workspace'
                    }
                }}
                containerClassName="max-w-full w-[84rem]"
                formButtonsProps={{
                    cancelProps: {
                        children: 'Close',
                        onClick: handleClose
                    },
                    confirmProps: {
                        children: isSaving ? 'Saving Changes...' : (
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon size={16} weight="bold" />
                                <span>
                                    {totalChanges > 0
                                        ? `Save Changes (${totalChanges})`
                                        : 'No Changes to Save'}
                                </span>
                            </div>
                        ),
                        disabled: totalChanges === 0 || isSaving,
                        onClick: () => setShowSaveConfirm(true)
                    }
                }}
                open={open}
                onClose={handleClose}
            >
                <div className="flex flex-col gap-4">
                    {/* Student Info & Term Header Banner */}
                    <div className="bg-(--mui-palette-action-hover)/40 border border-(--mui-palette-divider) flex flex-wrap gap-4 items-center justify-between p-3.5 rounded-xl">
                        <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                            <div className="flex items-center gap-2.5">
                                <IdentificationCardIcon size={24} className="text-(--mui-palette-primary-main) shrink-0" weight="bold" />
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-(--mui-palette-text-secondary) font-medium">Student</span>
                                    <span className="font-bold text-(--mui-palette-text-primary) text-sm">
                                        {detail?.student_name ?? '—'}
                                    </span>
                                    <span className="font-mono text-xs text-(--mui-palette-text-secondary)">
                                        {detail?.student_number ?? '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 sm:pl-4 sm:border-l sm:border-(--mui-palette-divider)">
                                <GraduationCapIcon size={24} className="text-(--mui-palette-info-main) shrink-0" weight="bold" />
                                <div className="flex flex-col">
                                    <span className="text-[11px] text-(--mui-palette-text-secondary) font-medium">Program &amp; Year</span>
                                    <span className="font-semibold text-(--mui-palette-text-primary) text-xs">
                                        {detail?.program_name ?? detail?.program_code ?? '—'}
                                    </span>
                                    <span className="text-xs text-(--mui-palette-text-secondary)">
                                        {detail ? `Year Level ${detail.year_level}` : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Term Switcher */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-semibold text-(--mui-palette-text-secondary) whitespace-nowrap">
                                Term:
                            </span>
                            <div className="w-full sm:w-64">
                                <CommonSelect
                                    fullWidth
                                    options={termOptions}
                                    size="small"
                                    value={termId ?? ''}
                                    onChange={(event) => setTermId(event.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error Banner if any */}
                    {saveErrorMessage && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-700 dark:text-red-300 p-3 rounded-lg text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <WarningCircleIcon size={18} weight="fill" className="text-red-600 shrink-0" />
                                <span>{saveErrorMessage}</span>
                            </div>
                            <button
                                type="button"
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                                onClick={() => setSaveErrorMessage(null)}
                            >
                                <XIcon size={14} weight="bold" />
                            </button>
                        </div>
                    )}

                    {/* Mobile Viewport Segmented Switcher (Visible only on < lg) */}
                    <div className="flex lg:hidden rounded-lg bg-(--mui-palette-action-hover) p-1 gap-1 shrink-0">
                        <button
                            type="button"
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                mobileTab === 'load'
                                    ? 'bg-(--mui-palette-background-paper) text-(--mui-palette-text-primary) shadow-sm'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            onClick={() => setMobileTab('load')}
                        >
                            <span>Student Load</span>
                            <span className="bg-(--mui-palette-primary-main)/10 text-(--mui-palette-primary-main) font-mono text-[11px] px-1.5 py-0.2 rounded-full font-bold">
                                {netCount}
                            </span>
                            {stagedNewSections.length > 0 && (
                                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    +{stagedNewSections.length}
                                </span>
                            )}
                            {markedDropIds.size > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    -{markedDropIds.size}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                mobileTab === 'available'
                                    ? 'bg-(--mui-palette-background-paper) text-(--mui-palette-text-primary) shadow-sm'
                                    : 'text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary)'
                            }`}
                            onClick={() => setMobileTab('available')}
                        >
                            <span>Available Sections</span>
                            <span className="bg-(--mui-palette-action-selected) text-(--mui-palette-text-secondary) font-mono text-[11px] px-1.5 py-0.2 rounded-full font-semibold">
                                {availableSections.length}
                            </span>
                        </button>
                    </div>

                    {/* Main Split Layout: Student Load (Left) + Available Choices Sidebar (Right) */}
                    <div className="flex flex-col lg:flex-row gap-5 min-h-0 lg:min-h-[36rem] max-h-[72vh] lg:max-h-[68vh] overflow-hidden">
                        {/* ================================================================= */}
                        {/* LEFT: Student's Load Bento Workspace                              */}
                        {/* ================================================================= */}
                        <div className={`flex-1 min-w-0 flex-col gap-3 overflow-hidden ${mobileTab === 'load' ? 'flex' : 'hidden lg:flex'}`}>
                            {/* Schedule & Load Header with Real-Time Counters */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-(--mui-palette-divider)">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-(--mui-palette-text-primary) text-base">
                                            Student&apos;s Class Schedule &amp; Load
                                        </h3>
                                        <span className="bg-(--mui-palette-action-hover) text-(--mui-palette-text-primary) font-mono text-xs px-2 py-0.5 rounded-full font-semibold">
                                            {netCount} subjects · {netUnits.toFixed(1)} units
                                        </span>
                                    </div>
                                    <span className="text-xs text-(--mui-palette-text-secondary)">
                                        Blue cards are newly staged to enroll. Red cards are marked to be dropped.
                                    </span>
                                </div>

                                {/* Staged Deltas & Reset Button */}
                                <div className="flex items-center gap-2">
                                    {stagedNewSections.length > 0 && (
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-semibold px-2 py-0.5 rounded-md">
                                            +{stagedNewSections.length} to add (+{stagedUnits.toFixed(1)} u)
                                        </span>
                                    )}
                                    {markedDropIds.size > 0 && (
                                        <span className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs font-semibold px-2 py-0.5 rounded-md">
                                            -{markedDropIds.size} to drop (-{droppedUnits.toFixed(1)} u)
                                        </span>
                                    )}
                                    {totalChanges > 0 && (
                                        <CommonButton
                                            color="inherit"
                                            size="small"
                                            startIcon={<ArrowsClockwiseIcon size={14} />}
                                            variant="outlined"
                                            onClick={handleResetAllChanges}
                                        >
                                            Reset
                                        </CommonButton>
                                    )}
                                </div>
                            </div>

                            {/* Bento Cards Container for Left Workspace */}
                            <div className="flex-1 overflow-y-auto pr-1">
                                {currentActiveLoad.length === 0 && stagedNewSections.length === 0 ? (
                                    <div className="border border-dashed border-(--mui-palette-divider) rounded-xl p-12 text-center flex flex-col items-center justify-center gap-2 text-(--mui-palette-text-secondary)">
                                        <CalendarBlankIcon size={36} className="text-(--mui-palette-text-disabled)" />
                                        <span className="font-semibold text-sm">No Enrolled or Staged Sections</span>
                                        <span className="text-xs max-w-sm">
                                            This student is not enrolled in any sections for this term. Select available sections from the sidebar on the right to build their load.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                                        {/* 1. Existing Enrolled Sections (Normal or Marked for Drop) */}
                                        {currentActiveLoad.map(function(row) {
                                            const isMarkedDrop = markedDropIds.has(row.enrollment_id);
                                            const item: StudentLoadCardItem = {
                                                id: row.enrollment_id,
                                                section_id: row.section_id,
                                                course_code: row.course_code,
                                                course_title: row.course_title,
                                                section_code: row.section_code,
                                                units: row.units,
                                                schedule_label: row.schedule_label,
                                                faculty_name: row.faculty_name,
                                                status: row.status
                                            };

                                            return (
                                                <StudentLoadBentoCard
                                                    item={item}
                                                    key={row.enrollment_id}
                                                    state={isMarkedDrop ? 'dropped' : 'enrolled'}
                                                    onDrop={() => handleMarkDrop(row.enrollment_id)}
                                                    onUndoDrop={() => handleUndoDrop(row.enrollment_id)}
                                                />
                                            );
                                        })}

                                        {/* 2. Newly Staged Sections in BLUE */}
                                        {stagedNewSections.map(function(sec) {
                                            const item: StudentLoadCardItem = {
                                                id: sec.section_id,
                                                section_id: sec.section_id,
                                                course_code: sec.course_code,
                                                course_title: sec.course_title,
                                                section_code: sec.section_code,
                                                units: sec.units,
                                                schedule_label: sec.schedule_label,
                                                faculty_name: sec.faculty_name,
                                                room: sec.room,
                                                conflict_with: sec.conflict_with,
                                                unmet_prerequisites: sec.unmet_prerequisites
                                            };

                                            return (
                                                <StudentLoadBentoCard
                                                    item={item}
                                                    key={`staged-${sec.section_id}`}
                                                    state="new"
                                                    onRemoveNew={() => handleUnstageSection(sec.section_id)}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Overrides form for Staged Sections (Conflicts & Prerequisites) */}
                            {(hasSelectedConflict || hasSelectedPrerequisiteGap) && (
                                <div className="bg-(--mui-palette-warning-50)/30 border border-(--mui-palette-warning-main)/40 rounded-xl p-3 flex flex-col gap-2 shrink-0">
                                    <span className="font-semibold text-xs text-(--mui-palette-warning-dark) flex items-center gap-1.5">
                                        <WarningCircleIcon size={16} weight="fill" className="text-(--mui-palette-warning-main)" />
                                        <span>Registrar Authorization Required for Staged Sections</span>
                                    </span>

                                    {hasSelectedPrerequisiteGap && (
                                        <ValidCommonCheckbox
                                            control={overrideMethods.control}
                                            hasHelper
                                            label="Authorize prerequisite override for staged sections"
                                            name="override_prerequisites"
                                            rules={{ required: 'Please confirm prerequisite override before saving' }}
                                        />
                                    )}

                                    {hasSelectedConflict && (
                                        <div className="flex flex-col gap-1.5">
                                            <ValidCommonCheckbox
                                                control={overrideMethods.control}
                                                hasHelper
                                                label="Authorize overlapping schedule conflict(s)"
                                                name="allow_conflict"
                                                rules={{ required: 'Please authorize the schedule conflict before saving' }}
                                            />
                                            {allowConflict && (
                                                <ValidCommonInput
                                                    control={overrideMethods.control}
                                                    hasHelper
                                                    name="conflict_reason"
                                                    placeholder="Required: State the reason for authorizing this schedule overlap..."
                                                    rules={{ required: 'Conflict authorization reason is required' }}
                                                    size="small"
                                                />
                                            )}
                                        </div>
                                    )}

                                    <FormErrorSummary control={overrideMethods.control} />
                                </div>
                            )}
                        </div>

                        {/* ================================================================= */}
                        {/* RIGHT: Available Section Choices Sidebar                          */}
                        {/* ================================================================= */}
                        <div className={`w-full lg:w-96 xl:w-[26rem] shrink-0 flex-col gap-3 lg:border-t-0 lg:border-l border-(--mui-palette-divider) lg:pt-0 lg:pl-5 overflow-hidden ${mobileTab === 'available' ? 'flex' : 'hidden lg:flex'}`}>
                            {/* Sidebar Header */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-(--mui-palette-text-primary) text-base">
                                        Available Sections
                                    </h3>
                                    <span className="text-xs text-(--mui-palette-text-secondary)">
                                        {availableSections.length} choices
                                    </span>
                                </div>
                                <span className="text-[11px] text-(--mui-palette-text-secondary)">
                                    Click any card to add it to the student&apos;s schedule in blue.
                                </span>

                                {/* Quick Search Bar */}
                                <div className="flex items-center gap-1.5 pt-1">
                                    <CommonInput
                                        fullWidth
                                        placeholder="Search course, code or faculty..."
                                        size="small"
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <MagnifyingGlassIcon size={15} />
                                                    </InputAdornment>
                                                )
                                            }
                                        }}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSearchSubmit();
                                        }}
                                    />
                                    <CommonButton
                                        color={showFilters ? 'primary' : 'inherit'}
                                        size="small"
                                        title="Toggle advanced curriculum filters"
                                        variant="outlined"
                                        onClick={() => setShowFilters((prev) => !prev)}
                                    >
                                        <FunnelIcon size={16} />
                                    </CommonButton>
                                </div>

                                {/* Advanced Filters Panel (Collapsible) */}
                                {showFilters && (
                                    <div className="mt-1">
                                        <EligibleSectionFilterBar
                                            control={filterMethods.control}
                                            isScopeLocked={sectionFilters.scope === 'recommended'}
                                        />
                                    </div>
                                )}

                                {/* Prescribed vs All Scope note */}
                                <div className="flex items-center justify-between text-[11px] text-(--mui-palette-text-secondary) pt-1">
                                    <span>
                                        Scope: <strong className="text-(--mui-palette-text-primary)">{sectionFilters.scope === 'recommended' ? 'Prescribed Curriculum' : 'All Curriculum'}</strong>
                                    </span>
                                    {sectionFilters.scope === 'recommended' && (
                                        <button
                                            type="button"
                                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                                            onClick={() => filterMethods.setValue('scope', 'all')}
                                        >
                                            View all courses
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Bento Cards List for Sidebar */}
                            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                                {isAvailableLoading ? (
                                    <div className="py-12 text-center text-xs text-(--mui-palette-text-secondary)">
                                        Loading available sections...
                                    </div>
                                ) : availableSections.length === 0 ? (
                                    <div className="border border-dashed border-(--mui-palette-divider) rounded-xl p-8 text-center flex flex-col items-center justify-center gap-1 text-(--mui-palette-text-secondary)">
                                        <span className="font-semibold text-xs">No sections available</span>
                                        <span className="text-[11px]">
                                            {sectionFilters.scope === 'recommended'
                                                ? 'No prescribed sections found for Year ' + (detail?.year_level ?? '') + '. Switch scope to "All curriculum courses" to view alternatives.'
                                                : 'No sections match the current filters.'}
                                        </span>
                                    </div>
                                ) : (
                                    availableSections.map(function(sec) {
                                        const isEnrolled = enrolledSectionIds.has(sec.section_id);
                                        const isStaged = stagedSectionIds.has(sec.section_id);

                                        return (
                                            <AvailableSectionBentoCard
                                                isEnrolled={isEnrolled}
                                                isStaged={isStaged}
                                                key={sec.section_id}
                                                section={sec}
                                                onSelect={handleStageSection}
                                                onUnstage={handleUnstageSection}
                                            />
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CommonActionModal>

            {/* Confirmation Dialog before applying changes */}
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Go Back',
                        onClick: () => setShowSaveConfirm(false)
                    },
                    confirmProps: {
                        children: isSaving ? 'Applying...' : 'Yes, Apply Changes',
                        disabled: isSaving,
                        onClick: overrideMethods.handleSubmit(handleExecuteSave, handleSaveValidationFailed)
                    }
                }}
                mainContent={{
                    title: `Apply enrollment updates for ${detail?.student_name ?? 'student'}?`
                }}
                open={showSaveConfirm}
                subContent={{
                    title: `You are staging +${stagedNewSections.length} new section(s) and dropping -${markedDropIds.size} section(s). The student's net load will be ${netCount} subjects (${netUnits.toFixed(1)} units).`
                }}
                onClose={() => setShowSaveConfirm(false)}
            />
        </>
    );
}