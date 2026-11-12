import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import Step1FacultyLoadOverview from '@pages/dean/faculty-load/Step1FacultyLoadOverview';
import Step2FacultyLoadSectionList from '@pages/dean/faculty-load/Step2FacultyLoadSectionList';
import Step3FacultyLoadConflicts from '@pages/dean/faculty-load/Step3FacultyLoadConflicts';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChalkboardTeacherIcon,
    PlusIcon,
    XIcon
} from '@phosphor-icons/react';
import { getFacultyLoadDetail } from '@services/faculty-load.service';
import { useToastStore } from '@stores/toast.store';
import {
    FacultyLoadDetail,
    FacultyLoadSection,
    FacultyScheduleConflict
} from '@type/faculty-load.type';
import { evaluateSectionConflicts } from '@utils/faculty-load-conflicts.util';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// The faculty load RPC returns some unit and id fields under alternate names
type RawFacultyLoadSection = FacultyLoadSection & {
    id?: string;
    laboratory_units?: number | string;
    total_units?: number | string;
};

const FACULTY_LOAD_STEPS = [
    {
        step: 1,
        title: 'Overview',
        subtitle: 'Faculty identity, load statistics, and weekly teaching timetable'
    },
    {
        step: 2,
        title: 'Section List',
        subtitle: 'Assigned sections, capacity, and meeting times'
    },
    {
        step: 3,
        title: 'Conflict',
        subtitle: 'Classes in this faculty member\'s load that meet at the same time'
    }
];

interface FacultyLoadWizardModalProps {
    open: boolean;
    facultyId: string | null;
    termId?: string | null;
    onClose: VoidFunction;
}

/**
 * Read-only view of one faculty member's teaching load. Sections are changed in Section
 * Management.
 */
export default function FacultyLoadWizardModal({
    open,
    facultyId,
    termId = null,
    onClose
}: FacultyLoadWizardModalProps) {
    const navigate = useNavigate();
    const { showToast } = useToastStore();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [detail, setDetail] = useState<FacultyLoadDetail | null>(null);
    const [sections, setSections] = useState<FacultyLoadSection[]>([]);

    /**
     * Opens Section Management with a new section prefilled for this faculty member.
     */
    function handleAssignNewSection() {
        onClose();
        if (facultyId) {
            navigate(`/dean/section-management?createSection=true&facultyId=${facultyId}`);
        }
    }

    // Load faculty load detail
    const loadDetail = useCallback(async() => {
        if (!facultyId) return;
        setIsLoading(true);
        try {
            const res = await getFacultyLoadDetail(facultyId, termId);
            if (res.data) {
                if (res.data.success === false) {
                    showToast(res.data.message || 'Faculty record not found.', 'error');
                    setDetail(null);
                    setSections([]);
                    return;
                }

                setDetail(res.data);
                const rawSections = (res.data.sections || res.data.assigned_sections || []) as RawFacultyLoadSection[];
                const fetchedSections: FacultyLoadSection[] = rawSections.map((s) => ({
                    ...s,
                    section_id: s.section_id || s.id || '',
                    units: Number(s.units) || Number(s.total_units) || 0,
                    lecture_units: Number(s.lecture_units) || 0,
                    lab_units: Number(s.lab_units) || Number(s.laboratory_units) || 0,
                    max_slots: Number(s.max_slots) || 40,
                    enrolled_count: Number(s.enrolled_count) || 0,
                    faculty_id: s.faculty_id || facultyId,
                    faculty_name: s.faculty_name || res.data?.faculty?.faculty_name || '',
                    term_label: s.term_label || 'Active Term',
                    schedules: s.schedules || []
                }));
                setSections(fetchedSections);
            }
        }
        catch (err) {
            showToast((err as { message?: string } | null)?.message || 'Failed to load faculty details.', 'error');
        }
        finally {
            setIsLoading(false);
        }
    }, [facultyId, termId, showToast]);

    useEffect(() => {
        if (open && facultyId) {
            setCurrentStep(1);
            loadDetail();
        }
        else {
            setDetail(null);
            setSections([]);
            setCurrentStep(1);
        }
    }, [open, facultyId, loadDetail]);

    // Overlaps within the load, plus any the server reported
    const activeConflicts = useMemo<FacultyScheduleConflict[]>(() => {
        const localConflicts = evaluateSectionConflicts(sections, detail?.faculty?.faculty_name);

        const backendConflicts = detail?.conflicts || [];
        const sectionIds = new Set(sections.map((s) => s.section_id));

        const relevantBackend = backendConflicts.filter((bc) =>
            sectionIds.has(bc.section_a_id) || sectionIds.has(bc.section_b_id));

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
    }, [sections, detail]);

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

    const currentStepConfig = FACULTY_LOAD_STEPS.find((s) => s.step === currentStep);

    return (
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
                                Faculty Teaching Load Details
                                {detail?.faculty?.faculty_name
                                    ? ` — ${detail.faculty.faculty_name}`
                                    : ''}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Review faculty workload, assigned sections, and schedule conflicts.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Opens Section Management to create a section for this faculty member */}
                        <CommonButton
                            className="!bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40"
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            variant="outlined"
                            onClick={handleAssignNewSection}
                        >
                            Assign New Section
                        </CommonButton>

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
                readOnly
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
                    : (detail && detail.faculty)
                        ? (
                            <>
                                {currentStep === 1 && (
                                    <Step1FacultyLoadOverview
                                        conflicts={activeConflicts}
                                        faculty={detail.faculty}
                                        sections={sections}
                                        termLabel={sections[0]?.term_label || detail.sections?.[0]?.term_label}
                                    />
                                )}

                                {currentStep === 2 && (
                                    <Step2FacultyLoadSectionList
                                        facultyName={detail.faculty.faculty_name}
                                        sections={sections}
                                        onNavigateToSectionManagement={onClose}
                                    />
                                )}

                                {currentStep === 3 && (
                                    <Step3FacultyLoadConflicts
                                        conflicts={activeConflicts}
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
                    disabled={currentStep === 1 || isLoading}
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

                {/* Next / Close Actions */}
                <div className="flex items-center gap-2">
                    {currentStep < 3
                        ? (
                            <CommonButton
                                color="primary"
                                disabled={isLoading}
                                endIcon={<ArrowRightIcon className="w-4 h-4" />}
                                size="medium"
                                variant="contained"
                                onClick={handleNext}
                            >
                                Next Step
                            </CommonButton>
                        )
                        : (
                            <CommonButton
                                color="primary"
                                size="medium"
                                variant="contained"
                                onClick={onClose}
                            >
                                Close
                            </CommonButton>
                        )}
                </div>
            </div>
        </CommonModal>
    );
}