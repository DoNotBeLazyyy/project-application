import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import { useFormDraft } from '@hooks/useFormDraft';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarCheckIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    MagnifyingGlassIcon,
    UsersIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    createAttendanceSession,
    getAttendanceRecords,
    listAttendanceSessions,
    listSectionStudents,
    saveAttendanceRecords
} from '@services/faculty.service';
import { useToastStore } from '@stores/toast.store';
import { AttendanceRecordUpdate, AttendanceSession, AttendanceStatus, SectionStudent } from '@type/faculty.type';
import { formatDate } from '@utils/date.util';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

export const ATTENDANCE_WIZARD_STEPS: ModalStepItem[] = [
    {
        step: 1,
        title: 'Session Overview',
        subtitle: 'Date, session topic, and default attendance status'
    },
    {
        step: 2,
        title: 'Student List',
        subtitle: 'Review roster and mark attendance for enrolled students'
    }
];

interface AttendanceSessionWizardModalProps {
    open: boolean;
    sectionId: string;
    onClose: VoidFunction;
    onSuccess: (newSession?: AttendanceSession) => void;
}

type SessionFormat = 'Lecture' | 'Laboratory' | 'Online' | 'Activity';

const SESSION_FORMAT_OPTIONS: { label: string; value: SessionFormat }[] = [
    { label: 'Lecture', value: 'Lecture' },
    { label: 'Laboratory', value: 'Laboratory' },
    { label: 'Online', value: 'Online' },
    { label: 'Activity', value: 'Activity' }
];

interface AttendanceSessionWizardValues {
    session_date: string;
    session_type: SessionFormat;
    notes: string;
}

function getDefaultValues(): AttendanceSessionWizardValues {
    // Local calendar date - toISOString() would roll back a day before 8 AM in UTC+8
    return {
        notes: '', session_date: formatDate(new Date()), session_type: 'Lecture'
    };
}

interface StudentAttendanceDraft {
    studentId: string;
    studentNumber: string;
    fullName: string;
    status: AttendanceStatus;
    remarks: string;
}

export default function AttendanceSessionWizardModal({
    open,
    sectionId,
    onClose,
    onSuccess
}: AttendanceSessionWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [defaultStatus, setDefaultStatus] = useState<AttendanceStatus>('Present');
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const [existingSessionDates, setExistingSessionDates] = useState<string[]>([]);

    const [students, setStudents] = useState<SectionStudent[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentDrafts, setStudentDrafts] = useState<Record<string, StudentAttendanceDraft>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const showToast = useToastStore((s) => s.showToast);

    const methods = useForm<AttendanceSessionWizardValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: getDefaultValues() });

    const draftGuard = useFormDraft({
        control: methods.control,
        enabled: open && !isSaving,
        formId: `attendance-wizard-${sectionId}`
    });

    const hasStudentDraftChanges = useMemo(
        () => Object.values(studentDrafts)
            .some((d) => d.status !== 'Present' || Boolean(d.remarks?.trim())),
        [studentDrafts]
    );
    const hasRealChanges = draftGuard.hasRealChanges || hasStudentDraftChanges;

    // Fetch students when modal opens
    useEffect(() => {
        if (!open || !sectionId) return;

        // Reset wizard state
        setCurrentStep(1);
        methods.reset(getDefaultValues());
        setDefaultStatus('Present');
        setSearchQuery('');
        setIsConfirmCloseOpen(false);

        // fn_create_attendance_session rejects a second session on the same date
        listAttendanceSessions(sectionId)
            .then((res) => {
                setExistingSessionDates((res.data ?? []).map((session) => session.session_date));
            });

        async function fetchRoster() {
            setIsLoadingStudents(true);
            const res = await listSectionStudents(sectionId, 1, 200, '', []);
            setIsLoadingStudents(false);

            if (res.data?.content) {
                setStudents(res.data.content);
                const initialMap: Record<string, StudentAttendanceDraft> = {};
                for (const s of res.data.content) {
                    initialMap[s.enrollment_id] = {
                        fullName: s.full_name,
                        remarks: '',
                        status: 'Present',
                        studentId: s.enrollment_id,
                        studentNumber: s.student_number
                    };
                }
                setStudentDrafts(initialMap);
            }
        }

        fetchRoster();
    }, [open, sectionId]);

    // When defaultStatus changes, initialize draft statuses if not touched
    function handleDefaultStatusChange(newStatus: AttendanceStatus) {
        setDefaultStatus(newStatus);
        setStudentDrafts((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                next[key] = { ...next[key], status: newStatus };
            }
            return next;
        });
    }

    function handleStudentStatusChange(enrollmentId: string, status: AttendanceStatus) {
        setStudentDrafts((prev) => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                status
            }
        }));
    }

    function handleBulkSet(status: AttendanceStatus) {
        setStudentDrafts((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                next[key] = { ...next[key], status };
            }
            return next;
        });
    }

    // Counts
    const counts = useMemo(() => {
        let present = 0;
        let late = 0;
        let absent = 0;
        let excused = 0;

        for (const draft of Object.values(studentDrafts)) {
            if (draft.status === 'Present') present++;
            else if (draft.status === 'Late') late++;
            else if (draft.status === 'Absent') absent++;
            else if (draft.status === 'Excused') excused++;
        }

        return {
            absent, excused, late, present, total: Object.keys(studentDrafts).length
        };
    }, [studentDrafts]);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(
            (s) =>
                s.full_name.toLowerCase()
                    .includes(q)
                || s.student_number.toLowerCase()
                    .includes(q)
        );
    }, [students, searchQuery]);

    const step1Fields: FormFieldConfig<AttendanceSessionWizardValues>[] = [
        {
            gridCols: 1,
            label: 'Session Date',
            name: 'session_date',
            rules: {
                required: 'Please select a valid session date.',
                validate: (value) => !existingSessionDates.includes(String(value)) || 'An attendance session already exists for this date.'
            },
            type: 'date'
        },
        {
            gridCols: 1,
            label: 'Session Format',
            name: 'session_type',
            options: SESSION_FORMAT_OPTIONS,
            rules: { required: 'Required' },
            type: 'select'
        },
        {
            gridCols: 2,
            label: 'Agenda / Topic / Session Notes',
            name: 'notes',
            placeholder: 'e.g. Chapter 4: Neural Architectures & Lab Practical Activity #2',
            type: 'text-area'
        }
    ];

    async function validateStep1(): Promise<boolean> {
        const isValid = await methods.trigger(['session_date', 'session_type', 'notes']);
        if (!isValid) {
            setCurrentStep(1);
            formErrors(methods.formState.errors, methods);
        }
        return isValid;
    }

    async function handleNextStep() {
        if (currentStep === 1 && !(await validateStep1())) return;
        setCurrentStep((prev) => prev + 1);
    }

    async function handleSaveSession() {
        if (!(await validateStep1())) {
            return;
        }

        const { notes, session_date: sessionDate, session_type: sessionType } = methods.getValues();

        setIsSaving(true);
        try {
            const formattedNotes = notes.trim()
                ? `[${sessionType}] ${notes.trim()}`
                : `[${sessionType}]`;

            const createRes = await createAttendanceSession(sectionId, {
                notes: formattedNotes,
                session_date: sessionDate
            });

            if (createRes.error) {
                showToast(createRes.error.message || 'Failed to create attendance session.', 'error');
                setIsSaving(false);
                return;
            }

            // Find the created session
            const sessionsRes = await listAttendanceSessions(sectionId);
            const createdSession = sessionsRes.data?.find(
                (s) => s.session_date === sessionDate
            ) || sessionsRes.data?.[0];

            if (createdSession) {
                // Fetch default generated records to get record IDs
                const recordsRes = await getAttendanceRecords(createdSession.id);
                if (recordsRes.data && recordsRes.data.length > 0) {
                    const updates: AttendanceRecordUpdate[] = recordsRes.data.map((r) => {
                        const customDraft = studentDrafts[r.enrollment_id];
                        return {
                            id: r.id,
                            remarks: customDraft?.remarks || '',
                            status: customDraft?.status || defaultStatus
                        };
                    });

                    await saveAttendanceRecords(createdSession.id, updates);
                }
            }

            draftGuard.clearDraft();
            showToast('Attendance session recorded successfully.', 'success');
            onSuccess(createdSession);
            onClose();
        }
        catch {
            setIsSaving(false);
            showToast('An unexpected error occurred while saving the attendance session.', 'error');
        }
    }

    function handleCloseModal() {
        if (isSaving) return;
        if (hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleDiscardAndClose() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        onClose();
    }

    if (!open) return null;

    return (
        <CommonModal
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleCloseModal}
        >
            <div className="flex flex-col h-[85vh] max-h-[760px] bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden">
                {/* Stepper Header */}
                <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                                <CalendarDotsIcon
                                    size={20}
                                    weight="duotone"
                                />
                            </div>
                            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                                New Attendance Session
                            </span>
                        </div>
                        <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            type="button"
                            onClick={handleCloseModal}
                        >
                            <XIcon
                                size={18}
                                weight="bold"
                            />
                        </button>
                    </div>

                    <ModalStepperHeader
                        currentStep={currentStep}
                        steps={ATTENDANCE_WIZARD_STEPS}
                        onStepClick={async(step) => {
                            if (step > currentStep && currentStep === 1 && !(await validateStep1())) return;
                            setCurrentStep(step);
                        }}
                    />
                </div>

                {/* Step Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                    {currentStep === 1 && (
                        <div className="flex flex-col gap-5 max-w-2xl mx-auto">
                            {/* Card: Session Date & Type */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                                    <CalendarCheckIcon
                                        className="text-blue-600"
                                        size={18}
                                        weight="duotone"
                                    />
                                    <span>Date & Session Classification</span>
                                </div>

                                <CommonForm
                                    component="div"
                                    containerClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    control={methods.control}
                                    enableDraftRecovery={false}
                                    fields={step1Fields}
                                />
                            </div>

                            {/* Card: Default Student Mark */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                                    <UsersIcon
                                        className="text-blue-600"
                                        size={18}
                                        weight="duotone"
                                    />
                                    <span>Default Attendance Baseline</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Choose the starting mark for all {students.length} enrolled students in this section. You can customize any individual student in Step 2.
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                    {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map((status) => {
                                        const isSelected = defaultStatus === status;
                                        return (
                                            <button
                                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold'
                                                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                                                }`}
                                                key={status}
                                                type="button"
                                                onClick={() => handleDefaultStatusChange(status)}
                                            >
                                                <span className="text-xs font-bold">{status}</span>
                                                <span className="text-[10px] text-slate-400">Default all</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="flex flex-col gap-4 max-w-4xl mx-auto h-full">
                            {/* Summary Bar & Fast Bulk Actions */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                                {/* Bento Metric Badges */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                                        Total: {counts.total}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        Present: {counts.present}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        Late: {counts.late}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                        Absent: {counts.absent}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        Excused: {counts.excused}
                                    </span>
                                </div>

                                {/* Quick Bulk Actions */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                        type="button"
                                        onClick={() => handleBulkSet('Present')}
                                    >
                                        All Present
                                    </button>
                                    <button
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                                        type="button"
                                        onClick={() => handleBulkSet('Absent')}
                                    >
                                        All Absent
                                    </button>
                                </div>
                            </div>

                            {/* Search Filter */}
                            <CommonInput
                                fullWidth
                                placeholder="Search student by name or ID number..."
                                size="small"
                                slotProps={{
                                    input: {
                                        startAdornment: <MagnifyingGlassIcon
                                            className="mr-2 text-slate-400"
                                            size={16}
                                        />
                                    }
                                }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {/* Student Cards List */}
                            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
                                {isLoadingStudents ? (
                                    <div className="py-12 text-center text-xs text-slate-400">
                                        Loading section roster...
                                    </div>
                                ) : filteredStudents.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400">
                                        No students found matching your search.
                                    </div>
                                ) : (
                                    filteredStudents.map((s) => {
                                        const draft = studentDrafts[s.enrollment_id] || {
                                            fullName: s.full_name,
                                            remarks: '',
                                            status: defaultStatus,
                                            studentId: s.enrollment_id,
                                            studentNumber: s.student_number
                                        };

                                        return (
                                            <div
                                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                                key={s.enrollment_id}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                                                        {s.full_name
                                                            .split(' ')
                                                            .map((w) => w[0])
                                                            .slice(0, 2)
                                                            .join('')}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                                            {s.full_name}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-slate-400">
                                                            {s.student_number}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Tactile Status Buttons */}
                                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                    {(['Present', 'Late', 'Absent', 'Excused'] as AttendanceStatus[]).map((status) => {
                                                        const isSelected = draft.status === status;
                                                        let colorClasses = 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800';

                                                        if (isSelected) {
                                                            if (status === 'Present') {
                                                                colorClasses = 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold';
                                                            }
                                                            else if (status === 'Late') {
                                                                colorClasses = 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold';
                                                            }
                                                            else if (status === 'Absent') {
                                                                colorClasses = 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold';
                                                            }
                                                            else {
                                                                colorClasses = 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold';
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${colorClasses}`}
                                                                key={status}
                                                                type="button"
                                                                onClick={() => handleStudentStatusChange(s.enrollment_id, status)}
                                                            >
                                                                {status}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 p-4 sm:p-5 flex items-center justify-between">
                    <CommonButton
                        disabled={isSaving}
                        size="small"
                        variant="outlined"
                        onClick={handleCloseModal}
                    >
                        Cancel
                    </CommonButton>

                    <div className="flex items-center gap-2">
                        {currentStep > 1 && (
                            <CommonButton
                                disabled={isSaving}
                                size="small"
                                startIcon={(
                                    <ArrowLeftIcon
                                        size={14}
                                        weight="bold"
                                    />
                                )}
                                variant="outlined"
                                onClick={() => setCurrentStep((prev) => prev - 1)}
                            >
                                Back
                            </CommonButton>
                        )}

                        {currentStep < ATTENDANCE_WIZARD_STEPS.length
                            ? (
                                <CommonButton
                                    endIcon={(
                                        <ArrowRightIcon
                                            size={14}
                                            weight="bold"
                                        />
                                    )}
                                    size="small"
                                    variant="contained"
                                    onClick={handleNextStep}
                                >
                                Continue to Student List
                                </CommonButton>
                            )
                            : (
                                <CommonButton
                                    disabled={isSaving}
                                    loading={isSaving}
                                    size="small"
                                    startIcon={(
                                        <CheckCircleIcon
                                            size={16}
                                            weight="bold"
                                        />
                                    )}
                                    variant="contained"
                                    onClick={handleSaveSession}
                                >
                                    {isSaving
                                        ? 'Recording Session...'
                                        : 'Create Session'}
                                </CommonButton>
                            )}
                    </div>
                </div>
            </div>
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={() => setIsConfirmCloseOpen(false)}
                onDiscard={handleDiscardAndClose}
            />
        </CommonModal>
    );
}