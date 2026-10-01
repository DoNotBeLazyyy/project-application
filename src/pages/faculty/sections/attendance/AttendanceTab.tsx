import AttendanceRecordList from '@pages/faculty/sections/attendance/AttendanceRecordList';
import AttendanceSessionList from '@pages/faculty/sections/attendance/AttendanceSessionList';
import AttendanceSessionWizardModal from '@pages/faculty/sections/attendance/AttendanceSessionWizardModal';
import { CalendarDotsIcon } from '@phosphor-icons/react';
import {
    deleteAttendanceSession,
    getAttendanceRecords,
    listAttendanceSessions,
    saveAttendanceRecords
} from '@services/faculty.service';
import {
    AttendanceRecord,
    AttendanceRecordUpdate,
    AttendanceSession,
    AttendanceStatus
} from '@type/faculty.type';
import { useEffect, useState } from 'react';

interface AttendanceTabProps {
    sectionId: string;
}

export default function AttendanceTab({ sectionId }: AttendanceTabProps) {
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [draftRecords, setDraftRecords] = useState<AttendanceRecordUpdate[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [mobileView, setMobileView] = useState<'sessions' | 'records'>('sessions');

    useEffect(function() {
        fetchSessions();
    }, [sectionId]);

    async function fetchSessions() {
        const result = await listAttendanceSessions(sectionId);
        if (result.data) {
            setSessions(result.data);
            // Default select the latest session if available and none selected yet
            if (result.data.length > 0 && !selectedSession) {
                handleSelectSession(result.data[0]);
            }
        }
    }

    async function handleSelectSession(session: AttendanceSession) {
        setSelectedSession(session);
        setMobileView('records');
        const result = await getAttendanceRecords(session.id);

        if (result.data) {
            setRecords(result.data);
            setDraftRecords(
                result.data.map((r) => ({
                    id: r.id,
                    status: r.status,
                    remarks: r.remarks ?? ''
                }))
            );
            setIsDirty(false);
        }
    }

    async function handleSessionCreated(newSession?: AttendanceSession) {
        setIsCreateOpen(false);
        const result = await listAttendanceSessions(sectionId);
        if (result.data) {
            setSessions(result.data);
            if (newSession) {
                handleSelectSession(newSession);
            } else if (result.data.length > 0) {
                handleSelectSession(result.data[0]);
            }
        }
    }

    async function handleDeleteSession(sessionId: string) {
        const result = await deleteAttendanceSession(sessionId);
        if (!result.error) {
            if (selectedSession?.id === sessionId) {
                setSelectedSession(null);
                setRecords([]);
                setDraftRecords([]);
                setMobileView('sessions');
            }
            await fetchSessions();
        }
    }

    function handleStatusChange(recordId: string, status: AttendanceStatus) {
        setDraftRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, status } : r))
        );
        setIsDirty(true);
    }

    function handleMarkAllPresent() {
        setDraftRecords((prev) =>
            prev.map((r) => ({ ...r, status: 'Present' }))
        );
        setIsDirty(true);
    }

    async function handleSave() {
        if (!selectedSession) return;
        const result = await saveAttendanceRecords(selectedSession.id, draftRecords);
        if (!result.error) {
            setIsDirty(false);
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
            {/* Session List panel (Always visible on md+, toggled on mobile) */}
            <div className={`h-full min-h-0 ${mobileView === 'records' ? 'hidden md:flex' : 'flex flex-1'}`}>
                <AttendanceSessionList
                    selectedSessionId={selectedSession?.id}
                    sessions={sessions}
                    onCreateOpen={() => setIsCreateOpen(true)}
                    onDelete={handleDeleteSession}
                    onSelectSession={handleSelectSession}
                />
            </div>

            {/* Attendance Record List panel */}
            <div className={`flex-1 h-full min-h-0 ${mobileView === 'sessions' ? 'hidden md:flex' : 'flex'}`}>
                {selectedSession ? (
                    <AttendanceRecordList
                        draftRecords={draftRecords}
                        isDirty={isDirty}
                        records={records}
                        selectedSession={selectedSession}
                        onBackToSessions={() => setMobileView('sessions')}
                        onMarkAllPresent={handleMarkAllPresent}
                        onSave={handleSave}
                        onStatusChange={handleStatusChange}
                    />
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
                        <CalendarDotsIcon size={36} className="text-slate-400 mb-2" />
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            No Session Selected
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Choose an attendance session from the list or create a new session to record student attendance.
                        </p>
                    </div>
                )}
            </div>

            {/* Attendance Stepper Wizard Modal */}
            <AttendanceSessionWizardModal
                open={isCreateOpen}
                sectionId={sectionId}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={handleSessionCreated}
            />
        </div>
    );
}