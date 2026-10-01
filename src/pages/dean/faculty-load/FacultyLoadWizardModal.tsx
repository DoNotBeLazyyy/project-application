import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import Step1FacultyLoadOverview from '@pages/dean/faculty-load/Step1FacultyLoadOverview';
import Step2FacultyLoadSectionList from '@pages/dean/faculty-load/Step2FacultyLoadSectionList';
import Step3FacultyLoadConflicts from '@pages/dean/faculty-load/Step3FacultyLoadConflicts';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChalkboardTeacherIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    PlusIcon,
    XIcon
} from '@phosphor-icons/react';
import { getFacultyLoadDetail, saveFacultyLoadAssignments } from '@services/faculty-load.service';
import { getFacultyOptions, getSectionById, getSections } from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import {
    FacultyLoadAssignmentInput,
    FacultyLoadDetail,
    FacultyLoadSection,
    FacultyScheduleConflict
} from '@type/faculty-load.type';
import { evaluateSectionConflicts } from '@utils/faculty-load-conflicts.util';
import { useCallback, useEffect, useMemo, useState } from 'react';

const FACULTY_LOAD_STEPS = [
    {
        step: 1,
        title: 'Overview',
        subtitle: 'Faculty identity, load statistics, and weekly teaching timetable'
    },
    {
        step: 2,
        title: 'Section List',
        subtitle: 'Assigned sections, capacity, meeting times, and instructor assignment'
    },
    {
        step: 3,
        title: 'Conflict',
        subtitle: 'Schedule overlaps and classroom collision detection'
    }
];

interface FacultyOption {
    label: string;
    value: string;
}

interface FacultyLoadWizardModalProps {
    open: boolean;
    facultyId: string | null;
    termId?: string | null;
    initialReadOnly?: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function FacultyLoadWizardModal({
    open,
    facultyId,
    termId = null,
    initialReadOnly = true,
    onClose,
    onSuccess
}: FacultyLoadWizardModalProps) {
    const { showToast } = useToastStore();
    const [currentStep, setCurrentStep] = useState(1);
    const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Baseline server detail and staged working state
    const [detail, setDetail] = useState<FacultyLoadDetail | null>(null);
    const [initialSections, setInitialSections] = useState<FacultyLoadSection[]>([]);
    const [stagedSections, setStagedSections] = useState<FacultyLoadSection[]>([]);
    const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);

    // Assigning sections dialog state
    const [isAssignPickerOpen, setIsAssignPickerOpen] = useState(false);
    const [availableOfferings, setAvailableOfferings] = useState<{ id: string; label: string }[]>([]);
    const [selectedAssignSectionId, setSelectedAssignSectionId] = useState('');

    // Delete section confirmation popup state
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<FacultyLoadSection | null>(null);

    // Fetch faculty options for dropdown
    useEffect(() => {
        if (!open) return;
        getFacultyOptions()
            .then((res) => {
                if (res.data) {
                    setFacultyOptions(
                        res.data.map((f) => ({
                            label: f.full_name,
                            value: f.id
                        }))
                    );
                }
            });
    }, [open]);

    // Load faculty load detail
    const loadDetail = useCallback(async() => {
        if (!facultyId) return;
        setIsLoading(true);
        try {
            const res = await getFacultyLoadDetail(facultyId, termId);
            if (res.data) {
                setDetail(res.data);
                const fetchedSections = res.data.sections || [];
                setInitialSections(fetchedSections);
                setStagedSections(fetchedSections);
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [facultyId, termId]);

    useEffect(() => {
        if (open && facultyId) {
            setCurrentStep(1);
            setIsReadOnly(initialReadOnly);
            loadDetail();
        }
        else {
            setDetail(null);
            setInitialSections([]);
            setStagedSections([]);
            setCurrentStep(1);
        }
    }, [open, facultyId, initialReadOnly, loadDetail]);

    // Calculate dynamic conflicts for staged sections
    const activeConflicts = useMemo<FacultyScheduleConflict[]>(() => {
        const localConflicts = evaluateSectionConflicts(stagedSections, detail?.faculty.faculty_name);

        // Merge with any backend-reported room conflicts that apply to remaining staged sections
        const backendConflicts = detail?.conflicts || [];
        const stagedSectionIds = new Set(stagedSections.map((s) => s.section_id));

        const relevantBackend = backendConflicts.filter((bc) =>
            stagedSectionIds.has(bc.section_a_id) || stagedSectionIds.has(bc.section_b_id));

        // Deduplicate
        const merged: FacultyScheduleConflict[] = [...localConflicts];
        const existingKeys = new Set(localConflicts.map((c) => `${c.section_a_id}-${c.section_b_id}-${c.day_of_week}`));

        for (const bc of relevantBackend) {
            const key1 = `${bc.section_a_id}-${bc.section_b_id}-${bc.day_of_week}`;
            const key2 = `${bc.section_b_id}-${bc.section_a_id}-${bc.day_of_week}`;
            if (!existingKeys.has(key1) && !existingKeys.has(key2)) {
                existingKeys.add(key1);
                merged.push(bc);
            }
        }

        return merged;
    }, [stagedSections, detail]);

    // Track staged modifications
    const hasChanges = useMemo(() => {
        if (stagedSections.length !== initialSections.length) return true;

        const initialMap = new Map(initialSections.map((s) => [s.section_id, s.faculty_id]));
        for (const sec of stagedSections) {
            const initialFacId = initialMap.get(sec.section_id);
            if (initialFacId === undefined) return true; // newly added
            if (initialFacId !== sec.faculty_id) return true; // reassigned
        }

        return false;
    }, [stagedSections, initialSections]);

    // Handler: change assigned faculty of a section in write mode
    function handleFacultyChange(sectionId: string, newFacultyId: string | null) {
        setStagedSections((prev) =>
            prev.map((sec) => {
                if (sec.section_id === sectionId) {
                    const matchedFac = facultyOptions.find((f) => f.value === newFacultyId);
                    return {
                        ...sec,
                        faculty_id: newFacultyId,
                        faculty_name: matchedFac
                            ? matchedFac.label
                            : (newFacultyId
                                ? sec.faculty_name
                                : 'Unassigned')
                    };
                }
                return sec;
            }));
    }

    // Handler: request delete section (opens confirmation popup)
    function handleRequestDeleteSection(section: FacultyLoadSection) {
        setConfirmDeleteTarget(section);
    }

    // Handler: confirm remove section
    function handleConfirmRemoveSection() {
        if (!confirmDeleteTarget) return;
        setStagedSections((prev) =>
            prev.filter((sec) => sec.section_id !== confirmDeleteTarget.section_id));
        setConfirmDeleteTarget(null);
        showToast(`Section ${confirmDeleteTarget.section_code} removed from load (unsaved).`, 'info');
    }

    // Handler: open assign section picker
    async function handleOpenAssignModal() {
        const sectionsRes = await getSections();
        if (sectionsRes.data) {
            const currentIds = new Set(stagedSections.map((s) => s.section_id));
            const available = sectionsRes.data
                .filter((s) => !currentIds.has(s.id))
                .map((s) => ({
                    id: s.id,
                    label: s.label || s.section_code
                }));
            setAvailableOfferings(available);
            setSelectedAssignSectionId(available[0]?.id || '');
            setIsAssignPickerOpen(true);
        }
    }

    // Handler: add chosen section to staged sections
    async function handleAddSectionToLoad() {
        if (!selectedAssignSectionId) return;

        setIsLoading(true);
        try {
            const res = await getSectionById(selectedAssignSectionId);
            if (res.data) {
                const s = res.data as any;
                const newSection: FacultyLoadSection = {
                    section_id: s.id,
                    section_code: s.section_code,
                    course_id: s.course_id,
                    course_code: s.course_code || 'COURSE',
                    course_title: s.course_title || 'Course Title',
                    term_id: s.term_id,
                    term_label: s.term_label || detail?.sections[0]?.term_label || 'Current Term',
                    program_id: s.program_id,
                    program_code: s.program_code,
                    program_name: s.program_name,
                    faculty_id: facultyId,
                    faculty_name: detail?.faculty.faculty_name,
                    room: s.room,
                    max_slots: Number(s.max_slots) || 40,
                    enrolled_count: Number(s.enrolled_count) || 0,
                    available_slots: Math.max(0, (Number(s.max_slots) || 40) - (Number(s.enrolled_count) || 0)),
                    status: s.status || 'Open',
                    is_active_academic_year: s.is_active_academic_year !== false,
                    lecture_units: Number(s.lecture_units) || 0,
                    lab_units: Number(s.laboratory_units) || 0,
                    units: Number(s.units) || Number(s.total_units) || 3,
                    schedules: (s.schedules || []).map((sch: any) => ({
                        day_of_week: sch.day_of_week,
                        time_start: sch.time_start,
                        time_end: sch.time_end,
                        room: sch.room || s.room || ''
                    }))
                };

                setStagedSections((prev) => [...prev, newSection]);
                setIsAssignPickerOpen(false);
                showToast(`Section ${newSection.section_code} added to load (unsaved).`, 'info');
            }
        }
        finally {
            setIsLoading(false);
        }
    }

    // Handler: Save all changes atomically
    async function handleSave() {
        if (!hasChanges) {
            setIsReadOnly(true);
            return;
        }

        setIsSaving(true);
        try {
            const assignments: FacultyLoadAssignmentInput[] = [];

            // 1. Sections removed from this faculty member (now unassigned or reassigned)
            const stagedMap = new Map(stagedSections.map((s) => [s.section_id, s]));
            for (const initSec of initialSections) {
                if (!stagedMap.has(initSec.section_id)) {
                    // Removed
                    assignments.push({
                        section_id: initSec.section_id,
                        faculty_id: null
                    });
                }
            }

            // 2. Sections in staged state (newly added or faculty changed)
            const initMap = new Map(initialSections.map((s) => [s.section_id, s]));
            for (const stagedSec of stagedSections) {
                const init = initMap.get(stagedSec.section_id);
                if (!init) {
                    // Newly added to this faculty
                    assignments.push({
                        section_id: stagedSec.section_id,
                        faculty_id: stagedSec.faculty_id || facultyId
                    });
                }
                else if (init.faculty_id !== stagedSec.faculty_id) {
                    // Faculty assignment changed
                    assignments.push({
                        section_id: stagedSec.section_id,
                        faculty_id: stagedSec.faculty_id
                    });
                }
            }

            if (assignments.length > 0) {
                const saveRes = await saveFacultyLoadAssignments(assignments);
                if (saveRes.error) {
                    showToast(saveRes.error.message || 'Failed to save assignments.', 'error');
                    return;
                }
            }

            showToast('Faculty load assignments saved successfully.', 'success');
            onSuccess();
            await loadDetail();
            setIsReadOnly(true);
        }
        finally {
            setIsSaving(false);
        }
    }

    // Navigation between steps
    function handleNext() {
        if (currentStep < 3) {
            setCurrentStep((prev) => prev + 1);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    function handleCancel() {
        // Revert staged to initial
        setStagedSections(initialSections);
        setIsReadOnly(true);
    }

    const currentStepConfig = FACULTY_LOAD_STEPS.find((s) => s.step === currentStep);

    return (
        <>
            <CommonModal
                cardProps={{
                    className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
                }}
                fullWidth
                maxWidth="lg"
                open={open}
                onClose={onClose}
            >
                {/* Stepper Top Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                                <ChalkboardTeacherIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1 sm:min-w-[260px]">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                    {isReadOnly
                                        ? 'Faculty Teaching Load Details'
                                        : 'Edit Faculty Teaching Load'}
                                    {detail?.faculty
                                        ? ` — ${detail.faculty.faculty_name}`
                                        : ''}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {isReadOnly
                                        ? 'Review faculty workload, assigned sections, and schedule conflict analysis.'
                                        : 'Update assigned faculty for sections, manage load commitments, and resolve conflicts.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Switch to Edit Mode in header */}
                            {isReadOnly && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={() => setIsReadOnly(false)}
                                >
                                    Edit Load
                                </CommonButton>
                            )}

                            <button
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Close"
                                type="button"
                                onClick={onClose}
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal Stepper Header */}
                <ModalStepperHeader
                    currentStep={currentStep}
                    readOnly={isReadOnly}
                    steps={FACULTY_LOAD_STEPS}
                    onStepClick={(step) => setCurrentStep(step)}
                />

                {/* Wizard Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                    {isLoading && !detail
                        ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-slate-500">Loading faculty load records...</p>
                            </div>
                        )
                        : detail
                            ? (
                                <>
                                    {currentStep === 1 && (
                                        <Step1FacultyLoadOverview
                                            conflicts={activeConflicts}
                                            faculty={detail.faculty}
                                            sections={stagedSections}
                                            termLabel={detail.sections[0]?.term_label}
                                        />
                                    )}

                                    {currentStep === 2 && (
                                        <Step2FacultyLoadSectionList
                                            facultyName={detail.faculty.faculty_name}
                                            facultyOptions={facultyOptions}
                                            isReadOnly={isReadOnly}
                                            sections={stagedSections}
                                            onFacultyChange={handleFacultyChange}
                                            onNavigateToSectionManagement={onClose}
                                            onOpenAssignModal={handleOpenAssignModal}
                                            onRequestDeleteSection={handleRequestDeleteSection}
                                        />
                                    )}

                                    {currentStep === 3 && (
                                        <Step3FacultyLoadConflicts
                                            conflicts={activeConflicts}
                                            facultyName={detail.faculty.faculty_name}
                                            onNavigateToSectionManagement={onClose}
                                        />
                                    )}
                                </>
                            )
                            : (
                                <div className="text-center py-12 text-xs text-slate-500">
                            Faculty record could not be loaded.
                                </div>
                            )}
                </div>

                {/* Stepper Footer Action Bar */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                    {/* Back Button */}
                    <CommonButton
                        color="inherit"
                        disabled={currentStep === 1 || isLoading || isSaving}
                        size="medium"
                        startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                        variant="outlined"
                        onClick={handleBack}
                    >
                        Back
                    </CommonButton>

                    {/* Step indicator */}
                    <div className="hidden sm:block text-xs font-medium text-slate-500">
                        Step {currentStep} of 3 — {currentStepConfig?.title}
                    </div>

                    {/* Next / Save / Cancel Actions */}
                    <div className="flex items-center gap-2">
                        {!isReadOnly && hasChanges && (
                            <CommonButton
                                color="inherit"
                                disabled={isSaving}
                                size="medium"
                                variant="text"
                                onClick={handleCancel}
                            >
                                Revert Changes
                            </CommonButton>
                        )}

                        {currentStep < 3
                            ? (
                                <CommonButton
                                    color="primary"
                                    disabled={isLoading || isSaving}
                                    endIcon={<ArrowRightIcon className="w-4 h-4" />}
                                    size="medium"
                                    variant="contained"
                                    onClick={handleNext}
                                >
                                Next Step
                                </CommonButton>
                            )
                            : isReadOnly
                                ? (
                                    <CommonButton
                                        color="primary"
                                        size="medium"
                                        variant="contained"
                                        onClick={onClose}
                                    >
                                Close
                                    </CommonButton>
                                )
                                : null}

                        {/* Save Button (accessible in write mode) */}
                        {!isReadOnly && (
                            <CommonButton
                                color="primary"
                                disabled={isLoading || isSaving || !hasChanges}
                                loading={isSaving}
                                size="medium"
                                startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={handleSave}
                            >
                                {isSaving
                                    ? 'Saving Changes...'
                                    : 'Save Changes'}
                            </CommonButton>
                        )}
                    </div>
                </div>
            </CommonModal>

            {/* Popup confirmation modal for deleting/removing a section */}
            <DeletePromptModal
                actionIconProps={{
                    iconContainerClassName: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                }}
                formButtonsProps={{
                    confirmProps: {
                        children: 'Yes, Remove Section'
                    }
                }}
                mainContent={{
                    title: 'Remove Section Assignment'
                }}
                open={confirmDeleteTarget !== null}
                subContent={{
                    title: `Are you sure you want to remove section "${confirmDeleteTarget?.section_code} - ${confirmDeleteTarget?.course_code}" from ${detail?.faculty.faculty_name}'s teaching load? This change will be applied upon saving.`
                }}
                onClose={() => setConfirmDeleteTarget(null)}
                onSubmit={handleConfirmRemoveSection}
            />

            {/* Simple Picker Modal for Assigning an Available Section to this Faculty */}
            {isAssignPickerOpen && (
                <CommonModal
                    cardProps={{
                        className: 'w-full max-w-md p-5 flex flex-col gap-4'
                    }}
                    open={isAssignPickerOpen}
                    onClose={() => setIsAssignPickerOpen(false)}
                >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2">
                            <PlusIcon className="w-5 h-5 text-brand-600" weight="bold" />
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Assign Section Offering
                            </h3>
                        </div>
                        <button
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            type="button"
                            onClick={() => setIsAssignPickerOpen(false)}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Select Section Offering to Assign:
                        </label>
                        {availableOfferings.length === 0
                            ? (
                                <span className="text-xs text-slate-500 italic py-2">
                                No additional available sections found in this term.
                                </span>
                            )
                            : (
                                <select
                                    className="w-full text-xs font-medium bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                    value={selectedAssignSectionId}
                                    onChange={(e) => setSelectedAssignSectionId(e.target.value)}
                                >
                                    {availableOfferings.map((off) => (
                                        <option key={off.id} value={off.id}>
                                            {off.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={() => setIsAssignPickerOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            disabled={!selectedAssignSectionId}
                            size="small"
                            variant="contained"
                            onClick={handleAddSectionToLoad}
                        >
                            Add to Load
                        </CommonButton>
                    </div>
                </CommonModal>
            )}
        </>
    );
}