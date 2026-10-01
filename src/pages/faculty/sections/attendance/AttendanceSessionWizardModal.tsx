import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CalendarCheckIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    NotepadIcon,
    UserCircleIcon,
    UsersIcon,
    XCircleIcon,
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
import { useEffect, useMemo, useState } from 'react';

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
    onClose: () => void;
    onSuccess: (newSession?: AttendanceSession) => void;
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
    const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [defaultStatus, setDefaultStatus] = useState<AttendanceStatus>('Present');
    const [sessionType, setSessionType] = useState<'Lecture' | 'Laboratory' | 'Online' | 'Activity'>('Lecture');

    const [students, setStudents] = useState<SectionStudent[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentDrafts, setStudentDrafts] = useState<Record<string, StudentAttendanceDraft>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const showToast = useToastStore((s) => s.showToast);

    // Fetch students when modal opens
    useEffect(() => {
        if (!open || !sectionId) return;

        // Reset wizard state
        setCurrentStep(1);
        setSessionDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setDefaultStatus('Present');
        setSessionType('Lecture');
        setSearchQuery('');

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

    function handleStudentRemarksChange(enrollmentId: string, remarks: string) {
        setStudentDrafts((prev) => ({
            ...prev,
            [enrollmentId]: {
                ...prev[enrollmentId],
                remarks
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

        return { absent, excused, late, present, total: Object.keys(studentDrafts).length };
    }, [studentDrafts]);

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase();
        return students.filter(
            (s) =>
                s.full_name.toLowerCase().includes(q) ||
                s.student_number.toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    async function handleSaveSession() {
        if (!sessionDate) {
            showToast('Please select a valid session date.', 'warning');
            setCurrentStep(1);
            return;
        }

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
                    const updates: AttendanceRecordUpdate[] = recordsRes.data.map((r: any) => {
                        const customDraft = studentDrafts[r.student_id || r.enrollment_id];
                        return {
                            id: r.id,
                            remarks: customDraft?.remarks || '',
                            status: customDraft?.status || defaultStatus
                        };
                    });

                    await saveAttendanceRecords(createdSession.id, updates);
                }
            }

            showToast('Attendance session recorded successfully.', 'success');
            setIsSaving(false);
            onSuccess(createdSession);
            onClose();
        } catch (err) {
            setIsSaving(false);
            showToast('An unexpected error occurred while saving the attendance session.', 'error');
        }
    }

    if (!open) return null;

    return (
        <CommonModal
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col h-[85vh] max-h-[760px] bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 rounded-2xl overflow-hidden">
                {/* Stepper Header */}
                <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                                <CalendarDotsIcon size={20} weight="duotone" />
                            </div>
                            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                                New Attendance Session
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <XIcon size={18} weight="bold" />
                        </button>
                    </div>

                    <ModalStepperHeader
                        currentStep={currentStep}
                        steps={ATTENDANCE_WIZARD_STEPS}
                        onStepClick={(step) => setCurrentStep(step)}
                    />
                </div>

                {/* Step Body */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                    {currentStep === 1 && (
                        <div className="flex flex-col gap-5 max-w-2xl mx-auto">
                            {/* Card: Session Date & Type */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                                    <CalendarCheckIcon size={18} className="text-blue-600" weight="duotone" />
                                    <span>Date & Session Classification</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Session Date <span className="text-rose-500">*</span>
                                        </label>
                                        <CommonDatePicker
                                            value={sessionDate}
                                            onChange={(val) => setSessionDate(val)}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Session Format
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['Lecture', 'Laboratory', 'Online', 'Activity'] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setSessionType(type)}
                                                    className={`py-1.5 px-2 text-xs rounded-xl font-semibold border transition-all cursor-pointer ${
                                                        sessionType === type
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                            : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Agenda / Topic / Session Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Chapter 4: Neural Architectures & Lab Practical Activity #2"
                                        className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Card: Default Student Mark */}
                            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
                                    <UsersIcon size={18} className="text-blue-600" weight="duotone" />
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
                                                key={status}
                                                type="button"
                                                onClick={() => handleDefaultStatusChange(status)}
                                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold'
                                                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700/60'
                                                }`}
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
                                        type="button"
                                        onClick={() => handleBulkSet('Present')}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                                    >
                                        All Present
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkSet('Absent')}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                                    >
                                        All Absent
                                    </button>
                                </div>
                            </div>

                            {/* Search Filter */}
                            <div className="relative">
                                <MagnifyingGlassIcon
                                    size={16}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Search student by name or ID number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                />
                            </div>

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
                                                key={s.enrollment_id}
                                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                                                            } else if (status === 'Late') {
                                                                colorClasses = 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold';
                                                            } else if (status === 'Absent') {
                                                                colorClasses = 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold';
                                                            } else {
                                                                colorClasses = 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold';
                                                            }
                                                        }

                                                        return (
                                                            <button
                                                                key={status}
                                                                type="button"
                                                                onClick={() => handleStudentStatusChange(s.enrollment_id, status)}
                                                                className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${colorClasses}`}
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
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </CommonButton>

                    <div className="flex items-center gap-2">
                        {currentStep > 1 && (
                            <CommonButton
                                size="small"
                                startIcon={<ArrowLeftIcon size={14} weight="bold" />}
                                variant="outlined"
                                onClick={() => setCurrentStep((prev) => prev - 1)}
                                disabled={isSaving}
                            >
                                Back
                            </CommonButton>
                        )}

                        {currentStep < ATTENDANCE_WIZARD_STEPS.length ? (
                            <CommonButton
                                size="small"
                                endIcon={<ArrowRightIcon size={14} weight="bold" />}
                                variant="contained"
                                onClick={() => setCurrentStep((prev) => prev + 1)}
                            >
                                Continue to Student List
                            </CommonButton>
                        ) : (
                            <CommonButton
                                size="small"
                                startIcon={<CheckCircleIcon size={16} weight="bold" />}
                                variant="contained"
                                onClick={handleSaveSession}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Recording Session...' : 'Create Session'}
                            </CommonButton>
                        )}
                    </div>
                </div>
            </div>
        </CommonModal>
    );
}
