import AttendanceRecordList from '@pages/faculty/sections/attendance/AttendanceRecordList';
import AttendanceSessionList from '@pages/faculty/sections/attendance/AttendanceSessionList';
import {
    createAttendanceSession,
    deleteAttendanceSession,
    getAttendanceRecords,
    listAttendanceSessions,
    saveAttendanceRecords
} from '@services/faculty.service';
import {
    AttendanceRecord,
    AttendanceRecordUpdate,
    AttendanceSession,
    AttendanceSessionFormValues,
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

    useEffect(function() {
        fetchSessions();
    }, [sectionId]);

    async function fetchSessions() {
        const result = await listAttendanceSessions(sectionId);

        if (result.data) {
            setSessions(result.data);
        }
    }

    async function handleSelectSession(session: AttendanceSession) {
        setSelectedSession(session);
        const result = await getAttendanceRecords(session.id);

        if (result.data) {
            setRecords(result.data);
            setDraftRecords(result.data.map((r) => ({
                id: r.id,
                status: r.status,
                remarks: r.remarks ?? ''
            })));
            setIsDirty(false);
        }
    }

    async function handleCreateSubmit(values: AttendanceSessionFormValues) {
        const result = await createAttendanceSession(sectionId, values);

        if (!result.error) {
            setIsCreateOpen(false);
            await fetchSessions();
        }
    }

    async function handleDeleteSession(sessionId: string) {
        const result = await deleteAttendanceSession(sessionId);

        if (!result.error) {
            if (selectedSession?.id === sessionId) {
                setSelectedSession(null);
                setRecords([]);
                setDraftRecords([]);
            }
            await fetchSessions();
        }
    }

    function handleStatusChange(recordId: string, status: AttendanceStatus) {
        setDraftRecords((prev) =>
            prev.map((r) => r.id === recordId
                ? { ...r, status }
                : r));
        setIsDirty(true);
    }

    function handleMarkAllPresent() {
        setDraftRecords((prev) =>
            prev.map((r) => ({ ...r, status: 'Present' })));
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
        <div className="flex gap-4 h-full">
            <AttendanceSessionList
                isCreateOpen={isCreateOpen}
                sessions={sessions}
                onCreateClose={function() {
                    setIsCreateOpen(false);
                }}
                onCreateOpen={function() {
                    setIsCreateOpen(true);
                }}
                onCreateSubmit={handleCreateSubmit}
                onDelete={handleDeleteSession}
                onSelectSession={handleSelectSession}
            />
            {selectedSession
                ? (
                    <AttendanceRecordList
                        draftRecords={draftRecords}
                        isDirty={isDirty}
                        records={records}
                        selectedSession={selectedSession}
                        onMarkAllPresent={handleMarkAllPresent}
                        onSave={handleSave}
                        onStatusChange={handleStatusChange}
                    />
                )
                : (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            Select a session to view and edit attendance
                        </p>
                    </div>
                )
            }
        </div>
    );
}